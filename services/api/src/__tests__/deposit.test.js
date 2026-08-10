/* eslint-env node, mocha */
import {
  DEPOSIT_REFUND_DELAY_MONTHS,
  depositRefundInfo
} from '../businesslogic/deposit.js';
import moment from 'moment';

const date = (str) => moment(str, 'DD/MM/YYYY').toDate();

describe('depositRefundInfo', () => {
  it('is notApplicable while the lease is still running', () => {
    const info = depositRefundInfo({ guaranty: 1000, leaseEnd: null });
    expect(info.status).toEqual('notApplicable');
    expect(info.dueDate).toBeNull();
    expect(info.remaining).toEqual(1000);
  });

  it('is notApplicable when there is no deposit', () => {
    const info = depositRefundInfo({
      guaranty: 0,
      leaseEnd: date('31/03/2024')
    });
    expect(info.status).toEqual('notApplicable');
  });

  it('sets the due date two months after the lease end', () => {
    const info = depositRefundInfo(
      { guaranty: 1000, leaseEnd: date('31/03/2024') },
      moment('01/04/2024', 'DD/MM/YYYY')
    );
    expect(moment(info.dueDate).format('DD/MM/YYYY')).toEqual('31/05/2024');
    expect(DEPOSIT_REFUND_DELAY_MONTHS).toEqual(2);
  });

  it('is pending before the deadline when not refunded', () => {
    const info = depositRefundInfo(
      { guaranty: 1000, leaseEnd: date('31/03/2024') },
      moment('01/05/2024', 'DD/MM/YYYY')
    );
    expect(info.status).toEqual('pending');
    expect(info.remaining).toEqual(1000);
  });

  it('is overdue past the deadline when not refunded', () => {
    const info = depositRefundInfo(
      { guaranty: 1000, leaseEnd: date('31/03/2024') },
      moment('01/06/2024', 'DD/MM/YYYY')
    );
    expect(info.status).toEqual('overdue');
  });

  it('is settled once a refund date is recorded', () => {
    const info = depositRefundInfo(
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
    const info = depositRefundInfo(
      { guaranty: 1000, guarantyPayback: 1000, leaseEnd: date('31/03/2024') },
      moment('01/05/2024', 'DD/MM/YYYY')
    );
    expect(info.status).toEqual('settled');
    expect(info.remaining).toEqual(0);
  });

  it('computes the remaining amount to refund', () => {
    const info = depositRefundInfo({
      guaranty: 1000,
      guarantyPayback: 300,
      leaseEnd: date('31/03/2024')
    });
    expect(info.remaining).toEqual(700);
  });
});
