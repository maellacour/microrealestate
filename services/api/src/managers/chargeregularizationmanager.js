import * as Contract from './contract.js';
import { Collections, ServiceError } from '@microrealestate/common';
import {
  computeRegularization,
  regularizationAdjustment
} from '../businesslogic/chargeregularization.js';
import i18n from 'i18n';
import moment from 'moment';

// Only these fields are ever settable from the request body - protects
// realmId/createdDate from being spoofed by a client.
const EDITABLE_FIELDS = [
  'tenantId',
  'periodStart',
  'periodEnd',
  'lines',
  'note',
  'shared'
];

function pickEditableFields(body) {
  return EDITABLE_FIELDS.reduce((fields, key) => {
    if (body[key] !== undefined) {
      fields[key] = body[key];
    }
    return fields;
  }, {});
}

// Attach the computed provisions/recoverable/balance to a stored
// regularization.
function enrich(regularization, tenant) {
  return {
    ...regularization,
    computed: computeRegularization(
      tenant?.rents,
      regularization.lines,
      regularization.periodStart,
      regularization.periodEnd
    )
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

function buildContract(occupant) {
  return {
    frequency: occupant.frequency || 'months',
    begin: occupant.beginDate,
    end: occupant.endDate,
    termination: occupant.terminationDate,
    discount: occupant.discount || 0,
    vatRate: occupant.vatRatio,
    properties: occupant.properties,
    rents: occupant.rents
  };
}

// Rebuild a term's current settlements from the stored rent so payTerm keeps
// its existing payments/debts/discounts when we add ours. Only settlement
// discounts are passed back; contract discounts are re-added by the pipeline.
function termSettlements(rent) {
  return {
    payments: rent.payments || [],
    debts: [...(rent.debts || [])],
    discounts: (rent.discounts || []).filter((d) => d.origin === 'settlement'),
    description: rent.description || ''
  };
}

// Label stored on the posted debt/discount, translated in the realm's locale
// (it shows up as-is on the rent documents).
function regularizationDescription(regularization, locale) {
  // Translate only the label and append the dates in JS: routing the dates
  // through i18n's mustache would HTML-escape the slashes (01&#x2F;01/…).
  const label = i18n.__({ phrase: 'Charge regularization', locale });
  const start = moment(regularization.periodStart).format('DD/MM/YYYY');
  const end = moment(regularization.periodEnd).format('DD/MM/YYYY');
  return `${label} ${start} - ${end}`;
}

// Post the regularization balance onto a rent term as a debt (complement due)
// or a settlement discount (credit), then recompute the schedule.
export async function apply(req, res) {
  const realm = req.realm;
  const term = Number(req.body.term);

  const regularization = await Collections.ChargeRegularization.findOne({
    _id: req.params.id,
    realmId: realm._id
  }).lean();
  if (!regularization) {
    return res.sendStatus(404);
  }
  if (regularization.appliedToTerm) {
    throw new ServiceError(
      'this regularization is already applied to a term',
      409
    );
  }

  const occupant = await loadTenant(realm._id, regularization.tenantId);
  if (!occupant) {
    return res.sendStatus(404);
  }
  const rent = (occupant.rents || []).find((r) => r.term === term);
  if (!rent) {
    throw new ServiceError('the target term does not exist', 400);
  }

  const { balance } = computeRegularization(
    occupant.rents,
    regularization.lines,
    regularization.periodStart,
    regularization.periodEnd
  );
  const adjustment = regularizationAdjustment(balance, occupant.vatRatio);
  if (!adjustment) {
    throw new ServiceError('nothing to post: the balance is zero', 400);
  }

  const description = regularizationDescription(regularization, realm.locale);
  const settlements = termSettlements(rent);
  if (adjustment.type === 'debt') {
    settlements.debts.push({ description, amount: adjustment.amount });
  } else {
    settlements.discounts.push({
      origin: 'settlement',
      description,
      amount: adjustment.amount
    });
  }

  const rents = Contract.payTerm(
    buildContract(occupant),
    term,
    settlements
  ).rents;
  await Collections.Tenant.updateOne(
    { _id: occupant._id, realmId: realm._id },
    { $set: { rents } }
  );

  const updated = await Collections.ChargeRegularization.findOneAndUpdate(
    { _id: regularization._id, realmId: realm._id },
    {
      $set: {
        appliedToTerm: term,
        appliedType: adjustment.type,
        appliedAmount: adjustment.amount,
        appliedDescription: description,
        updatedDate: new Date()
      }
    },
    { new: true }
  ).lean();

  const freshTenant = await loadTenant(realm._id, regularization.tenantId);
  return res.json(enrich(updated, freshTenant));
}

// Remove the previously posted adjustment from its term and recompute.
export async function unapply(req, res) {
  const realm = req.realm;

  const regularization = await Collections.ChargeRegularization.findOne({
    _id: req.params.id,
    realmId: realm._id
  }).lean();
  if (!regularization) {
    return res.sendStatus(404);
  }
  if (!regularization.appliedToTerm) {
    throw new ServiceError('this regularization is not applied', 400);
  }

  const occupant = await loadTenant(realm._id, regularization.tenantId);
  if (!occupant) {
    return res.sendStatus(404);
  }
  const rent = (occupant.rents || []).find(
    (r) => r.term === regularization.appliedToTerm
  );
  if (rent) {
    const settlements = termSettlements(rent);
    const bucket =
      regularization.appliedType === 'debt' ? 'debts' : 'discounts';
    let removed = false;
    settlements[bucket] = settlements[bucket].filter((line) => {
      if (
        !removed &&
        line.description === regularization.appliedDescription &&
        Math.abs((line.amount || 0) - regularization.appliedAmount) < 0.005
      ) {
        removed = true;
        return false;
      }
      return true;
    });
    const rents = Contract.payTerm(
      buildContract(occupant),
      regularization.appliedToTerm,
      settlements
    ).rents;
    await Collections.Tenant.updateOne(
      { _id: occupant._id, realmId: realm._id },
      { $set: { rents } }
    );
  }

  const updated = await Collections.ChargeRegularization.findOneAndUpdate(
    { _id: regularization._id, realmId: realm._id },
    {
      $set: { updatedDate: new Date() },
      $unset: {
        appliedToTerm: '',
        appliedType: '',
        appliedAmount: '',
        appliedDescription: ''
      }
    },
    { new: true }
  ).lean();

  const freshTenant = await loadTenant(realm._id, regularization.tenantId);
  return res.json(enrich(updated, freshTenant));
}
