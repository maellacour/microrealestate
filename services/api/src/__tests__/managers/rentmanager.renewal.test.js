/* eslint-env node, mocha */
import { jest } from '@jest/globals';

// Import the real Mongoose collections directly (bypassing
// @microrealestate/common's main entry point, which pulls in
// express-winston/winston and breaks under jest's ESM runner).
const Collections = await import(
  '@microrealestate/common/dist/collections/index.js'
);

jest.unstable_mockModule('@microrealestate/common', () => ({
  Collections,
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  Service: {
    getInstance: () => ({
      envConfig: {
        getValues: () => ({
          EMAILER_URL: 'http://emailer.test',
          DEMO_MODE: true
        })
      }
    })
  },
  ServiceError: class ServiceError extends Error {}
}));

jest.unstable_mockModule('axios', () => ({
  default: {
    get: jest.fn().mockRejectedValue(new Error('unreachable in test'))
  }
}));

const RentManager = await import('../../managers/rentmanager.js');
const Contract = await import('../../managers/contract.js');

// A tenant on a 9-year contract (2016 -> 2024) whose end date has lapsed.
// leaseId is provided already "populated" so the renewal path reads
// leaseId.renewable directly.
function buildTenant({ renewable = true, terminationDate } = {}) {
  const begin = Date.parse('2016-01-01T00:00:00');
  const end = Date.parse('2024-12-31T23:59:59');
  const generated = Contract.create({
    begin,
    end,
    frequency: 'months',
    properties: [{ rent: 1000 }]
  });

  return {
    _id: '507f1f77bcf86cd799439011',
    realmId: '507f1f77bcf86cd799439012',
    name: 'Renewable Tenant',
    frequency: 'months',
    beginDate: new Date(begin),
    endDate: new Date(end),
    terminationDate,
    discount: 0,
    vatRatio: 0,
    rents: generated.rents,
    properties: [
      {
        propertyId: '507f1f77bcf86cd799439013',
        entryDate: new Date(begin),
        exitDate: new Date(end),
        property: {
          _id: '507f1f77bcf86cd799439013',
          realmId: '507f1f77bcf86cd799439012',
          name: 'Office 1',
          type: 'office'
        },
        rent: 1000,
        expenses: []
      }
    ],
    leaseId: { _id: 'l1', renewable, numberOfTerms: 108, timeRange: 'months' }
  };
}

// Chainable stub covering both `find().populate().lean()` (renewal) and
// `find().sort().lean()` (_findOccupants).
function mockFind(list) {
  const chain = {
    populate: () => chain,
    sort: () => chain,
    lean: () => Promise.resolve(list)
  };
  return chain;
}

describe('rentmanager tacit renewal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rolls the end date forward and persists it when a renewable contract has lapsed', async () => {
    const tenant = buildTenant();
    jest.spyOn(Collections.Tenant, 'find').mockReturnValue(mockFind([tenant]));
    const updateOne = jest
      .spyOn(Collections.Tenant, 'updateOne')
      .mockResolvedValue({});

    const req = {
      realm: { _id: tenant.realmId },
      params: { id: tenant._id, term: '2030120100' },
      headers: {}
    };
    const res = { json: jest.fn() };

    // The subsequent read (no matching rent for that far term with the
    // stale fixture) may throw; the renewal we assert on runs before it.
    try {
      await RentManager.rentOfOccupantByTerm(req, res);
    } catch {
      // ignored
    }

    expect(updateOne).toHaveBeenCalledTimes(1);
    const { $set } = updateOne.mock.calls[0][1];
    // one full duration (108 months) rolled forward => 216 terms
    expect($set.rents.length).toBe(108 * 2);
    expect(new Date($set.endDate).getFullYear()).toBe(2033);
  });

  it('does not renew a contract whose lease is not renewable', async () => {
    const tenant = buildTenant({ renewable: false });
    jest.spyOn(Collections.Tenant, 'find').mockReturnValue(mockFind([tenant]));
    const updateOne = jest
      .spyOn(Collections.Tenant, 'updateOne')
      .mockResolvedValue({});

    const req = {
      realm: { _id: tenant.realmId },
      params: { id: tenant._id, term: '2030120100' },
      headers: {}
    };
    const res = { json: jest.fn() };

    try {
      await RentManager.rentOfOccupantByTerm(req, res);
    } catch {
      // ignored
    }

    expect(updateOne).not.toHaveBeenCalled();
  });

  it('does not renew a terminated contract even when renewable', async () => {
    const tenant = buildTenant({
      terminationDate: new Date(Date.parse('2018-12-31T23:59:59'))
    });
    jest.spyOn(Collections.Tenant, 'find').mockReturnValue(mockFind([tenant]));
    const updateOne = jest
      .spyOn(Collections.Tenant, 'updateOne')
      .mockResolvedValue({});

    const req = {
      realm: { _id: tenant.realmId },
      params: { id: tenant._id, term: '2030120100' },
      headers: {}
    };
    const res = { json: jest.fn() };

    try {
      await RentManager.rentOfOccupantByTerm(req, res);
    } catch {
      // ignored
    }

    expect(updateOne).not.toHaveBeenCalled();
  });
});
