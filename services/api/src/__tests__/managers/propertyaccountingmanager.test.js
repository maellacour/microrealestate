/* eslint-env node, mocha */
import { fileURLToPath } from 'url';
import i18n from 'i18n';
import { jest } from '@jest/globals';
import path from 'path';

// The CSV export translates its column labels; the service configures i18n at
// startup, so the test has to do it against the real locale files.
i18n.configure({
  locales: ['en', 'fr-FR', 'pt-BR', 'de-DE', 'es-CO'],
  directory: path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../locales'
  ),
  updateFiles: false
});

// Data served to the manager, reset before each test.
let dbProperties = [];
let dbTenants = [];
let dbExpenses = [];
// Filters the manager queried with, so the realm boundary can be asserted.
let propertyFilter;
let tenantFilter;
let expenseFilter;

const lean = (data) => ({ lean: () => Promise.resolve(data) });

jest.unstable_mockModule('@microrealestate/common', () => ({
  Collections: {
    Property: {
      find: (filter) => {
        propertyFilter = filter;
        return { sort: () => lean(dbProperties) };
      }
    },
    Tenant: {
      find: (filter) => {
        tenantFilter = filter;
        return lean(dbTenants);
      }
    },
    Expense: {
      find: (filter) => {
        expenseFilter = filter;
        return lean(dbExpenses);
      }
    }
  }
}));

const PropertyAccountingManager = await import(
  '../../managers/propertyaccountingmanager.js'
);

const YEAR = 2026;
const DAYS_IN_YEAR = 365;
// works, insurance, property_tax, condo_charges, management_fees,
// loan_interest, other
const EXPENSE_CATEGORY_COUNT = 7;

// Dates are built in local time so they line up with moment's local parsing,
// keeping the day counts independent of the runner's timezone.
const localDate = (year, month, day) => new Date(year, month - 1, day);

function property(_id, name, type = 'apartment') {
  return { _id, name, type };
}

function rent({ year = YEAR, month = 1, payments = [], total = {} }) {
  return {
    year,
    month,
    payments,
    total: {
      grandTotal: 0,
      balance: 0,
      payment: payments.reduce((sum, { amount }) => sum + (amount || 0), 0),
      ...total
    }
  };
}

async function run(query) {
  const req = {
    realm: { _id: 'realm-1' },
    params: { year: String(YEAR) },
    query
  };
  const res = { json: jest.fn() };
  await PropertyAccountingManager.all(req, res);
  return res.json.mock.calls[0][0];
}

const byId = (result, id) => result.properties.find((p) => p._id === id);

