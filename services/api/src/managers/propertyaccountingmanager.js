import { Collections } from '@microrealestate/common';
import i18n from 'i18n';
import moment from 'moment';
import { Parser } from 'json2csv';

// Kept in sync with the enum of Collections.Expense (common/collections/expense.ts).
const EXPENSE_CATEGORIES = [
  'works',
  'insurance',
  'property_tax',
  'condo_charges',
  'management_fees',
  'loan_interest',
  'other'
];

function _round2(amount) {
  return Math.round((amount || 0) * 100) / 100;
}

function _emptyResult(property) {
  return {
    _id: String(property._id),
    name: property.name,
    type: property.type,
    revenue: {
      collected: 0,
      depositRetention: 0,
      byMonth: new Array(12).fill(0)
    },
    charged: 0,
    stillDue: 0,
    expenses: {
      total: 0,
      byCategory: EXPENSE_CATEGORIES.reduce((acc, category) => {
        acc[category] = 0;
        return acc;
      }, {})
    },
    netResult: 0,
    occupancy: { days: 0, rate: 0 },
    allocationApproximate: false,
    occupancyOverlap: false
  };
}

// Share of a tenant's amounts attributable to each of its properties, based on
// the rent configured for each one. Rent lines only carry the property name
// (businesslogic/tasks/1_base.js), so this is the attribution key. Exact when
// the tenant rents a single property, approximate otherwise.
function _propertyWeights(tenant) {
  const properties = tenant.properties || [];
  if (!properties.length) {
    return {};
  }

  const totalRent = properties.reduce((sum, { rent }) => sum + (rent || 0), 0);

  return properties.reduce((acc, { propertyId, rent }) => {
    acc[String(propertyId)] =
      totalRent > 0 ? (rent || 0) / totalRent : 1 / properties.length;
    return acc;
  }, {});
}

// Whole days of the year during which the property was rented by this tenant.
// The occupancy window is the property entry/exit dates, brought forward to an
// early termination date, then clipped to the year.
function _occupancyDays(tenant, rentedProperty, yearStart, yearEnd) {
  const entryDate = rentedProperty.entryDate || tenant.beginDate;
  const exitDate = rentedProperty.exitDate || tenant.endDate;
  if (!entryDate || !exitDate) {
    return 0;
  }

  let exitMoment = moment(exitDate).endOf('day');
  if (tenant.terminationDate) {
    exitMoment = moment.min(
      exitMoment,
      moment(tenant.terminationDate).endOf('day')
    );
  }

  const start = moment.max(moment(entryDate).startOf('day'), yearStart).clone();
  const end = moment.min(exitMoment, yearEnd).clone();
  if (end.isBefore(start)) {
    return 0;
  }

  return end.diff(start, 'days') + 1;
}

