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

const REALM_ID = '507f1f77bcf86cd799439012';
const TENANT_ID = '507f1f77bcf86cd799439011';
// a 10-night stay, and the term of its 5th night
const BEGIN = new Date(2026, 0, 1);
const END = new Date(2026, 0, 10);
const PAID_TERM = '2026010500';

function buildTenant(frequency) {
  const contract = Contract.create({
    begin: BEGIN,
    end: END,
    frequency: 'days',
    properties: [
      {
        propertyId: '507f1f77bcf86cd799439013',
        rent: 50,
        entryDate: BEGIN,
        exitDate: END,
        expenses: [],
        property: { _id: '507f1f77bcf86cd799439013', name: 'Studio' }
      }
    ]
  });

  return {
    _id: TENANT_ID,
    realmId: REALM_ID,
    name: 'Short stay',
    frequency,
    beginDate: BEGIN,
    endDate: END,
    discount: 0,
    vatRatio: 0,
    rents: contract.rents,
    properties: [
      {
        propertyId: '507f1f77bcf86cd799439013',
        rent: 50,
        entryDate: BEGIN,
        exitDate: END,
        expenses: [],
        property: { _id: '507f1f77bcf86cd799439013', name: 'Studio' }
      }
    ]
  };
}

const termsOf = (rents) => rents.map(({ term }) => term);

// Drives rentManager.updateByTerm against an in-memory tenant and reports what
// it persisted. The terms are snapshotted at write time because toRentData
// reverses the rents array of the document it is handed.
async function payTerm(tenant) {
  let savedRents;
  let persistedTerms;
  let paidTerms;

  jest
    .spyOn(Collections.Tenant, 'find')
    .mockReturnValue({ populate: () => ({ lean: () => Promise.resolve([]) }) });

  jest.spyOn(Collections.Tenant, 'findOne').mockImplementation(() => ({
    lean: () =>
      Promise.resolve(savedRents ? { ...tenant, rents: savedRents } : tenant)
  }));

  jest
    .spyOn(Collections.Tenant, 'updateOne')
    .mockImplementation((_, update) => {
      savedRents = update.$set.rents;
      persistedTerms = termsOf(savedRents);
      paidTerms = savedRents
        .filter(({ payments }) => payments.length)
        .map(({ term }) => term);
      return Promise.resolve({ modifiedCount: 1 });
    });

  const res = { json: jest.fn() };
  let error;
  try {
    await RentManager.updateByTerm(
      {
        realm: { _id: REALM_ID },
        params: { term: PAID_TERM },
        headers: {},
        body: {
          _id: TENANT_ID,
          payments: [{ amount: 50, type: 'transfer', date: '05/01/2026' }]
        }
      },
      res
    );
  } catch (caught) {
    error = caught;
  }

  return {
    persistedTerms,
    paidTerms,
    error,
    rentData: res.json.mock.calls[0]?.[0]
  };
}

describe('rentmanager - recording a payment on a non-monthly contract', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('leaves a daily schedule intact', async () => {
    const tenant = buildTenant('days');
    const termsBefore = termsOf(tenant.rents);
    expect(termsBefore).toHaveLength(10);

    const { persistedTerms, paidTerms, rentData, error } =
      await payTerm(tenant);

    expect(error).toBeUndefined();
    // every night is still there, still one calendar day apart
    expect(persistedTerms).toEqual(termsBefore);
    expect(persistedTerms[0]).toBe(2026010100);
    expect(persistedTerms[9]).toBe(2026011000);

    // and the payment landed on the night it was made for, alone
    expect(paidTerms).toEqual([Number(PAID_TERM)]);
    expect(rentData.term).toBe(Number(PAID_TERM));
    expect(rentData.payment).toBe(50);
  });

  it('characterizes the bug: a tenant with no stored frequency is rebuilt monthly', async () => {
    // Legacy documents written before `frequency` existed on the schema. The
    // read path falls back to 'months', so paying one night re-spaces the whole
    // schedule a month apart and destroys it. The startup migration backfills
    // these from their lease, which is what keeps this out of production.
    const tenant = buildTenant(undefined);
    const dailyTerms = termsOf(buildTenant('days').rents);

    const { persistedTerms, error } = await payTerm(tenant);

    // the ten nights became ten monthly terms
    expect(persistedTerms).not.toEqual(dailyTerms);
    expect(persistedTerms[0]).toBe(2026010100);
    expect(persistedTerms[1]).toBe(2026020100); // a month later, not a day
    // the paid term does not even exist in the rebuilt schedule anymore
    expect(persistedTerms).not.toContain(Number(PAID_TERM));
    expect(error).toBeDefined();
  });
});
