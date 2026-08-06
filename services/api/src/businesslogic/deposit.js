import moment from 'moment';

// French law: the security deposit (dépôt de garantie) must be returned within
// 1 month when the exit inventory matches the entry one, or 2 months otherwise.
// We use the 2-month legal maximum as the default deadline.
export const DEPOSIT_REFUND_DELAY_MONTHS = 2;

// Computes deposit-refund tracking for a tenant whose lease has ended.
//
// `leaseEnd` is the effective end of the lease (terminationDate || endDate) as a
// Date/moment, or null when the lease is still running. `guarantyPaybackDate`,
// when set, marks the deposit as settled (a landlord keeping the whole deposit
// records the date with a zero payback).
export function depositRefundInfo(
  { guaranty = 0, guarantyPayback = 0, guarantyPaybackDate, leaseEnd } = {},
  today = moment()
) {
  const held = guaranty || 0;
  const refunded = guarantyPayback || 0;
  const remaining = Math.round((held - refunded) * 100) / 100;

  const end = leaseEnd && moment(leaseEnd).isValid() ? moment(leaseEnd) : null;
  const dueDate = end
    ? moment(end).add(DEPOSIT_REFUND_DELAY_MONTHS, 'months')
    : null;

  const settled =
    (!!guarantyPaybackDate && moment(guarantyPaybackDate).isValid()) ||
    (held > 0 && remaining <= 0);

  let status = 'notApplicable';
  if (end && held > 0) {
    if (settled) {
      status = 'settled';
    } else if (dueDate && today.isAfter(dueDate, 'day')) {
      status = 'overdue';
    } else {
      status = 'pending';
    }
  }

  return {
    held,
    refunded,
    remaining,
    dueDate: dueDate ? dueDate.toDate() : null,
    status
  };
}
