import { Charges, Collections, ServiceError } from '@bayle/common';

// Only these fields are ever settable from the request body - protects
// realmId/createdDate from being spoofed by a client.
const EDITABLE_FIELDS = ['propertyId', 'name', 'members'];

function pickEditableFields(body) {
  return EDITABLE_FIELDS.reduce((fields, key) => {
    if (body[key] !== undefined) {
      fields[key] = body[key];
    }
    return fields;
  }, {});
}

// Default the quote-parts to equal shares when none are provided (a member with
// no sharePercent set). Members that already carry a share are left untouched.
function withDefaultShares(members = []) {
  if (!members.length) {
    return [];
  }
  const missing = members.some(
    (member) =>
      member.sharePercent === undefined || member.sharePercent === null
  );
  if (!missing) {
    return members;
  }
  const shares = Charges.equalShares(members.length);
  return members.map((member, index) => ({
    tenantId: member.tenantId,
    sharePercent:
      member.sharePercent === undefined || member.sharePercent === null
        ? shares[index]
        : member.sharePercent
  }));
}

const rentAmountOf = (tenant) =>
  Math.round(
    ((tenant?.properties || []).reduce(
      (sum, { rent }) => sum + (rent || 0),
      0
    ) || 0) * 100
  ) / 100;

// Attach each member's tenant summary, the dwelling, and a share-completeness
// flag so the landlord UI can render the aggregated colocation view.
async function enrich(colocation, realmId) {
  const tenantIds = (colocation.members || []).map((m) => m.tenantId);
  const [tenants, property] = await Promise.all([
    Collections.Tenant.find({ _id: { $in: tenantIds }, realmId }).lean(),
    colocation.propertyId
      ? Collections.Property.findOne({
          _id: colocation.propertyId,
          realmId
        }).lean()
      : null
  ]);
  const tenantById = tenants.reduce((acc, tenant) => {
    acc[tenant._id] = tenant;
    return acc;
  }, {});

  const members = (colocation.members || []).map((member) => {
    const tenant = tenantById[member.tenantId];
    return {
      tenantId: member.tenantId,
      sharePercent: member.sharePercent,
      tenant: tenant
        ? {
            _id: tenant._id,
            name: tenant.name,
            rentAmount: rentAmountOf(tenant)
          }
        : null
    };
  });

  return {
    ...colocation,
    members,
    property: property ? { _id: property._id, name: property.name } : null,
    sharesComplete: Charges.sharesAreComplete(
      members.map((m) => m.sharePercent)
    ),
    totalRentAmount:
      Math.round(
        members.reduce((sum, m) => sum + (m.tenant?.rentAmount || 0), 0) * 100
      ) / 100
  };
}

////////////////////////////////////////////////////////////////////////////////
// Exported functions
////////////////////////////////////////////////////////////////////////////////
export async function add(req, res) {
  const realm = req.realm;
  const fields = pickEditableFields(req.body);
  fields.members = withDefaultShares(fields.members);
  const colocation = new Collections.Colocation({
    ...fields,
    realmId: realm._id
  });
  await colocation.save();
  return res.json(await enrich(colocation.toObject(), realm._id));
}

export async function update(req, res) {
  const realm = req.realm;
  const fields = pickEditableFields(req.body);
  if (fields.members !== undefined) {
    fields.members = withDefaultShares(fields.members);
  }

  const dbColocation = await Collections.Colocation.findOneAndUpdate(
    { realmId: realm._id, _id: req.body._id },
    { ...fields, updatedDate: new Date() },
    { new: true }
  ).lean();

  if (!dbColocation) {
    return res.sendStatus(404);
  }

  return res.json(await enrich(dbColocation, realm._id));
}

export async function remove(req, res) {
  const realm = req.realm;
  const ids = req.params.ids.split(',');

  await Collections.Colocation.deleteMany({
    _id: { $in: ids },
    realmId: realm._id
  });

  res.sendStatus(200);
}

export async function all(req, res) {
  const realm = req.realm;
  const filter = { realmId: realm._id };
  if (req.query.propertyId) {
    filter.propertyId = req.query.propertyId;
  }

  const dbColocations = await Collections.Colocation.find(filter)
    .sort({ createdDate: -1 })
    .lean();

  const enriched = [];
  for (const colocation of dbColocations) {
    enriched.push(await enrich(colocation, realm._id));
  }

  return res.json(enriched);
}

export async function one(req, res) {
  const realm = req.realm;

  const dbColocation = await Collections.Colocation.findOne({
    _id: req.params.id,
    realmId: realm._id
  }).lean();

  if (!dbColocation) {
    return res.sendStatus(404);
  }

  return res.json(await enrich(dbColocation, realm._id));
}

// Split the common charges by quote-part and create one charge regularization
// per colocation member for the period. Each member's regularization then
// behaves like any other (apply to a term, share, PDF).
export async function regularize(req, res) {
  const realm = req.realm;
  const { periodStart, periodEnd, lines } = req.body;
  if (!periodStart || !periodEnd) {
    throw new ServiceError('the period is required', 400);
  }

  const colocation = await Collections.Colocation.findOne({
    _id: req.params.id,
    realmId: realm._id
  }).lean();
  if (!colocation) {
    return res.sendStatus(404);
  }

  const split = Charges.splitCommonCharges(lines, colocation.members);
  const created = [];
  for (const member of colocation.members) {
    const regularization = new Collections.ChargeRegularization({
      realmId: realm._id,
      tenantId: member.tenantId,
      periodStart,
      periodEnd,
      lines: split[member.tenantId] || [],
      note: ''
    });
    await regularization.save();
    created.push(regularization.toObject());
  }

  return res.json(created);
}
