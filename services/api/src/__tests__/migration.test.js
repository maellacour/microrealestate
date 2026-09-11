/* eslint-env node, mocha */
import { jest } from '@jest/globals';

let dbLeases;
let updateManyCalls;

const loggerMock = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const Collections = {
  // the cleanup steps of the migration iterate over these; nothing to clean here
  Realm: { find: () => Promise.resolve([]) },
  Property: { find: () => Promise.resolve([]) },
  Template: { find: () => Promise.resolve([]) },
  Lease: {
    // called both as find({}) by the cleanup step and as
    // find({}, projection).lean() by the frequency backfill
    find: (filter, projection) =>
      projection
        ? { lean: () => Promise.resolve(dbLeases) }
        : Promise.resolve([])
  },
  Tenant: {
    collection: {
      updateMany: (filter, update) => {
        updateManyCalls.push({ filter, update });
        return Promise.resolve({ modifiedCount: 1 });
      }
    }
  }
};

jest.unstable_mockModule('@bayle/common', () => ({
  Collections,
  logger: loggerMock,
  EnvironmentConfig: class EnvironmentConfig {},
  MongoClient: { getInstance: () => ({}) }
}));

const { default: migratedb } = await import('../../scripts/migration.js');

// The contact rename step runs before the backfill and shares the same mock.
const frequencyUpdates = () =>
  updateManyCalls.filter(({ update }) => update?.$set?.frequency);

describe('migration - tenant rent term frequency backfill', () => {
  beforeEach(() => {
    dbLeases = [];
    updateManyCalls = [];
    jest.clearAllMocks();
  });

  // migratedb() swallows its own errors, so an assertion of "nothing was
  // updated" would pass just as well if an earlier step had blown up.
  afterEach(() => {
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it('backfills each tenant from the time range of its lease', async () => {
    dbLeases = [
      { _id: 'lease-daily', timeRange: 'days' },
      { _id: 'lease-weekly', timeRange: 'weeks' },
      { _id: 'lease-monthly-a', timeRange: 'months' },
      { _id: 'lease-monthly-b', timeRange: 'months' }
    ];

    await migratedb();

    const updates = frequencyUpdates();
    expect(updates).toHaveLength(3); // one per distinct time range

    const byFrequency = updates.reduce((acc, { filter, update }) => {
      acc[update.$set.frequency] = filter.leaseId.$in;
      return acc;
    }, {});

    expect(byFrequency.days).toEqual(['lease-daily']);
    expect(byFrequency.weeks).toEqual(['lease-weekly']);
    expect(byFrequency.months).toEqual(['lease-monthly-a', 'lease-monthly-b']);
  });

  it('never overwrites a frequency a tenant already carries', async () => {
    dbLeases = [{ _id: 'lease-daily', timeRange: 'days' }];

    await migratedb();

    expect(frequencyUpdates()[0].filter.frequency).toEqual({ $exists: false });
  });

  it('skips leases with no time range', async () => {
    dbLeases = [
      { _id: 'lease-incomplete' },
      { _id: 'lease-empty', timeRange: '' }
    ];

    await migratedb();

    expect(frequencyUpdates()).toHaveLength(0);
    // ...but the migration did run to completion
    expect(updateManyCalls.length).toBeGreaterThan(0);
  });
});
