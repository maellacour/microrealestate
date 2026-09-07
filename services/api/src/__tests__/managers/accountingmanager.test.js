/* eslint-env node, mocha */
import { jest } from '@jest/globals';

const YEAR = 2026;

// Tenants served to the manager, and the aggregation pipeline it queried with,
// captured so the projection can be asserted.
let dbTenants = [];
let aggregatePipeline;

// The deposit computation is the real one: only the database access is faked.
const Deposit = await import('@microrealestate/common/dist/utils/deposit.js');

jest.unstable_mockModule('@microrealestate/common', () => ({
  Deposit,
  Collections: {
    Tenant: {
      aggregate: (pipeline) => {
        aggregatePipeline = pipeline;
        return Promise.resolve(dbTenants);
      }
    }
  }
}));

const AccountingManager = await import('../../managers/accountingmanager.js');

// A payment recorded against a rent term.
function payment({ type = 'transfer', amount = 0, date = '15/03/2026' }) {
  return { date, type, amount, reference: '' };
}

// A tenant as the aggregation returns it: properties already flattened, rents
// already filtered on the requested year, and the deposit retained over the
// whole lease pre-computed by the pipeline.
function outgoingTenant({
  guaranty = 0,
  guarantyPayback = 0,
  guarantyPaybackDate,
  payments = [],
  grandTotal = 0
}) {
  const rents = [
    {
      year: YEAR,
      month: 3,
      payments,
      total: {
        balance: 0,
        grandTotal,
        payment: payments.reduce((sum, { amount }) => sum + amount, 0)
      }
    }
  ];

  return {
    _id: 'tenant-1',
    realmId: 'realm-1',
    name: 'Doe',
    reference: 'REF-1',
    incoming: false,
    outgoing: true,
    beginDate: new Date(2024, 0, 1),
    endDate: new Date(YEAR, 2, 31),
    terminationDate: new Date(YEAR, 2, 31),
    guaranty,
    guarantyPayback,
    guarantyPaybackDate,
    properties: [{ _id: 'property-1', name: 'Flat', type: 'apartment' }],
    rents,
    depositRetained: payments
      .filter(({ type }) => type === 'deposit')
      .reduce((sum, { amount }) => sum + amount, 0)
  };
}

async function outgoingTenantsPayload() {
  let payload;
  await AccountingManager.all(
    {
      realm: { _id: 'realm-1', locale: 'fr-FR', currency: 'EUR' },
      params: { year: String(YEAR) }
    },
    { json: (data) => (payload = data) }
  );
  return payload.outgoingTenants;
}

beforeEach(() => {
  dbTenants = [];
  aggregatePipeline = undefined;
});

describe('accountingmanager outgoing tenants', () => {
  it('leaves the deposit untouched when no rent was settled out of it', async () => {
    dbTenants = [
      outgoingTenant({
        guaranty: 1000,
        payments: [payment({ type: 'transfer', amount: 200 })],
        grandTotal: 800
      })
    ];

    const [tenant] = await outgoingTenantsPayload();
    expect(tenant.depositToRefund).toEqual(1000);
    // 200 received on a 800 term, plus the 1000 deposit still held.
    expect(tenant.finalBalance).toEqual(400);
  });

  it('excludes a rent settled out of the deposit from the amount left to refund', async () => {
    dbTenants = [
      outgoingTenant({
        guaranty: 1000,
        payments: [payment({ type: 'deposit', amount: 500 })],
        grandTotal: 500
      })
    ];

    const [tenant] = await outgoingTenantsPayload();
    expect(tenant.depositToRefund).toEqual(500);
  });

  it('does not count a deposit retention twice in the final balance', async () => {
    dbTenants = [
      outgoingTenant({
        guaranty: 1000,
        payments: [payment({ type: 'deposit', amount: 500 })],
        grandTotal: 500
      })
    ];

    // The retention already settled the 500 term, so the landlord only still
    // holds the other 500 of the deposit.
    const [tenant] = await outgoingTenantsPayload();
    expect(tenant.finalBalance).toEqual(500);
  });

  it('reports a deposit entirely consumed by retentions as settled', async () => {
    dbTenants = [
      outgoingTenant({
        guaranty: 1000,
        payments: [payment({ type: 'deposit', amount: 1000 })],
        grandTotal: 1000
      })
    ];

    const [tenant] = await outgoingTenantsPayload();
    expect(tenant.depositToRefund).toEqual(0);
    expect(tenant.depositRefundStatus).toEqual('settled');
  });

  it('projects the deposit fields the refund status is computed from', async () => {
    dbTenants = [outgoingTenant({ guaranty: 1000 })];
    await outgoingTenantsPayload();

    const projection = aggregatePipeline.find(
      (stage) => !!stage.$project
    ).$project;
    // A refund date recorded by the landlord settles the deposit even when he
    // kept part of it, and the retentions are needed to know what is left.
    expect(projection.guarantyPaybackDate).toBeDefined();
    expect(projection.depositRetained).toBeDefined();
  });
});
