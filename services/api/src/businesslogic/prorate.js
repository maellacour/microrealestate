import moment from 'moment';

const UNIT_BY_FREQUENCY = {
  hours: 'hour',
  days: 'day',
  weeks: 'week',
  months: 'month',
  years: 'year'
};

export function round2(amount) {
  return Math.round((amount || 0) * 100) / 100;
}

// Fraction (0..1) of a rent term actually occupied, counted in whole calendar
// days. Used to prorate the first and last partial periods so that a tenant
// entering or leaving mid-term is billed pro rata temporis (loyer au prorata).
//
// `entry` / `exit` are the effective occupancy bounds for the property on this
// term (already clamped to any early termination by the caller). A full period
// returns exactly 1, so full terms are billed unchanged.
export function occupancyFraction(currentMoment, frequency, entry, exit) {
  const unit = UNIT_BY_FREQUENCY[frequency] || 'month';

  // Sub-day frequencies are atomic — never prorated.
  if (unit === 'hour' || unit === 'day') {
    return 1;
  }

  const termStart = moment(currentMoment).startOf(unit);
  const termEnd = moment(currentMoment).endOf(unit);
  const occupancyStart = moment.max(termStart, moment(entry).startOf('day'));
  const occupancyEnd = moment.min(termEnd, moment(exit).endOf('day'));

  if (occupancyEnd.isBefore(occupancyStart)) {
    return 0;
  }

  const daysInTerm = termEnd.diff(termStart, 'days') + 1;
  const daysOccupied = occupancyEnd.diff(occupancyStart, 'days') + 1;

  return Math.min(1, Math.max(0, daysOccupied / daysInTerm));
}
