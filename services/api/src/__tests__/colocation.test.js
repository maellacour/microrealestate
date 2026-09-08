/* eslint-env node, jest */
import {
  equalShares,
  sharesAreComplete,
  splitByShares,
  splitCommonCharges
} from '@microrealestate/common/dist/utils/charges.js';

const sum = (arr) => Math.round(arr.reduce((s, v) => s + v, 0) * 100) / 100;

describe('colocation — equal shares', () => {
  it('splits evenly when it divides cleanly', () => {
    expect(equalShares(4)).toEqual([25, 25, 25, 25]);
  });

  it('absorbs the rounding remainder on the leading members', () => {
    expect(equalShares(3)).toEqual([33.34, 33.33, 33.33]);
    expect(sum(equalShares(3))).toEqual(100);
  });

  it('handles a single member and none', () => {
    expect(equalShares(1)).toEqual([100]);
    expect(equalShares(0)).toEqual([]);
  });
});

describe('colocation — split an amount by shares', () => {
  it('splits an even amount evenly', () => {
    expect(splitByShares(100, [50, 50])).toEqual([50, 50]);
  });

  it('keeps the parts summing exactly to the amount', () => {
    const parts = splitByShares(10, [33.33, 33.33, 33.34]);
    expect(sum(parts)).toEqual(10);
    expect(parts).toEqual([3.33, 3.33, 3.34]);
  });

  it('distributes leftover cents to the largest fractions', () => {
    const parts = splitByShares(100, [33.34, 33.33, 33.33]);
    expect(sum(parts)).toEqual(100);
  });

  it('returns nothing without shares', () => {
    expect(splitByShares(100, [])).toEqual([]);
  });
});

describe('colocation — split common charges', () => {
  const members = [
    { tenantId: 'A', sharePercent: 50 },
    { tenantId: 'B', sharePercent: 50 }
  ];

  it('splits each line by member share, preserving label and flag', () => {
    const split = splitCommonCharges(
      [
        { label: 'condo', amount: 800, recoverable: true },
        { label: 'insurance', amount: 200, recoverable: false }
      ],
      members
    );
    expect(split.A).toEqual([
      { label: 'condo', amount: 400, recoverable: true },
      { label: 'insurance', amount: 100, recoverable: false }
    ]);
    expect(split.B).toEqual([
      { label: 'condo', amount: 400, recoverable: true },
      { label: 'insurance', amount: 100, recoverable: false }
    ]);
  });

  it('keeps each line summing to its amount with uneven shares', () => {
    const split = splitCommonCharges(
      [{ label: 'water', amount: 100 }],
      [
        { tenantId: 'A', sharePercent: 33.33 },
        { tenantId: 'B', sharePercent: 33.33 },
        { tenantId: 'C', sharePercent: 33.34 }
      ]
    );
    const total = split.A[0].amount + split.B[0].amount + split.C[0].amount;
    expect(Math.round(total * 100) / 100).toEqual(100);
    expect(split.A[0].recoverable).toBe(true); // defaults to recoverable
  });
});

describe('colocation — shares completeness', () => {
  it('accepts shares that add up to 100', () => {
    expect(sharesAreComplete([50, 50])).toBe(true);
    expect(sharesAreComplete(equalShares(3))).toBe(true);
  });

  it('rejects shares that do not add up to 100', () => {
    expect(sharesAreComplete([50, 49])).toBe(false);
  });
});
