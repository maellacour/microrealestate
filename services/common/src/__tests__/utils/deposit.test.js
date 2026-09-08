/* eslint-env node, mocha */
// Test the compiled output (the source is TypeScript with no Jest transform
// configured); deposit exposes named exports, imported here as a namespace.
import * as Deposit from '../../../dist/utils/deposit.js';
import moment from 'moment';

const date = (str) => moment(str, 'DD/MM/YYYY').toDate();

describe('depositInfo', () => {
  it('is notApplicable while the lease is still running', () => {
    const info = Deposit.depositInfo({ guaranty: 1000, leaseEnd: null });
    expect(info.status).toEqual('notApplicable');
    expect(info.dueDate).toBeNull();
    expect(info.remaining).toEqual(1000);
  });

  it('is notApplicable when there is no deposit', () => {
    const info = Deposit.depositInfo({
      guaranty: 0,
      leaseEnd: date('31/03/2024')
    });
    expect(info.status).toEqual('notApplicable');
  });

  it('sets the due date two months after the lease end', () => {
    const info = Deposit.depositInfo(
      { guaranty: 1000, leaseEnd: date('31/03/2024') },
      moment('01/04/2024', 'DD/MM/YYYY')
    );
    expect(moment(info.dueDate).format('DD/MM/YYYY')).toEqual('31/05/2024');
    expect(Deposit.DEPOSIT_REFUND_DELAY_MONTHS).toEqual(2);
  });

  it('is pending before the deadline when not refunded', () => {
    const info = Deposit.depositInfo(
      { guaranty: 1000, leaseEnd: date('31/03/2024') },
      moment('01/05/2024', 'DD/MM/YYYY')
    );
    expect(info.status).toEqual('pending');
    expect(info.remaining).toEqual(1000);
  });

  it('is overdue past the deadline when not refunded', () => {
    const info = Deposit.depositInfo(
      { guaranty: 1000, leaseEnd: date('31/03/2024') },
      moment('01/06/2024', 'DD/MM/YYYY')
    );
    expect(info.status).toEqual('overdue');
  });

  it('is settled once a refund date is recorded', () => {
    const info = Deposit.depositInfo(
      {
        guaranty: 1000,
        guarantyPayback: 800,
        guarantyPaybackDate: date('15/04/2024'),
        leaseEnd: date('31/03/2024')
      },
      moment('01/06/2024', 'DD/MM/YYYY')
    );
    expect(info.status).toEqual('settled');
    expect(info.remaining).toEqual(200);
  });

  it('is settled when the deposit is fully refunded even without a date', () => {
    const info = Deposit.depositInfo(
      { guaranty: 1000, guarantyPayback: 1000, leaseEnd: date('31/03/2024') },
      moment('01/05/2024', 'DD/MM/YYYY')
    );
    expect(info.status).toEqual('settled');
    expect(info.remaining).toEqual(0);
  });

  it('computes the remaining amount to refund', () => {
    const info = Deposit.depositInfo({
      guaranty: 1000,
      guarantyPayback: 300,
      leaseEnd: date('31/03/2024')
    });
    expect(info.remaining).toEqual(700);
  });
});

// Rents can be settled with a payment of type `deposit` (a "deposit retention":
// the landlord keeps the amount out of the security deposit instead of cashing
// a transfer). That money has already left the deposit, so it must not be
// counted as still owed to the tenant.
describe('depositInfo with deposit retentions', () => {
  it('subtracts the retentions from the amount left to refund', () => {
    const info = Deposit.depositInfo({
      guaranty: 1000,
      guarantyPayback: 0,
      retained: 500,
      leaseEnd: date('31/03/2024')
    });
    expect(info.remaining).toEqual(500);
  });

  it('subtracts both the retentions and what was already paid back', () => {
    const info = Deposit.depositInfo({
      guaranty: 1000,
      guarantyPayback: 200,
      retained: 500,
      leaseEnd: date('31/03/2024')
    });
    expect(info.remaining).toEqual(300);
  });

  it('is settled once the deposit is entirely consumed by retentions', () => {
    const info = Deposit.depositInfo(
      {
        guaranty: 1000,
        guarantyPayback: 0,
        retained: 1000,
        leaseEnd: date('31/03/2024')
      },
      moment('01/06/2024', 'DD/MM/YYYY')
    );
    expect(info.remaining).toEqual(0);
    expect(info.status).toEqual('settled');
  });

  it('never reports a negative amount left to refund', () => {
    const info = Deposit.depositInfo({
      guaranty: 1000,
      guarantyPayback: 800,
      retained: 400,
      leaseEnd: date('31/03/2024')
    });
    expect(info.remaining).toEqual(0);
  });
});

describe('retainedAmount', () => {
  const rent = (payments) => ({ payments });

  it('is zero without rents', () => {
    expect(Deposit.retainedAmount()).toEqual(0);
    expect(Deposit.retainedAmount([])).toEqual(0);
    expect(Deposit.retainedAmount([{}])).toEqual(0);
  });

  it('only sums the payments settled out of the deposit', () => {
    const rents = [
      rent([
        { type: 'transfer', amount: 700 },
        { type: 'deposit', amount: 300 }
      ]),
      rent([{ type: 'cheque', amount: 1000 }]),
      rent([{ type: 'deposit', amount: 200 }])
    ];
    expect(Deposit.retainedAmount(rents)).toEqual(500);
  });
});