async function _computeResults(realmId, year, propertyId) {
  const yearStart = moment({ year, month: 0, day: 1 }).startOf('day');
  const yearEnd = moment(yearStart).endOf('year');
  const daysInYear = yearEnd.diff(yearStart, 'days') + 1;

  const propertyFilter = { realmId };
  if (propertyId) {
    propertyFilter._id = propertyId;
  }

  const [dbProperties, dbTenants, dbExpenses] = await Promise.all([
    Collections.Property.find(propertyFilter).sort({ name: 1 }).lean(),
    Collections.Tenant.find(
      { realmId },
      {
        name: 1,
        beginDate: 1,
        endDate: 1,
        terminationDate: 1,
        'properties.propertyId': 1,
        'properties.rent': 1,
        'properties.entryDate': 1,
        'properties.exitDate': 1,
        rents: 1
      }
    ).lean(),
    Collections.Expense.find({
      realmId,
      date: {
        $gte: yearStart.toDate(),
        $lt: moment(yearStart).add(1, 'year').toDate()
      }
    }).lean()
  ]);

  // A vacant property still has expenses, so every property gets a row.
  const results = dbProperties.reduce((acc, property) => {
    acc[String(property._id)] = _emptyResult(property);
    return acc;
  }, {});

  dbTenants.forEach((tenant) => {
    const weights = _propertyWeights(tenant);
    const isMultiProperty = (tenant.properties || []).length > 1;

    // Revenue, cash basis: a payment counts for the year it was received in,
    // not for the year of the term it settles.
    (tenant.rents || []).forEach((rent) => {
      (rent.payments || []).forEach((payment) => {
        if (!payment.amount || !payment.date) {
          return;
        }
        const paymentMoment = moment(payment.date, 'DD/MM/YYYY');
        if (
          !paymentMoment.isValid() ||
          !paymentMoment.isBetween(yearStart, yearEnd, 'day', '[]')
        ) {
          return;
        }

        Object.entries(weights).forEach(([id, weight]) => {
          const result = results[id];
          if (!result) {
            return;
          }
          const share = payment.amount * weight;
          result.revenue.collected += share;
          result.revenue.byMonth[paymentMoment.month()] += share;
          if (payment.type === 'deposit') {
            result.revenue.depositRetention += share;
          }
          if (isMultiProperty) {
            result.allocationApproximate = true;
          }
        });
      });

      // Accrual memo: what the year's terms charged, and what is still owed on
      // them. `balance` is the amount carried over from the previous term, so
      // removing it leaves the charge raised by this term alone.
      if (rent.year !== year || !rent.total) {
        return;
      }
      const chargedForTerm =
        (rent.total.grandTotal || 0) - (rent.total.balance || 0);
      const paidOnTerm = rent.total.payment || 0;

      Object.entries(weights).forEach(([id, weight]) => {
        const result = results[id];
        if (!result) {
          return;
        }
        result.charged += chargedForTerm * weight;
        result.stillDue += (chargedForTerm - paidOnTerm) * weight;
        if (isMultiProperty) {
          result.allocationApproximate = true;
        }
      });
    });

    (tenant.properties || []).forEach((rentedProperty) => {
      const result = results[String(rentedProperty.propertyId)];
      if (!result) {
        return;
      }
      result.occupancy.days += _occupancyDays(
        tenant,
        rentedProperty,
        yearStart,
        yearEnd
      );
    });
  });

  dbExpenses.forEach((expense) => {
    const result = results[String(expense.propertyId)];
    if (!result) {
      return;
    }
    const category = EXPENSE_CATEGORIES.includes(expense.category)
      ? expense.category
      : 'other';
    result.expenses.byCategory[category] += expense.amount || 0;
    result.expenses.total += expense.amount || 0;
  });

  const properties = dbProperties.map((property) => {
    const result = results[String(property._id)];

    // Two tenants can overlap on the same property (an early termination
    // followed by a new lease starting the same day). Cap the rate rather than
    // reporting more than 100%, and say so.
    if (result.occupancy.days > daysInYear) {
      result.occupancy.days = daysInYear;
      result.occupancyOverlap = true;
    }

    result.revenue.collected = _round2(result.revenue.collected);
    result.revenue.depositRetention = _round2(result.revenue.depositRetention);
    result.revenue.byMonth = result.revenue.byMonth.map(_round2);
    result.charged = _round2(result.charged);
    result.stillDue = _round2(result.stillDue);
    result.expenses.total = _round2(result.expenses.total);
    EXPENSE_CATEGORIES.forEach((category) => {
      result.expenses.byCategory[category] = _round2(
        result.expenses.byCategory[category]
      );
    });
    result.netResult = _round2(
      result.revenue.collected - result.expenses.total
    );
    result.occupancy.rate = result.occupancy.days / daysInYear;

    return result;
  });

  const totals = properties.reduce(
    (acc, property) => {
      acc.collected += property.revenue.collected;
      acc.charged += property.charged;
      acc.stillDue += property.stillDue;
      acc.expenses += property.expenses.total;
      acc.netResult += property.netResult;
      acc.occupancyDays += property.occupancy.days;
      return acc;
    },
    {
      collected: 0,
      charged: 0,
      stillDue: 0,
      expenses: 0,
      netResult: 0,
      occupancyDays: 0
    }
  );

  return {
    year,
    properties,
    totals: {
      collected: _round2(totals.collected),
      charged: _round2(totals.charged),
      stillDue: _round2(totals.stillDue),
      expenses: _round2(totals.expenses),
      netResult: _round2(totals.netResult),
      occupancyRate: properties.length
        ? totals.occupancyDays / (daysInYear * properties.length)
        : 0
    }
  };
}

////////////////////////////////////////////////////////////////////////////////
// Exported functions
////////////////////////////////////////////////////////////////////////////////
export async function all(req, res) {
  const realm = req.realm;
  const year = req.params?.year ? Number(req.params.year) : moment().year();

  res.json(
    await _computeResults(String(realm._id), year, req.query?.propertyId)
  );
}

async function resultsAsCsv(req, res) {
  const realm = req.realm;
  const year = req.params?.year ? Number(req.params.year) : moment().year();
  i18n.setLocale(realm.locale);

  const { properties } = await _computeResults(String(realm._id), year);

  const NumberFormat = Intl.NumberFormat(realm.locale, {
    style: 'currency',
    currency: realm.currency,
    minimumFractionDigits: 2
  });
  const PercentFormat = Intl.NumberFormat(realm.locale, {
    style: 'percent',
    maximumFractionDigits: 1
  });

  const data = properties.map((property) => ({
    name: property.name,
    collected: NumberFormat.format(property.revenue.collected),
    charged: NumberFormat.format(property.charged),
    stillDue: NumberFormat.format(property.stillDue),
    expenses: NumberFormat.format(property.expenses.total),
    ...EXPENSE_CATEGORIES.reduce((acc, category) => {
      acc[category] = NumberFormat.format(
        property.expenses.byCategory[category]
      );
      return acc;
    }, {}),
    netResult: NumberFormat.format(property.netResult),
    occupancyDays: property.occupancy.days,
    occupancyRate: PercentFormat.format(property.occupancy.rate)
  }));

  const fields = [
    { label: i18n.__('Property'), value: 'name' },
    { label: i18n.__('Collected revenue'), value: 'collected' },
    { label: i18n.__('Charged rent'), value: 'charged' },
    { label: i18n.__('Still due'), value: 'stillDue' },
    { label: i18n.__('Total expenses'), value: 'expenses' },
    ...EXPENSE_CATEGORIES.map((category) => ({
      label: i18n.__(category),
      value: category
    })),
    { label: i18n.__('Net result'), value: 'netResult' },
    { label: i18n.__('Days rented'), value: 'occupancyDays' },
    { label: i18n.__('Occupancy rate'), value: 'occupancyRate' }
  ];

  const json2csv = new Parser({ fields, delimiter: ';', withBOM: true });
  const csv = json2csv.parse(data);
  res.header('Content-Type', 'text/csv');
  return res.send(csv);
}

export const csv = {
  results: resultsAsCsv
};
