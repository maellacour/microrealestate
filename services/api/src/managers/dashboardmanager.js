import { Collections, Deposit } from '@bayle/common';
import moment from 'moment';

const round = (value) => Math.round(value * 100) / 100;

const termMomentOf = (rent) => {
  const termMoment = rent.term && moment(rent.term, 'YYYYMMDDHH');
  return termMoment && termMoment.isValid() ? termMoment : null;
};

// The last term reached carries the running balance of every term before it
// (5_balance rolls `grandTotal - payment` forward), so what a tenant still owes
// is held by that single term.
function outstandingBalance(tenant, upTo) {
  const lastTermReached = (tenant.rents || []).reduce((last, rent) => {
    const termMoment = termMomentOf(rent);
    if (!termMoment || termMoment.isAfter(upTo, 'day')) {
      return last;
    }
    return !last || termMoment.isAfter(last.termMoment)
      ? { termMoment, rent }
      : last;
  }, null);

  if (!lastTermReached) {
    return 0;
  }

  const { total } = lastTermReached.rent;
  return round(total.grandTotal - total.payment);
}

export async function all(req, res) {
  const now = moment();
  const beginOfTheMonth = moment(now).startOf('month');
  const endOfTheMonth = moment(now).endOf('month');
  const beginOfTheYear = moment(now).startOf('year');
  const endOfTheYear = moment(now).endOf('year');

  // count active tenants
  const allTenants = await Collections.Tenant.find({
    realmId: req.headers.organizationid
  });
  const activeTenants = allTenants.reduce((acc, tenant) => {
    const terminationMoment = tenant.terminationDate
      ? moment(tenant.terminationDate)
      : moment(tenant.endDate);

    if (terminationMoment.isSameOrAfter(now, 'day')) {
      acc.push(tenant);
    }

    return acc;
  }, []);
  const tenantCount = activeTenants.length;

  // count properties
  const propertyCount = await Collections.Property.find({
    realmId: req.headers.organizationid
  }).count();

  // count the properties rented by an active tenant
  const rentedPropertyCount = activeTenants.reduce(
    (acc, { properties = [] }) => {
      properties.forEach(({ propertyId }) => acc.add(propertyId));
      return acc;
    },
    new Set()
  ).size;

  // sum all rent payments of the current year
  let totalYearRevenues = 0;

  if (allTenants.length > 0) {
    totalYearRevenues = allTenants.reduce((total, { rents }) => {
      let sumPayments = 0;
      rents.forEach((rent) => {
        rent.payments.forEach((payment) => {
          if (!payment.date || payment.amount === 0) {
            return;
          }

          const paymentMoment = moment(payment.date, 'DD/MM/YYYY');
          if (
            paymentMoment.isBetween(beginOfTheYear, endOfTheYear, 'day', '[]')
          ) {
            sumPayments = sumPayments + payment.amount;
          }
        });
      });

      return total + sumPayments;
    }, 0);
  }

  // what the current month's terms charge, and what has been settled on them.
  // `grandTotal` carries the previous balance, so the month's own charge is
  // `grandTotal - balance`; settlements are counted as recorded, which is why
  // a month catching up on arrears can collect more than it charges.
  const currentMonth = allTenants.reduce(
    (acc, { rents = [] }) => {
      rents.forEach((rent) => {
        const termMoment = termMomentOf(rent);
        if (
          !termMoment ||
          !termMoment.isBetween(beginOfTheMonth, endOfTheMonth, 'day', '[]')
        ) {
          return;
        }
        acc.charged += rent.total.grandTotal - rent.total.balance;
        acc.collected += rent.total.payment;
      });
      return acc;
    },
    { charged: 0, collected: 0 }
  );
  currentMonth.charged = round(currentMonth.charged);
  currentMonth.collected = round(currentMonth.collected);

  // rent still owed, over every term reached so far — a tenant who left owing
  // money still owes it, so this covers ended leases too
  const arrears = allTenants.reduce(
    (acc, tenant) => {
      const owed = outstandingBalance(tenant, endOfTheMonth);
      if (owed > 0) {
        acc.total = round(acc.total + owed);
        acc.tenantCount += 1;
      }
      return acc;
    },
    { total: 0, tenantCount: 0 }
  );

  // security deposits of the running leases still in the landlord's hands
  const depositsHeld = round(
    activeTenants.reduce(
      (total, tenant) =>
        total +
        Deposit.depositInfo({
          guaranty: tenant.guaranty,
          guarantyPayback: tenant.guarantyPayback,
          guarantyPaybackDate: tenant.guarantyPaybackDate,
          retained: Deposit.retainedAmount(tenant.rents),
          leaseEnd: tenant.terminationDate || tenant.endDate
        }).remaining,
      0
    )
  );

  // build overview bucket
  const overview =
    tenantCount || propertyCount
      ? {
          tenantCount,
          propertyCount,
          rentedPropertyCount,
          totalYearRevenues,
          currentMonth,
          arrears,
          depositsHeld
        }
      : null;

  // compute top 5 tenants who have not paid their rents
  const topUnpaid =
    tenantCount || propertyCount
      ? activeTenants
          .reduce((acc, tenant) => {
            const currentRent = tenant.rents.find((rent) => {
              const termMoment = termMomentOf(rent);
              return (
                termMoment &&
                termMoment.isBetween(
                  beginOfTheMonth,
                  endOfTheMonth,
                  'day',
                  '[]'
                )
              );
            });
            if (currentRent) {
              acc.push({
                tenant: tenant.toObject(),
                balance:
                  currentRent.total.payment - currentRent.total.grandTotal,
                rent: currentRent
              });
            }
            return acc;
          }, [])
          .sort((t1, t2) => t1.balance - t2.balance)
          .filter((t) => t.balance < 0)
          .slice(0, 5) // Top 5
      : [];

  // compute rents of year splitted by month
  const emptyRevenues = moment.months().reduce((acc, month, index) => {
    const key = moment(`${index + 1}/${now.year()}`, 'MM/YYYYY').format(
      'MMYYYY'
    );
    acc[key] = {
      month: key,
      paid: 0,
      notPaid: 0
    };
    return acc;
  }, {});
  const revenues = Object.entries(
    allTenants.reduce((acc, { rents }) => {
      rents.forEach((rent) => {
        const termMoment = moment(rent.term, 'YYYYMMDDHH');
        if (!termMoment.isBetween(beginOfTheYear, endOfTheYear, 'day', '[]')) {
          return;
        }
        const key = termMoment.format('MMYYYY');
        const thisMonthAmount = rent.total.grandTotal - rent.total.balance;
        const revenue = {
          month: key,
          paid: rent.total.payment,
          notPaid:
            rent.total.payment - thisMonthAmount < 0
              ? rent.total.payment - thisMonthAmount
              : 0
        };
        if (acc[key]) {
          acc[key].paid += revenue.paid;
          acc[key].notPaid += revenue.notPaid;
        } else {
          acc[key] = revenue;
        }
      });
      return acc;
    }, emptyRevenues)
  )
    .map(([, value]) => ({
      ...value,
      paid: value.paid > 0 ? Math.round(value.paid * 100) / 100 : value.paid,
      notPaid:
        value.notPaid < 0
          ? Math.round(value.notPaid * 100) / 100
          : value.notPaid
    }))
    .sort((r1, r2) =>
      moment(r1.month, 'MMYYYY').isBefore(moment(r2.month, 'MMYYYY')) ? -1 : 1
    );

  res.json({
    overview,
    topUnpaid,
    revenues
  });
}
