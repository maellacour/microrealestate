// Quote-part helpers for colocations. Percents carry 2 decimals; splits are
// computed in cents so the parts always add back up to the whole (no lost or
// duplicated cent from rounding).

const round = (value) => Math.round((value || 0) * 100) / 100;

// Equal shares for n members, in percent, summing to exactly 100. The leading
// members absorb the rounding remainder (e.g. 3 => [33.34, 33.33, 33.33]).
export function equalShares(n) {
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
export function splitByShares(amount, sharePercents) {
  const shares = sharePercents || [];
  if (!shares.length) {
    return [];
  }
  const totalCents = Math.round((amount || 0) * 100);
  const raw = shares.map((percent) => (totalCents * (percent || 0)) / 100);
  const floors = raw.map((value) => Math.floor(value));
  let distributed = floors.reduce((sum, value) => sum + value, 0);
  let remainder = totalCents - distributed;

  // hand the leftover cents to the largest fractional parts first
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
export function sharesAreComplete(sharePercents) {
  const total = (sharePercents || []).reduce(
    (sum, percent) => sum + (percent || 0),
    0
  );
  return Math.abs(total - 100) < 0.01;
}

// Split common charge lines across colocation members by their quote-part.
// Returns a map tenantId -> lines, each member getting its share of every line
// (label and recoverable flag preserved). Shares of a single line always add
// back up to that line's amount.
export function splitCommonCharges(lines, members) {
  const list = members || [];
  const shares = list.map((member) => member.sharePercent);
  const byTenant = {};
  list.forEach((member) => {
    byTenant[member.tenantId] = [];
  });
  (lines || []).forEach((line) => {
    const parts = splitByShares(line.amount, shares);
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