describe('propertyaccountingmanager', () => {
  beforeEach(() => {
    dbProperties = [];
    dbTenants = [];
    dbExpenses = [];
    propertyFilter = undefined;
    tenantFilter = undefined;
    expenseFilter = undefined;
  });

  it('counts only the payments received during the year (cash basis)', async () => {
    dbProperties = [property('p1', 'Studio')];
    dbTenants = [
      {
        name: 'Alice',
        properties: [
          {
            propertyId: 'p1',
            rent: 1000,
            entryDate: localDate(2026, 1, 1),
            exitDate: localDate(2026, 12, 31)
          }
        ],
        rents: [
          rent({
            month: 1,
            payments: [{ amount: 1000, date: '05/01/2026', type: 'transfer' }]
          }),
          rent({
            month: 2,
            payments: [{ amount: 1000, date: '05/02/2026', type: 'transfer' }]
          }),
          // received the year before - must not count for 2026
          rent({
            year: 2025,
            month: 12,
            payments: [{ amount: 1000, date: '05/12/2025', type: 'transfer' }]
          })
        ]
      }
    ];

    const result = await run();
    const studio = byId(result, 'p1');

    expect(studio.revenue.collected).toBe(2000);
    expect(studio.revenue.byMonth[0]).toBe(1000);
    expect(studio.revenue.byMonth[1]).toBe(1000);
    expect(studio.revenue.byMonth[11]).toBe(0);
    expect(studio.allocationApproximate).toBe(false);
    expect(result.totals.collected).toBe(2000);
  });

  it('excludes a december term settled in january of the next year', async () => {
    dbProperties = [property('p1', 'Studio')];
    dbTenants = [
      {
        name: 'Alice',
        properties: [
          {
            propertyId: 'p1',
            rent: 1000,
            entryDate: localDate(2026, 1, 1),
            exitDate: localDate(2026, 12, 31)
          }
        ],
        rents: [
          rent({
            month: 12,
            payments: [{ amount: 1000, date: '05/01/2027', type: 'transfer' }],
            total: { grandTotal: 1000 }
          })
        ]
      }
    ];

    const result = await run();
    const studio = byId(result, 'p1');

    // no cash in 2026...
    expect(studio.revenue.collected).toBe(0);
    // ...but the term was charged in 2026 and is not owed anymore
    expect(studio.charged).toBe(1000);
    expect(studio.stillDue).toBe(0);
  });

  it('reports rent charged but never settled as still due', async () => {
    dbProperties = [property('p1', 'Studio')];
    dbTenants = [
      {
        name: 'Alice',
        properties: [
          {
            propertyId: 'p1',
            rent: 1000,
            entryDate: localDate(2026, 1, 1),
            exitDate: localDate(2026, 12, 31)
          }
        ],
        rents: [
          rent({ month: 1, payments: [], total: { grandTotal: 1000 } }),
          // grandTotal carries the 1000 unpaid from january as a balance
          rent({
            month: 2,
            payments: [{ amount: 400, date: '05/02/2026', type: 'transfer' }],
            total: { grandTotal: 2000, balance: 1000 }
          })
        ]
      }
    ];

    const result = await run();
    const studio = byId(result, 'p1');

    expect(studio.revenue.collected).toBe(400);
    // charge raised by each term itself, carried balance excluded
    expect(studio.charged).toBe(2000);
    expect(studio.stillDue).toBe(1600);
  });

  it('splits a multi-property tenant by configured rent share and flags it', async () => {
    dbProperties = [property('p1', 'Flat'), property('p2', 'Garage', 'garage')];
    dbTenants = [
      {
        name: 'Bob',
        properties: [
          {
            propertyId: 'p1',
            rent: 800,
            entryDate: localDate(2026, 1, 1),
            exitDate: localDate(2026, 12, 31)
          },
          {
            propertyId: 'p2',
            rent: 200,
            entryDate: localDate(2026, 1, 1),
            exitDate: localDate(2026, 12, 31)
          }
        ],
        rents: [
          rent({
            month: 1,
            payments: [{ amount: 1000, date: '05/01/2026', type: 'transfer' }],
            total: { grandTotal: 1000 }
          })
        ]
      }
    ];

    const result = await run();

    expect(byId(result, 'p1').revenue.collected).toBe(800);
    expect(byId(result, 'p2').revenue.collected).toBe(200);
    expect(byId(result, 'p1').charged).toBe(800);
    expect(byId(result, 'p2').charged).toBe(200);
    expect(byId(result, 'p1').allocationApproximate).toBe(true);
    expect(byId(result, 'p2').allocationApproximate).toBe(true);
  });

  it('surfaces deposit retentions inside the collected revenue', async () => {
    dbProperties = [property('p1', 'Studio')];
    dbTenants = [
      {
        name: 'Alice',
        properties: [
          {
            propertyId: 'p1',
            rent: 1000,
            entryDate: localDate(2026, 1, 1),
            exitDate: localDate(2026, 12, 31)
          }
        ],
        rents: [
          rent({
            month: 1,
            payments: [
              { amount: 600, date: '05/01/2026', type: 'transfer' },
              { amount: 400, date: '31/01/2026', type: 'deposit' }
            ]
          })
        ]
      }
    ];

    const result = await run();
    const studio = byId(result, 'p1');

    expect(studio.revenue.collected).toBe(1000);
    expect(studio.revenue.depositRetention).toBe(400);
  });

  it('groups expenses by category and scopes every query to the realm', async () => {
    dbProperties = [property('p1', 'Studio')];
    dbExpenses = [
      { propertyId: 'p1', category: 'works', amount: 300 },
      { propertyId: 'p1', category: 'works', amount: 200 },
      { propertyId: 'p1', category: 'insurance', amount: 120 },
      // unknown category falls back to "other" rather than being dropped
      { propertyId: 'p1', category: 'mystery', amount: 50 },
      // expense of another property is ignored
      { propertyId: 'p9', category: 'works', amount: 999 }
    ];

    const result = await run();
    const studio = byId(result, 'p1');

    expect(studio.expenses.total).toBe(670);
    expect(studio.expenses.byCategory.works).toBe(500);
    expect(studio.expenses.byCategory.insurance).toBe(120);
    expect(studio.expenses.byCategory.other).toBe(50);
    expect(studio.netResult).toBe(-670);

    expect(propertyFilter).toEqual({ realmId: 'realm-1' });
    expect(tenantFilter).toEqual({ realmId: 'realm-1' });
    expect(expenseFilter.realmId).toBe('realm-1');
    expect(expenseFilter.date.$gte).toEqual(localDate(2026, 1, 1));
    expect(expenseFilter.date.$lt).toEqual(localDate(2027, 1, 1));
  });

  it('clips occupancy to the year and to an early termination', async () => {
    dbProperties = [property('p1', 'Studio'), property('p2', 'Loft')];
    dbTenants = [
      {
        name: 'Terminated',
        terminationDate: localDate(2026, 6, 30),
        properties: [
          {
            propertyId: 'p1',
            rent: 1000,
            entryDate: localDate(2026, 3, 1),
            exitDate: localDate(2026, 12, 31)
          }
        ],
        rents: []
      },
      {
        name: 'Spanning',
        properties: [
          {
            propertyId: 'p2',
            rent: 1000,
            entryDate: localDate(2025, 6, 1),
            exitDate: localDate(2027, 6, 1)
          }
        ],
        rents: []
      }
    ];

    const result = await run();

    // 1 march -> 30 june
    expect(byId(result, 'p1').occupancy.days).toBe(122);
    expect(byId(result, 'p1').occupancy.rate).toBeCloseTo(122 / DAYS_IN_YEAR);
    expect(byId(result, 'p2').occupancy.days).toBe(DAYS_IN_YEAR);
    expect(byId(result, 'p2').occupancy.rate).toBe(1);
    expect(byId(result, 'p2').occupancyOverlap).toBe(false);
  });

  it('caps occupancy at the year and flags overlapping tenants', async () => {
    dbProperties = [property('p1', 'Studio')];
    const window = (entry, exit) => ({
      propertyId: 'p1',
      rent: 1000,
      entryDate: entry,
      exitDate: exit
    });
    dbTenants = [
      {
        name: 'Leaving',
        properties: [window(localDate(2026, 1, 1), localDate(2026, 7, 15))],
        rents: []
      },
      {
        name: 'Arriving',
        properties: [window(localDate(2026, 7, 1), localDate(2026, 12, 31))],
        rents: []
      }
    ];

    const result = await run();
    const studio = byId(result, 'p1');

    expect(studio.occupancy.days).toBe(DAYS_IN_YEAR);
    expect(studio.occupancy.rate).toBe(1);
    expect(studio.occupancyOverlap).toBe(true);
  });

  it('returns a zero row for a property with no tenant and no expense', async () => {
    dbProperties = [property('p3', 'Vacant')];

    const result = await run();
    const vacant = byId(result, 'p3');

    expect(vacant).toMatchObject({
      name: 'Vacant',
      charged: 0,
      stillDue: 0,
      netResult: 0,
      allocationApproximate: false
    });
    expect(vacant.revenue.collected).toBe(0);
    expect(vacant.expenses.total).toBe(0);
    expect(vacant.occupancy.days).toBe(0);
    expect(result.totals.occupancyRate).toBe(0);
  });

  it('exports the year as a CSV with one row per property', async () => {
    dbProperties = [property('p1', 'Studio'), property('p2', 'Vacant')];
    dbTenants = [
      {
        name: 'Alice',
        properties: [
          {
            propertyId: 'p1',
            rent: 1000,
            entryDate: localDate(2026, 1, 1),
            exitDate: localDate(2026, 12, 31)
          }
        ],
        rents: [
          rent({
            month: 1,
            payments: [{ amount: 1000, date: '05/01/2026', type: 'transfer' }],
            total: { grandTotal: 1000 }
          })
        ]
      }
    ];
    dbExpenses = [{ propertyId: 'p1', category: 'works', amount: 300 }];

    const req = {
      realm: { _id: 'realm-1', locale: 'en', currency: 'EUR' },
      params: { year: String(YEAR) }
    };
    const res = { header: jest.fn(), send: jest.fn() };

    await PropertyAccountingManager.csv.results(req, res);

    expect(res.header).toHaveBeenCalledWith('Content-Type', 'text/csv');
    const csv = res.send.mock.calls[0][0];
    const [header, ...rows] = csv.split('\n');

    // semicolon separated: 8 report columns plus one per expense category
    expect(header.split(';').length).toBe(8 + EXPENSE_CATEGORY_COUNT);
    expect(header).toContain('Collected revenue');
    expect(header).toContain('Net result');
    expect(header).toContain('Occupancy rate');
    expect(header).toContain('Works'); // translated, not the raw category id

    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('Studio');
    expect(rows[0]).toContain('100%'); // rented all year
    // a property with no activity is still exported
    expect(rows[1]).toContain('Vacant');
    expect(rows[1]).toContain('0%');
  });

  it('restricts the report to one property when propertyId is given', async () => {
    dbProperties = [property('p1', 'Studio')];

    const result = await run({ propertyId: 'p1' });

    expect(propertyFilter).toEqual({ realmId: 'realm-1', _id: 'p1' });
    expect(result.properties).toHaveLength(1);
    expect(result.year).toBe(YEAR);
  });
});
