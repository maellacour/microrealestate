import moment from 'moment';

// Pure charge-regularization and colocation quote-part maths, shared by the
// landlord api and the tenant api so there is a single implementation.

type RentTerm = { term: number; total?: { charges?: number } };
type ChargeLine = { label?: string; amount?: number; recoverable?: boolean };
type Member = { tenantId: string; sharePercent?: number };

const round = (value: number) => Math.round((value || 0) * 100) / 100;

// Provisions "appelées" (called, not paid) over the period: sum of each rent
// term's charges when the term falls within [periodStart, periodEnd]. A rent
// term is a YYYYMMDDHH number.
export function provisionsCalledInPeriod(
  rents: RentTerm[] = [],
  periodStart?: Date | string,
  periodEnd?: Date | string
): number {
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
export function recoverableTotal(lines: ChargeLine[] = []): number {
  return round(
    (lines || [])
      .filter((line) => line.recoverable)
      .reduce((sum, line) => sum + (line.amount || 0), 0)
  );
}

// balance > 0 means a credit to the tenant (they over-paid), balance < 0 means
// the tenant owes a complement.
export function computeRegularization(
  rents: RentTerm[] = [],
  lines: ChargeLine[] = [],
  periodStart?: Date | string,
  periodEnd?: Date | string
) {
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
export function regularizationAdjustment(
  balance: number,
  vatRate?: number
): { type: 'debt' | 'discount'; amount: number } | null {
  if (!balance) {
    return null;
  }
  const factor = vatRate ? 1 / (1 + vatRate) : 1;
  if (balance < 0) {
    return { type: 'debt', amount: round(Math.abs(balance) * factor) };
  }
  return { type: 'discount', amount: round(balance * factor) };
}

// Equal shares for n members, in percent, summing to exactly 100. The leading
// members absorb the rounding remainder (e.g. 3 => [33.34, 33.33, 33.33]).
export function equalShares(n: number): number[] {
  if (!n || n <= 0) {
    return [];
  }
  const per = Math.floor(10000 / n); // basis points of a percent
  let remainder = 10000 - per * n;
  return Array.from({ length: n }, () => {
    const bump = remainder > 0 ? 1 : 0;
    remainder -= bump;
    return (per + bump) / 100;
  });
}

// Split an amount across the given percents (largest-remainder method) so the
// parts sum exactly to the amount. Returns one amount per share, in order.
export function splitByShares(
  amount: number,
  sharePercents: number[] = []
): number[] {
  const shares = sharePercents || [];
  if (!shares.length) {
    return [];
  }
  const totalCents = Math.round((amount || 0) * 100);
  const raw = shares.map((percent) => (totalCents * (percent || 0)) / 100);
  const floors = raw.map((value) => Math.floor(value));
  const distributed = floors.reduce((sum, value) => sum + value, 0);
  let remainder = totalCents - distributed;

  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);
  const cents = [...floors];
  for (let i = 0; i < order.length && remainder > 0; i += 1) {
    cents[order[i].index] += 1;
    remainder -= 1;
  }
  return cents.map((value) => round(value / 100));
}

// True when the percents add up to 100 (within a rounding tolerance).
export function sharesAreComplete(sharePercents: number[] = []): boolean {
  const total = (sharePercents || []).reduce(
    (sum, percent) => sum + (percent || 0),
    0
  );
  return Math.abs(total - 100) < 0.01;
}

// Split common charge lines across colocation members by their quote-part.
// Returns a map tenantId -> lines, each member getting its share of every line
// (label and recoverable flag preserved).
export function splitCommonCharges(
  lines: ChargeLine[] = [],
  members: Member[] = []
): Record<string, ChargeLine[]> {
  const list = members || [];
  const shares = list.map((member) => member.sharePercent || 0);
  const byTenant: Record<string, ChargeLine[]> = {};
  list.forEach((member) => {
    byTenant[member.tenantId] = [];
  });
  (lines || []).forEach((line) => {
    const parts = splitByShares(line.amount || 0, shares);
    list.forEach((member, index) => {
      byTenant[member.tenantId].push({
        label: line.label,
        amount: parts[index],
        recoverable: line.recoverable !== false
      });
    });
  });
  return byTenant;
}
