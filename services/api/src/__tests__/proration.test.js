/* eslint-env node, mocha */
import * as BL from '../businesslogic/index.js';
import * as Contract from '../managers/contract.js';
import { occupancyFraction, round2 } from '../businesslogic/prorate.js';
import moment from 'moment';

const date = (str) => moment(str, 'DD/MM/YYYY').toDate();

describe('occupancyFraction', () => {
  it('is 1 for a fully occupied month', () => {
    const fraction = occupancyFraction(
      moment('01/01/2017', 'DD/MM/YYYY'),
      'months',
      date('01/01/2017'),
      date('31/01/2017')
    );
    expect(fraction).toEqual(1);
  });

  it('prorates a mid-month entry by calendar days', () => {
    // January has 31 days; occupied from the 10th to the 31st = 22 days.
    const fraction = occupancyFraction(
      moment('01/01/2017', 'DD/MM/YYYY'),
      'months',
      date('10/01/2017'),
      date('31/12/2017')
    );
    expect(fraction).toEqual(22 / 31);
  });

  it('prorates a mid-month exit by calendar days', () => {
    // Occupied from the 1st to the 10th = 10 days out of 31.
    const fraction = occupancyFraction(
      moment('01/01/2017', 'DD/MM/YYYY'),
      'months',
      date('01/01/2017'),
      date('10/01/2017')
    );
    expect(fraction).toEqual(10 / 31);
  });

  it('is 0 when the exit is before the entry', () => {
    const fraction = occupancyFraction(
      moment('01/01/2017', 'DD/MM/YYYY'),
      'months',
      date('20/01/2017'),
      date('10/01/2017')
    );
    expect(fraction).toEqual(0);
  });

  it('accounts for the real number of days in the month (February)', () => {
    const fraction = occupancyFraction(
      moment('01/02/2017', 'DD/MM/YYYY'),
      'months',
      date('15/02/2017'),
      date('31/12/2017')
    );
    // 15th to 28th inclusive = 14 days out of 28.
    expect(fraction).toEqual(14 / 28);
  });

  it('never prorates atomic day/hour frequencies', () => {
    expect(
      occupancyFraction(
        moment('01/01/2017', 'DD/MM/YYYY'),
        'days',
        date('01/01/2017'),
        date('31/12/2017')
      )
    ).toEqual(1);
    expect(
      occupancyFraction(
        moment('01/01/2017', 'DD/MM/YYYY'),
        'hours',
        date('01/01/2017'),
        date('31/12/2017')
      )
    ).toEqual(1);
  });
});

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(212.903)).toEqual(212.9);
    expect(round2(96.774)).toEqual(96.77);
    expect(round2(undefined)).toEqual(0);
  });
});

