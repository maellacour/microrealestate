import moment from 'moment';

const round = (value) => Math.round((value || 0) * 100) / 100;

// Provisions "appelées" (called, not paid) over the period: sum of each rent
// term's charges when the term falls within [periodStart, periodEnd]. A rent
// term is a YYYYMMDDHH number.
export function provisionsCalledInPeriod(rents, periodStart, periodEnd) {
  if (!periodStart || !periodEnd) {
    return 0;
  }
  const start = moment(periodStart).startOf('day');
  const end = moment(periodEnd).endOf('day');
  return round(
    (rents || []).reduce((sum, rent) => {
      const termMoment = moment(String(rent.term), 'YYYYMMDDHH');
      if (termMoment.isBetween(start, end, undefined, '[]')) {
        return sum + ((rent.total && rent.total.charges) || 0);
      }
      return sum;
    }, 0)
  );
}

// Sum of the recoverable lines only.
export function recoverableTotal(lines) {
  return round(
    (lines || [])
      .filter((line) => line.recoverable)
      .reduce((sum, line) => sum + (line.amount || 0), 0)
  );
}

// balance > 0 means a credit to the tenant (they over-paid), balance < 0 means
// the tenant owes a complement.
export function computeRegularization(rents, lines, periodStart, periodEnd) {
  const provisionsCalled = provisionsCalledInPeriod(
    rents,
    periodStart,
    periodEnd
  );
  const recoverable = recoverableTotal(lines);
  return {
    provisionsCalled,
    recoverableTotal: recoverable,
    balance: round(provisionsCalled - recoverable)
  };
}

// Describe the settlement adjustment to post on a rent term for a given
// balance. A complement due (balance < 0) becomes a debt; a credit
// (balance > 0) becomes a settlement discount. Returns null when there is
// nothing to post. The amount is stored pre-VAT, mirroring the extracharge /
// promo inputs, so the grand total reflects the balance once VAT is re-applied.
export function regularizationAdjustment(balance, vatRate) {
  if (!balance) {
    return null;
  }
  const factor = vatRate ? 1 / (1 + vatRate) : 1;
  if (balance < 0) {
    return { type: 'debt', amount: round(Math.abs(balance) * factor) };
  }
  return { type: 'discount', amount: round(balance * factor) };
}
