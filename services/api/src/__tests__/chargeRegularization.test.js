/* eslint-env node, jest */
import * as Contract from '../managers/contract.js';
import * as CR from '@microrealestate/common/dist/utils/charges.js';
import moment from 'moment';

// A plain monthly contract: rent 300 + 50 charges per term, no VAT, no
// discount. One full year => 12 terms, each with total.charges === 50.
const buildYearlyContract = (vatRate = 0) =>
  Contract.create({
    frequency: 'months',
    begin: '01/01/2017',
    end: '31/12/2017',
    discount: 0,
    vatRate,
    properties: [
      {
        entryDate: moment('01/01/2017', 'DD/MM/YYYY').toDate(),
        exitDate: moment('31/12/2017', 'DD/MM/YYYY').toDate(),
        property: { name: 'flat', price: 300 },
        rent: 300,
        expenses: [{ title: 'charges', amount: 50 }]
      }
    ]
  });

describe('charge regularization — pure computation', () => {
  const contract = buildYearlyContract();

  it('sums the provisions called over the period', () => {
    const provisions = CR.provisionsCalledInPeriod(
      contract.rents,
      '2017-01-01',
      '2017-12-31'
    );
    expect(provisions).toEqual(600); // 12 x 50
  });

  it('excludes terms outside the period', () => {
    const provisions = CR.provisionsCalledInPeriod(
      contract.rents,
      '2017-01-01',
      '2017-06-30'
    );
    expect(provisions).toEqual(300); // 6 x 50
  });

  it('returns 0 when the period is missing or empty', () => {
    expect(CR.provisionsCalledInPeriod(contract.rents, null, null)).toEqual(0);
    expect(CR.provisionsCalledInPeriod([], '2017-01-01', '2017-12-31')).toEqual(
      0
    );
  });

  it('totals only the recoverable lines', () => {
    const lines = [
      { label: 'condo', amount: 500, recoverable: true },
      { label: 'property tax', amount: 900, recoverable: false },
      { label: 'water', amount: 100, recoverable: true }
    ];
    expect(CR.recoverableTotal(lines)).toEqual(600);
  });

  it('computes a credit balance when provisions exceed recoverable charges', () => {
    const result = CR.computeRegularization(
      contract.rents,
      [{ label: 'condo', amount: 500, recoverable: true }],
      '2017-01-01',
      '2017-12-31'
    );
    expect(result).toEqual({
      provisionsCalled: 600,
      recoverableTotal: 500,
      balance: 100 // credit to the tenant
    });
  });

  it('computes a complement due when recoverable charges exceed provisions', () => {
    const result = CR.computeRegularization(
      contract.rents,
      [{ label: 'condo', amount: 800, recoverable: true }],
      '2017-01-01',
      '2017-12-31'
    );
    expect(result.balance).toEqual(-200); // tenant owes 200
  });
});

describe('charge regularization — adjustment description', () => {
  it('turns a negative balance into a debt', () => {
    expect(CR.regularizationAdjustment(-200, 0)).toEqual({
      type: 'debt',
      amount: 200
    });
  });

  it('turns a positive balance into a settlement discount', () => {
    expect(CR.regularizationAdjustment(100, 0)).toEqual({
      type: 'discount',
      amount: 100
    });
  });

  it('returns null for a zero balance', () => {
    expect(CR.regularizationAdjustment(0, 0)).toBeNull();
  });

  it('stores the amount pre-VAT', () => {
    // 200 inc. VAT at 20% => 166.67 stored pre-VAT
    expect(CR.regularizationAdjustment(-200, 0.2)).toEqual({
      type: 'debt',
      amount: 166.67
    });
  });
});

describe('charge regularization — posting on a rent term (payTerm)', () => {
  const FEB = Number(moment('01/02/2017', 'DD/MM/YYYY').format('YYYYMMDDHH'));

  const grandTotalOf = (contract, term) =>
    contract.rents.find((r) => r.term === term).total.grandTotal;

  it('a debt raises the target term grand total by its amount', () => {
    const contract = buildYearlyContract();
    const before = grandTotalOf(contract, FEB);

    Contract.payTerm(contract, FEB, {
      payments: [],
      debts: [{ description: 'Régularisation des charges', amount: 200 }],
      discounts: [],
      description: ''
    });

    const after = grandTotalOf(contract, FEB);
    expect(Math.round((after - before) * 100) / 100).toEqual(200);
    expect(
      contract.rents
        .find((r) => r.term === FEB)
        .debts.some((d) => d.amount === 200)
    ).toBe(true);
  });

  it('a settlement discount lowers the target term grand total by its amount', () => {
    const contract = buildYearlyContract();
    const before = grandTotalOf(contract, FEB);

    Contract.payTerm(contract, FEB, {
      payments: [],
      debts: [],
      discounts: [
        {
          origin: 'settlement',
          description: 'Régularisation des charges',
          amount: 100
        }
      ],
      description: ''
    });

    const after = grandTotalOf(contract, FEB);
    expect(Math.round((before - after) * 100) / 100).toEqual(100);
  });
});