describe('computeRent proration', () => {
  const oneProperty = (overrides = {}) => ({
    entryDate: date('01/01/2017'),
    exitDate: date('31/12/2017'),
    property: { name: 'appartement', price: 300 },
    rent: 300,
    expenses: [],
    ...overrides
  });

  it('prorates the rent for a mid-month entry', () => {
    const contract = {
      begin: '01/01/2017',
      end: '31/12/2017',
      frequency: 'months',
      properties: [oneProperty({ entryDate: date('10/01/2017') })]
    };
    const rent = BL.computeRent(contract, '01/01/2017');
    expect(rent.preTaxAmounts[0].amount).toEqual(round2((300 * 22) / 31));
    expect(rent.total.grandTotal).toEqual(round2((300 * 22) / 31));
  });

  it('prorates the rent for a mid-month exit', () => {
    const contract = {
      begin: '01/01/2017',
      end: '31/12/2017',
      frequency: 'months',
      properties: [oneProperty({ exitDate: date('10/01/2017') })]
    };
    const rent = BL.computeRent(contract, '01/01/2017');
    expect(rent.preTaxAmounts[0].amount).toEqual(round2((300 * 10) / 31));
    expect(rent.total.grandTotal).toEqual(round2((300 * 10) / 31));
  });

  it('does NOT prorate a full month (regression guard)', () => {
    const contract = {
      begin: '01/01/2017',
      end: '31/12/2017',
      frequency: 'months',
      properties: [oneProperty()]
    };
    const rent = BL.computeRent(contract, '01/03/2017');
    expect(rent.preTaxAmounts[0].amount).toEqual(300);
    expect(rent.total.grandTotal).toEqual(300);
  });

  it('prorates the last month when the lease is terminated early', () => {
    const contract = {
      begin: '01/01/2017',
      end: '31/12/2017',
      termination: date('10/06/2017'),
      frequency: 'months',
      properties: [oneProperty()]
    };
    const rent = BL.computeRent(contract, '01/06/2017');
    // June has 30 days; occupied 1st to 10th = 10 days.
    expect(rent.preTaxAmounts[0].amount).toEqual(round2((300 * 10) / 30));
    expect(rent.total.grandTotal).toEqual(100);
  });

  it('bills a full month before the termination month', () => {
    const contract = {
      begin: '01/01/2017',
      end: '31/12/2017',
      termination: date('10/06/2017'),
      frequency: 'months',
      properties: [oneProperty()]
    };
    const rent = BL.computeRent(contract, '01/05/2017');
    expect(rent.preTaxAmounts[0].amount).toEqual(300);
  });

  it('prorates charges together with the rent', () => {
    const contract = {
      begin: '01/01/2017',
      end: '31/12/2017',
      frequency: 'months',
      properties: [
        oneProperty({
          entryDate: date('10/01/2017'),
          expenses: [
            {
              title: 'charges',
              amount: 31,
              beginDate: '01/01/2017',
              endDate: '31/12/2017'
            }
          ]
        })
      ]
    };
    const rent = BL.computeRent(contract, '01/01/2017');
    expect(rent.preTaxAmounts[0].amount).toEqual(round2((300 * 22) / 31));
    expect(rent.charges[0].amount).toEqual(22); // 31 * 22/31
    expect(rent.total.grandTotal).toEqual(round2((300 * 22) / 31) + 22);
  });

  it('bills an expense that has no date window on every term', () => {
    const contract = {
      begin: '01/01/2017',
      end: '31/12/2017',
      frequency: 'months',
      properties: [
        oneProperty({ expenses: [{ title: 'general expense', amount: 10 }] })
      ]
    };
    const rent = BL.computeRent(contract, '01/03/2017');
    expect(rent.charges).toHaveLength(1);
    expect(rent.charges[0].amount).toEqual(10);
    expect(rent.total.grandTotal).toEqual(310);
  });
});

describe('Contract.terminate proration end to end', () => {
  const buildContract = () => {
    const begin = date('01/01/2017');
    const end = date('31/12/2017');
    return Contract.create({
      begin,
      end,
      frequency: 'months',
      properties: [
        {
          entryDate: begin,
          exitDate: end,
          property: { name: 'appartement', price: 300 },
          rent: 300,
          expenses: []
        }
      ]
    });
  };

  it('generates twelve full monthly terms before termination', () => {
    const contract = buildContract();
    expect(contract.rents).toHaveLength(12);
    contract.rents.forEach((rent) => {
      expect(rent.preTaxAmounts[0].amount).toEqual(300);
    });
  });

  it('stops at the termination month and prorates it', () => {
    const contract = Contract.terminate(buildContract(), date('10/06/2017'));
    expect(contract.rents).toHaveLength(6); // Jan..Jun
    // Jan..May are full months.
    for (let i = 0; i < 5; i++) {
      expect(contract.rents[i].preTaxAmounts[0].amount).toEqual(300);
    }
    // June is prorated to 10/30 days.
    expect(contract.rents[5].preTaxAmounts[0].amount).toEqual(
      round2((300 * 10) / 30)
    );
  });

  it('bills the termination month in full when terminating on the last day', () => {
    const contract = Contract.terminate(buildContract(), date('30/06/2017'));
    expect(contract.rents).toHaveLength(6);
    expect(contract.rents[5].preTaxAmounts[0].amount).toEqual(300);
  });
});
