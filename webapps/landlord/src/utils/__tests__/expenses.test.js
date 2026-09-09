import { ALL_YEARS, expenseYears, summarizeExpenses } from '../expenses';

const items = [
  { _id: '1', date: '2025-03-10', category: 'works', amount: 100 },
  { _id: '2', date: '2025-07-01', category: 'insurance', amount: 50 },
  { _id: '3', date: '2025-01-05', category: 'works', amount: 200 },
  { _id: '4', date: '2024-06-15', category: 'works', amount: 120 }
];

describe('expenseYears', () => {
  it('returns distinct years, most recent first', () => {
    expect(expenseYears(items)).toEqual([2025, 2024]);
  });

  it('handles empty/omitted input', () => {
    expect(expenseYears([])).toEqual([]);
    expect(expenseYears()).toEqual([]);
  });
});

describe('summarizeExpenses', () => {
  it('totals and breaks down by category (desc) for a given year', () => {
    const { total, byCategory, topCategory } = summarizeExpenses(items, 2025);
    expect(total).toBe(350);
    expect(byCategory).toEqual([
      { category: 'works', amount: 300 },
      { category: 'insurance', amount: 50 }
    ]);
    expect(topCategory).toEqual({ category: 'works', amount: 300 });
  });

  it('sorts the filtered expenses by date, most recent first', () => {
    const { expenses } = summarizeExpenses(items, 2025);
    expect(expenses.map((e) => e._id)).toEqual(['2', '1', '3']);
  });

  it('computes the year-over-year evolution', () => {
    const { evolution } = summarizeExpenses(items, 2025);
    expect(evolution).toEqual({
      previousYear: 2024,
      delta: (350 - 120) / 120
    });
  });

  it('has no evolution when the previous year has no expenses', () => {
    expect(summarizeExpenses(items, 2024).evolution).toBeNull();
  });

  it('aggregates every year and drops evolution for ALL_YEARS', () => {
    const { total, evolution } = summarizeExpenses(items, ALL_YEARS);
    expect(total).toBe(470);
    expect(evolution).toBeNull();
  });
});
