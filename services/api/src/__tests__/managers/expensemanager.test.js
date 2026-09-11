/* eslint-env node, mocha */
import { jest } from '@jest/globals';

// Capture what the manager tries to persist / query so we can assert the
// realmId boundary is enforced and only whitelisted fields survive.
let captured;
let findFilter;
const saveMock = jest.fn().mockResolvedValue(undefined);

class FakeExpense {
  constructor(doc) {
    captured = doc;
    Object.assign(this, doc);
  }
  save() {
    return saveMock();
  }
  toObject() {
    return { ...captured, _id: 'generated-id' };
  }
  static find(filter) {
    findFilter = filter;
    return { sort: () => ({ lean: () => Promise.resolve([]) }) };
  }
}

jest.unstable_mockModule('@bayle/common', () => ({
  Collections: { Expense: FakeExpense }
}));

const ExpenseManager = await import('../../managers/expensemanager.js');

describe('expensemanager', () => {
  afterEach(() => {
    captured = undefined;
    findFilter = undefined;
    jest.clearAllMocks();
  });

  it('add forces realmId from the authenticated realm and ignores a spoofed one', async () => {
    const req = {
      realm: { _id: 'realm-1' },
      body: {
        realmId: 'attacker-realm',
        propertyId: 'prop-1',
        category: 'works',
        amount: 100,
        date: '2026-01-01',
        description: 'roof repair'
      }
    };
    const res = { json: jest.fn() };

    await ExpenseManager.add(req, res);

    expect(captured.realmId).toBe('realm-1');
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ realmId: 'realm-1', propertyId: 'prop-1' })
    );
  });

  it('add drops non-editable fields (no client-set _id, source or arbitrary keys)', async () => {
    const req = {
      realm: { _id: 'realm-1' },
      body: {
        _id: 'spoofed-id',
        source: 'bank_transaction',
        transactionId: 'tx-1',
        bogus: 'x',
        propertyId: 'prop-1',
        category: 'insurance',
        amount: 42,
        date: '2026-02-02'
      }
    };
    const res = { json: jest.fn() };

    await ExpenseManager.add(req, res);

    expect(captured._id).toBeUndefined();
    expect(captured.source).toBeUndefined();
    expect(captured.transactionId).toBeUndefined();
    expect(captured.bogus).toBeUndefined();
    expect(captured.category).toBe('insurance');
  });

  it('all scopes the query to the realm (and optional propertyId)', async () => {
    const req = {
      realm: { _id: 'realm-1' },
      query: { propertyId: 'prop-1' }
    };
    const res = { json: jest.fn() };

    await ExpenseManager.all(req, res);

    expect(findFilter).toEqual({ realmId: 'realm-1', propertyId: 'prop-1' });
    expect(res.json).toHaveBeenCalledWith([]);
  });
});
