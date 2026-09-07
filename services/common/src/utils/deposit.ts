import moment from 'moment';

// French law: the security deposit (dépôt de garantie) must be returned within
// 1 month when the exit inventory matches the entry one, or 2 months otherwise.
// We use the 2-month legal maximum as the default deadline.
export const DEPOSIT_REFUND_DELAY_MONTHS = 2;

// Payment type recording a rent settled out of the security deposit: the
// landlord kept the amount instead of cashing a transfer.
const DEPOSIT_RETENTION_PAYMENT_TYPE = 'deposit';

export type DepositStatus = 'notApplicable' | 'pending' | 'overdue' | 'settled';

export type DepositInput = {
  guaranty?: number | null;
  guarantyPayback?: number | null;
  guarantyPaybackDate?: moment.MomentInput;
  retained?: number | null;
  leaseEnd?: moment.MomentInput;
};

export type DepositInfo = {
  // Deposit agreed in the lease.
  due: number;
  // Part already applied to rents as deposit retentions.
  retained: number;
  // Part already paid back to the tenant.
  refunded: number;
  // What the landlord still holds, hence what is still to be refunded. Never
  // negative: refunding more than the deposit is a data entry mistake, not a
  // debt of the tenant.
  remaining: number;
  // Legal deadline to refund, or null while the lease runs.
  dueDate: Date | null;
  status: DepositStatus;
};

type RentPaymentLike = { type?: string; amount?: number };
type RentLike = { payments?: RentPaymentLike[] | null };

const round = (value: number) => Math.round(value * 100) / 100;

// Sums the rents settled out of the deposit over the whole lease. Callers
// holding an aggregation result rather than the rents pass the total straight
// to `depositInfo` instead.
export function retainedAmount(rents?: RentLike[] | null): number {
  return round(
    (rents || []).reduce(
      (total, rent) =>
        (rent?.payments || []).reduce(
          (rentTotal, payment) =>
            payment?.type === DEPOSIT_RETENTION_PAYMENT_TYPE
              ? rentTotal + (payment.amount || 0)
              : rentTotal,
          total
        ),
      0
    )
  );
}

// Computes the state of a tenant's security deposit: what is left of it and,
// once the lease has ended, whether it has been refunded in time.
//
// `leaseEnd` is the effective end of the lease (terminationDate || endDate), or
// null while the lease is still running. `guarantyPaybackDate`, when set, marks
// the deposit as settled (a landlord keeping the whole deposit records the date
// with a zero payback).
export function depositInfo(
  {
    guaranty,
    guarantyPayback,
    guarantyPaybackDate,
    retained,
    leaseEnd
  }: DepositInput = {},
  today: moment.Moment = moment()
): DepositInfo {
  const due = guaranty || 0;
  const withheld = retained || 0;
  const refunded = guarantyPayback || 0;
  const remaining = Math.max(0, round(due - withheld - refunded));

  const end = leaseEnd && moment(leaseEnd).isValid() ? moment(leaseEnd) : null;
  const dueDate = end
    ? moment(end).add(DEPOSIT_REFUND_DELAY_MONTHS, 'months')
    : null;

  const settled =
    (!!guarantyPaybackDate && moment(guarantyPaybackDate).isValid()) ||
    (due > 0 && remaining <= 0);

  let status: DepositStatus = 'notApplicable';
  if (end && due > 0) {
    if (settled) {
      status = 'settled';
    } else if (dueDate && today.isAfter(dueDate, 'day')) {
      status = 'overdue';
    } else {
      status = 'pending';
    }
  }

  return {
    due,
    retained: withheld,
    refunded,
    remaining,
    dueDate: dueDate ? dueDate.toDate() : null,
    status
  };
}
