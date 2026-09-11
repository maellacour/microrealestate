/* eslint-env node, mocha */
import { jest } from '@jest/globals';
import moment from 'moment';

// The deposit maths is shared with the accounting views — exercise the real
// implementation rather than a stand-in.
const Deposit = await import('@bayle/common/dist/utils/deposit.js');

// Data served to the manager, reset before each test.
let dbTenants = [];
let dbPropertyCount = 0;
// Filters the manager queried with, so the realm boundary can be asserted.
let tenantFilter;
let propertyFilter;

jest.unstable_mockModule('@bayle/common', () => ({
  Collections: {
    Tenant: {
      find: (filter) => {
        tenantFilter = filter;
        return Promise.resolve(dbTenants);
      }
    },
    Property: {
      find: (filter) => {
        propertyFilter = filter;
        return { count: () => Promise.resolve(dbPropertyCount) };
      }
    }
  },
  Deposit
}));

const DashboardManager = await import('../../managers/dashboardmanager.js');

const REALM_ID = 'realm-1';

const term = (monthsFromNow) =>
  moment().add(monthsFromNow, 'months').startOf('month').format('YYYYMMDDHH');

function rent({ monthsFromNow = 0, charged = 0, balance = 0, payments = [] }) {
  const payment = payments.reduce((sum, { amount }) => sum + (amount || 0), 0);
  return {
    term: term(monthsFromNow),
    payments,
    total: {
      balance,
      grandTotal: charged + balance,
      payment
    }
  };
}

function tenant({
  _id = 't1',
  name = 'Alice',
  endsInMonths = 12,
  properties = [],
  rents = [],
  guaranty = 0,
  guarantyPayback = 0,
  guarantyPaybackDate = null
}) {
  const doc = {
    _id,
    name,
    endDate: moment().add(endsInMonths, 'months').toDate(),
    terminationDate: null,
    properties,
    rents,
    guaranty,
    guarantyPayback,
    guarantyPaybackDate
  };
  doc.toObject = () => doc;
  return doc;
}

async function run() {
  const req = { headers: { organizationid: REALM_ID } };
  const res = { json: jest.fn() };
  await DashboardManager.all(req, res);
  return res.json.mock.calls[0][0];
}

