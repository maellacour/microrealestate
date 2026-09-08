import { Collections } from '@microrealestate/common';
import moment from 'moment';

// Only these fields are ever settable from the request body - protects
// realmId/createdDate from being spoofed by a client.
const EDITABLE_FIELDS = [
  'tenantId',
  'periodStart',
  'periodEnd',
  'lines',
  'note'
];

function pickEditableFields(body) {
  return EDITABLE_FIELDS.reduce((fields, key) => {
    if (body[key] !== undefined) {
      fields[key] = body[key];
    }
    return fields;
  }, {});
}

const round = (value) => Math.round((value || 0) * 100) / 100;

// Provisions "appelées" (called, not paid) over the period: sum of each rent
// term's charges when the term falls within [periodStart, periodEnd]. A rent
// term is a YYYYMMDDHH number.
function provisionsCalledInPeriod(tenant, periodStart, periodEnd) {
  if (!periodStart || !periodEnd) {
    return 0;
  }
  const start = moment(periodStart).startOf('day');
  const end = moment(periodEnd).endOf('day');
  return round(
    (tenant?.rents || []).reduce((sum, rent) => {
      const termMoment = moment(String(rent.term), 'YYYYMMDDHH');
      if (termMoment.isBetween(start, end, undefined, '[]')) {
        return sum + ((rent.total && rent.total.charges) || 0);
      }
      return sum;
    }, 0)
  );
}

// Attach the computed provisions/recoverable/balance to a stored
// regularization. balance > 0 means a credit to the tenant (they over-paid),
// balance < 0 means the tenant owes a complement.
function enrich(regularization, tenant) {
  const provisionsCalled = provisionsCalledInPeriod(
    tenant,
    regularization.periodStart,
    regularization.periodEnd
  );
  const recoverableTotal = round(
    (regularization.lines || [])
      .filter((line) => line.recoverable)
      .reduce((sum, line) => sum + (line.amount || 0), 0)
  );
  return {
    ...regularization,
    computed: {
      provisionsCalled,
      recoverableTotal,
      balance: round(provisionsCalled - recoverableTotal)
    }
  };
}

async function loadTenant(realmId, tenantId) {
  return Collections.Tenant.findOne({ _id: tenantId, realmId }).lean();
}

////////////////////////////////////////////////////////////////////////////////
// Exported functions
////////////////////////////////////////////////////////////////////////////////
export async function add(req, res) {
  const realm = req.realm;
  const regularization = new Collections.ChargeRegularization({
    ...pickEditableFields(req.body),
    realmId: realm._id
  });
  await regularization.save();
  const tenant = await loadTenant(realm._id, regularization.tenantId);
  return res.json(enrich(regularization.toObject(), tenant));
}

export async function update(req, res) {
  const realm = req.realm;

  const dbRegularization =
    await Collections.ChargeRegularization.findOneAndUpdate(
      {
        realmId: realm._id,
        _id: req.body._id
      },
      { ...pickEditableFields(req.body), updatedDate: new Date() },
      { new: true }
    ).lean();

  if (!dbRegularization) {
    return res.sendStatus(404);
  }

  const tenant = await loadTenant(realm._id, dbRegularization.tenantId);
  return res.json(enrich(dbRegularization, tenant));
}

export async function remove(req, res) {
  const realm = req.realm;
  const ids = req.params.ids.split(',');

  await Collections.ChargeRegularization.deleteMany({
    _id: { $in: ids },
    realmId: realm._id
  });

  res.sendStatus(200);
}

export async function all(req, res) {
  const realm = req.realm;
  const filter = { realmId: realm._id };
  if (req.query.tenantId) {
    filter.tenantId = req.query.tenantId;
  }

  const dbRegularizations = await Collections.ChargeRegularization.find(filter)
    .sort({ periodEnd: -1 })
    .lean();

  // Cache tenants so a list scoped to one tenant loads it once.
  const tenants = {};
  const enriched = [];
  for (const regularization of dbRegularizations) {
    if (!tenants[regularization.tenantId]) {
      tenants[regularization.tenantId] = await loadTenant(
        realm._id,
        regularization.tenantId
      );
    }
    enriched.push(enrich(regularization, tenants[regularization.tenantId]));
  }

  return res.json(enriched);
}

export async function one(req, res) {
  const realm = req.realm;

  const dbRegularization = await Collections.ChargeRegularization.findOne({
    _id: req.params.id,
    realmId: realm._id
  }).lean();

  if (!dbRegularization) {
    return res.sendStatus(404);
  }

  const tenant = await loadTenant(realm._id, dbRegularization.tenantId);
  return res.json(enrich(dbRegularization, tenant));
}
