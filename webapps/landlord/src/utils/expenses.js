import moment from 'moment';

export const ALL_YEARS = 'all';

// Distinct years found in the expenses, most recent first.
export function expenseYears(items = []) {
  const years = new Set(items.map((expense) => moment(expense.date).year()));
  return Array.from(years).sort((a, b) => b - a);
}

// Summarise a list of expenses for a given year (or ALL_YEARS): the filtered
// and date-sorted list, the total, the per-category breakdown (desc), the main
// category, and the year-over-year evolution when a single year is selected.
export function summarizeExpenses(items = [], selectedYear = ALL_YEARS) {
  const inYear = (year) =>
    items.filter((expense) => moment(expense.date).year() === year);

  const list = selectedYear === ALL_YEARS ? items : inYear(selectedYear);
  const expenses = [...list].sort((a, b) =>
    moment(b.date).diff(moment(a.date))
  );

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const map = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});
  const byCategory = Object.entries(map)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  let evolution = null;
  if (selectedYear !== ALL_YEARS) {
    const previous = inYear(selectedYear - 1).reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    if (previous) {
      evolution = {
        previousYear: selectedYear - 1,
        delta: (total - previous) / previous
      };
    }
  }

  return { expenses, total, byCategory, topCategory: byCategory[0], evolution };
}
