/* eslint-env node, mocha */
import { jest } from '@jest/globals';

const REALM_ID = 'realm-1';
const PROPERTY_ID = 'prop-1';
const LEASE_ID = 'lease-1';
const TENANT_ID = '507f1f77bcf86cd799439011';

let dbLease;
let createdTenant;
let updatedTenant;
let originalTenant;
let leaseFindOneCalls;

const lean = (data) => ({ lean: () => Promise.resolve(data) });

const Collections = {
  ObjectId: (id) => id,
  Property: {
    find: () =>
      lean([{ _id: PROPERTY_ID, name: 'Studio', type: 'apartment', price: 50 }])
  },
  Lease: {
    findOne: (filter) => {
      leaseFindOneCalls.push(filter);
      return lean(dbLease);
    }
  },
  Tenant: {
    create: (doc) => {
      createdTenant = doc;
      return Promise.resolve({ _id: TENANT_ID });
    },
    findOne: () => lean(originalTenant),
    updateOne: (filter, doc) => {
      updatedTenant = doc;
      return Promise.resolve({ modifiedCount: 1 });
    },
    aggregate: () => Promise.resolve([{ _id: TENANT_ID }]),
    populate: () => Promise.resolve()
  }
};

jest.unstable_mockModule('@bayle/common', () => ({
  Collections,
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  Service: {
    getInstance: () => ({
      envConfig: { getValues: () => ({ PDFGENERATOR_URL: 'http://pdf.test' }) }
    })
  },
  ServiceError: class ServiceError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  }
}));

jest.unstable_mockModule('axios', () => ({
  default: { get: jest.fn(), delete: jest.fn() }
}));

// Keep the assertions on what reaches the database, not on the view model.
jest.unstable_mockModule('../../managers/frontdata.js', () => ({
  toOccupantData: (occupant) => occupant
}));

const OccupantManager = await import('../../managers/occupantmanager.js');
const Contract = await import('../../managers/contract.js');

// A 10-day stay: 10 daily terms, or a single term if it is wrongly read as
// monthly - which makes the difference impossible to miss in an assertion.
const BEGIN = '01/01/2026';
const END = '10/01/2026';

function tenantBody(extra = {}) {
  return {
    name: 'Short stay',
    leaseId: LEASE_ID,
    beginDate: BEGIN,
    endDate: END,
    properties: [
      {
        propertyId: PROPERTY_ID,
        rent: 50,
        entryDate: BEGIN,
        exitDate: END
      }
    ],
    ...extra
  };
}

function dailyOriginalTenant(frequency) {
  // entry/exit dates are Date instances here, as they are once stored
  const contract = Contract.create({
    begin: BEGIN,
    end: END,
    frequency: 'days',
    properties: [
      {
        propertyId: PROPERTY_ID,
        rent: 50,
        entryDate: new Date(2026, 0, 1),
        exitDate: new Date(2026, 0, 10),
        property: { _id: PROPERTY_ID, name: 'Studio' }
      }
    ]
  });

  return {
    _id: TENANT_ID,
    realmId: REALM_ID,
    name: 'Short stay',
    leaseId: LEASE_ID,
    frequency,
    beginDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 10),
    discount: 0,
    vatRatio: 0,
    rents: contract.rents,
    properties: [
      {
        propertyId: PROPERTY_ID,
        rent: 50,
        entryDate: new Date(2026, 0, 1),
        exitDate: new Date(2026, 0, 10),
        property: { _id: PROPERTY_ID, name: 'Studio' }
      }
    ]
  };
}

const call = async (handler, body) => {
  const res = { json: jest.fn() };
  await handler(
    { realm: { _id: REALM_ID }, params: { id: TENANT_ID }, body },
    res
  );
  return res;
};

describe('occupantmanager - rent term frequency', () => {
  beforeEach(() => {
    dbLease = { _id: LEASE_ID, timeRange: 'weeks' };
    createdTenant = undefined;
    updatedTenant = undefined;
    originalTenant = undefined;
    leaseFindOneCalls = [];
  });

  it('persists the frequency sent with a new tenant and builds daily terms', async () => {
    await call(OccupantManager.add, tenantBody({ frequency: 'days' }));

    expect(createdTenant.frequency).toBe('days');
    expect(createdTenant.rents).toHaveLength(10);
    // the lease is not consulted when the caller already provided the value
    expect(leaseFindOneCalls).toHaveLength(0);
  });

  it('falls back to the lease timeRange when the caller omits the frequency', async () => {
    await call(OccupantManager.add, tenantBody());

    expect(createdTenant.frequency).toBe('weeks');
    expect(leaseFindOneCalls[0]).toEqual({ _id: LEASE_ID, realmId: REALM_ID });
  });

  it('falls back to months when neither the caller nor a lease says otherwise', async () => {
    dbLease = null;
    await call(OccupantManager.add, tenantBody({ leaseId: undefined }));

    expect(createdTenant.frequency).toBe('months');
    expect(createdTenant.rents).toHaveLength(1);
  });

  it('rejects a term length no lease can define', async () => {
    await expect(
      call(OccupantManager.add, tenantBody({ frequency: 'hours' }))
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(createdTenant).toBeUndefined();
  });

  it('keeps the stored frequency when an update omits it', async () => {
    // This is the regression: the frequency used to be dropped by the schema,
    // so an update rebuilt a 10-day schedule as a single monthly term.
    originalTenant = dailyOriginalTenant('days');

    await call(OccupantManager.update, tenantBody());

    expect(updatedTenant.frequency).toBe('days');
    expect(updatedTenant.rents).toHaveLength(10);
    expect(leaseFindOneCalls).toHaveLength(0);
  });

  it('rebuilds a legacy tenant from its lease when nothing was ever stored', async () => {
    dbLease = { _id: LEASE_ID, timeRange: 'days' };
    originalTenant = dailyOriginalTenant(undefined);

    await call(OccupantManager.update, tenantBody());

    expect(updatedTenant.frequency).toBe('days');
    expect(updatedTenant.rents).toHaveLength(10);
  });
});
