/* eslint-env node, mocha */
import { jest } from '@jest/globals';
import moment from 'moment';

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

// A tenant whose contract has lapsed - by default a 9-year monthly one
// (2016 -> 2024). leaseId is provided already "populated" so the renewal path
// reads leaseId.renewable directly.
//
// `frequency` is the term length the rents are generated with; `legacy` builds
// a document that carries no frequency at all, as every tenant did before the
// field was added to the schema.
function buildTenant({
  renewable = true,
  terminationDate,
  frequency = 'months',
  legacy = false,
  begin = Date.parse('2016-01-01T00:00:00'),
  end = Date.parse('2024-12-31T23:59:59'),
  numberOfTerms = 108
} = {}) {
  const properties = [
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
  ];
  const generated = Contract.create({ begin, end, frequency, properties });

  return {
    _id: '507f1f77bcf86cd799439011',
    realmId: '507f1f77bcf86cd799439012',
    name: 'Renewable Tenant',
    frequency: legacy ? undefined : frequency,
    beginDate: new Date(begin),
    endDate: new Date(end),
    terminationDate,
    discount: 0,
    vatRatio: 0,
    rents: generated.rents,
    properties,
    leaseId: { _id: 'l1', renewable, numberOfTerms, timeRange: frequency }
  };
}

// A 4-week contract that ran out on 2 February 2026.
const WEEKLY = {
  frequency: 'weeks',
  begin: Date.parse('2026-01-05T00:00:00'),
  end: Date.parse('2026-02-02T23:59:59'),
  numberOfTerms: 4
};

// A 10-night stay that ran out on 10 January 2026.
const DAILY = {
  frequency: 'days',
  begin: Date.parse('2026-01-01T00:00:00'),
  end: Date.parse('2026-01-10T23:59:59'),
  numberOfTerms: 10
};

// Runs the renewal that rentOfOccupantByTerm triggers and returns what it
// persisted. The read that follows works off the stale fixture and may throw;
// the renewal we assert on has already run by then.
async function renewFor(tenant, term) {
  jest.spyOn(Collections.Tenant, 'find').mockReturnValue(mockFind([tenant]));
  const updateOne = jest
    .spyOn(Collections.Tenant, 'updateOne')
    .mockResolvedValue({});

  try {
    await RentManager.rentOfOccupantByTerm(
      {
        realm: { _id: tenant.realmId },
        params: { id: tenant._id, term },
        headers: {}
      },
      { json: jest.fn() }
    );
  } catch {
    // ignored
  }

  return { updateOne, $set: updateOne.mock.calls[0]?.[1]?.$set };
}

const daysBetweenTerms = (rents) =>
  moment(String(rents[1].term), 'YYYYMMDDHH').diff(
    moment(String(rents[0].term), 'YYYYMMDDHH'),
    'days'
  );

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

  it('renews a weekly contract on its own cadence', async () => {
    const tenant = buildTenant(WEEKLY);
    expect(tenant.rents).toHaveLength(5);

    // browsing the week of 16 February, past the 2 February end date
    const { updateOne, $set } = await renewFor(tenant, '2026021600');

    expect(updateOne).toHaveBeenCalledTimes(1);
    // one full duration (4 weeks) rolled forward
    expect(moment($set.endDate).format('YYYY-MM-DD')).toBe('2026-03-02');
    expect($set.rents).toHaveLength(9);
    // still weekly, not collapsed onto a monthly grid
    expect(daysBetweenTerms($set.rents)).toBe(7);
    // and the term being browsed now exists
    expect($set.rents.some(({ term }) => term === 2026021600)).toBe(true);
  });

  it('renews a daily contract on its own cadence', async () => {
    const tenant = buildTenant(DAILY);
    expect(tenant.rents).toHaveLength(10);

    const { updateOne, $set } = await renewFor(tenant, '2026011500');

    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(moment($set.endDate).format('YYYY-MM-DD')).toBe('2026-01-20');
    expect(daysBetweenTerms($set.rents)).toBe(1);
    expect($set.rents.some(({ term }) => term === 2026011500)).toBe(true);
  });

  it('persists the property exit date it moved, without rewriting the whole array', async () => {
    const tenant = buildTenant(WEEKLY);

    const { $set } = await renewFor(tenant, '2026021600');

    // the occupancy end follows the contract end...
    expect(moment($set['properties.0.exitDate']).format('YYYY-MM-DD')).toBe(
      '2026-03-02'
    );
    // ...as a single field: re-casting the whole properties array would take
    // the embedded property snapshot with it and throw on a lean document
    expect($set.properties).toBeUndefined();
    // and the renewed terms are billed rather than free
    expect(
      $set.rents.slice(5).every((rent) => rent.preTaxAmounts.length > 0)
    ).toBe(true);
  });

  it('characterizes the bug: a contract with no stored frequency is never renewed', async () => {
    // Legacy documents written before `frequency` existed on the schema. The
    // renewal reads 'months', so a 4-week contract is regenerated as 3 monthly
    // terms - fewer than the 5 weekly ones it already had. The renewal is only
    // persisted when it produced more terms, so nothing is written at all and
    // the tenant silently stops renewing. This is what the startup migration
    // exists to prevent.
    const tenant = buildTenant({ ...WEEKLY, legacy: true });

    const { updateOne } = await renewFor(tenant, '2026021600');

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