describe('dashboardmanager', () => {
  beforeEach(() => {
    dbTenants = [];
    dbPropertyCount = 0;
    tenantFilter = undefined;
    propertyFilter = undefined;
  });

  it('scopes both queries to the organization of the request', async () => {
    dbPropertyCount = 1;
    await run();

    expect(tenantFilter).toEqual({ realmId: REALM_ID });
    expect(propertyFilter).toEqual({ realmId: REALM_ID });
  });

  it('has no overview when the organization is empty', async () => {
    const result = await run();

    expect(result.overview).toBeNull();
  });

  describe('arrears', () => {
    it('takes the running balance from the last term reached', async () => {
      dbPropertyCount = 1;
      dbTenants = [
        tenant({
          rents: [
            // 700 of the first 1000 paid, so 300 rolls forward
            rent({
              monthsFromNow: -2,
              charged: 1000,
              payments: [{ amount: 700 }]
            }),
            rent({
              monthsFromNow: -1,
              charged: 1000,
              balance: 300,
              payments: [{ amount: 1000 }]
            }),
            rent({ monthsFromNow: 0, charged: 1000, balance: 300 })
          ]
        })
      ];

      const { overview } = await run();

      expect(overview.arrears).toEqual({ total: 1300, tenantCount: 1 });
    });

    it('ignores terms that have not been reached yet', async () => {
      dbPropertyCount = 1;
      dbTenants = [
        tenant({
          rents: [
            rent({
              monthsFromNow: 0,
              charged: 800,
              payments: [{ amount: 800 }]
            }),
            rent({ monthsFromNow: 1, charged: 800 }),
            rent({ monthsFromNow: 2, charged: 800 })
          ]
        })
      ];

      const { overview } = await run();

      expect(overview.arrears).toEqual({ total: 0, tenantCount: 0 });
    });

    it('still counts a tenant who left owing rent', async () => {
      dbPropertyCount = 1;
      dbTenants = [
        tenant({
          _id: 'gone',
          name: 'Bob',
          endsInMonths: -3,
          rents: [
            rent({
              monthsFromNow: -4,
              charged: 600,
              payments: [{ amount: 600 }]
            }),
            rent({
              monthsFromNow: -3,
              charged: 600,
              payments: [{ amount: 150 }]
            })
          ]
        })
      ];

      const { overview } = await run();

      expect(overview.tenantCount).toBe(0);
      expect(overview.arrears).toEqual({ total: 450, tenantCount: 1 });
    });

    it('does not let a tenant in credit offset another one in arrears', async () => {
      dbPropertyCount = 2;
      dbTenants = [
        tenant({
          _id: 't1',
          rents: [rent({ monthsFromNow: 0, charged: 500 })]
        }),
        tenant({
          _id: 't2',
          name: 'Carla',
          rents: [
            rent({
              monthsFromNow: 0,
              charged: 500,
              payments: [{ amount: 800 }]
            })
          ]
        })
      ];

      const { overview } = await run();

      expect(overview.arrears).toEqual({ total: 500, tenantCount: 1 });
    });
  });

  describe('current month', () => {
    it('separates what the month charges from what was collected on it', async () => {
      dbPropertyCount = 1;
      dbTenants = [
        tenant({
          rents: [
            // last month left 200 unpaid
            rent({
              monthsFromNow: -1,
              charged: 1000,
              payments: [{ amount: 800 }]
            }),
            // this month charges 1000 and the tenant caught up: 1200 received
            rent({
              monthsFromNow: 0,
              charged: 1000,
              balance: 200,
              payments: [{ amount: 1200 }]
            })
          ]
        })
      ];

      const { overview } = await run();

      expect(overview.currentMonth).toEqual({ charged: 1000, collected: 1200 });
    });
  });

  describe('deposits held', () => {
    it('nets off refunds and rents settled out of the deposit', async () => {
      dbPropertyCount = 1;
      dbTenants = [
        tenant({
          _id: 'full',
          guaranty: 1000,
          rents: [
            rent({
              monthsFromNow: 0,
              charged: 500,
              payments: [{ amount: 500 }]
            })
          ]
        }),
        tenant({
          _id: 'retained',
          name: 'Bob',
          guaranty: 1000,
          rents: [
            rent({
              monthsFromNow: 0,
              charged: 400,
              payments: [{ amount: 400, type: 'deposit' }]
            })
          ]
        })
      ];

      const { overview } = await run();

      expect(overview.depositsHeld).toBe(1600);
    });

    it('leaves out the deposits of leases that have ended', async () => {
      dbPropertyCount = 1;
      dbTenants = [
        tenant({ _id: 'running', guaranty: 900 }),
        tenant({ _id: 'gone', name: 'Bob', endsInMonths: -1, guaranty: 900 })
      ];

      const { overview } = await run();

      expect(overview.depositsHeld).toBe(900);
    });
  });

  it('counts the properties actually rented by a running lease', async () => {
    dbPropertyCount = 4;
    dbTenants = [
      tenant({
        _id: 't1',
        properties: [{ propertyId: 'p1' }, { propertyId: 'p2' }]
      }),
      // same dwelling as t1 (colocation) - counted once
      tenant({ _id: 't2', name: 'Bob', properties: [{ propertyId: 'p2' }] }),
      tenant({
        _id: 'gone',
        name: 'Carla',
        endsInMonths: -1,
        properties: [{ propertyId: 'p3' }]
      })
    ];

    const { overview } = await run();

    expect(overview.propertyCount).toBe(4);
    expect(overview.rentedPropertyCount).toBe(2);
    expect(overview.tenantCount).toBe(2);
  });
});
