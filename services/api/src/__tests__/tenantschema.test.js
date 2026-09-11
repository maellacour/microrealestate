/* eslint-env node, mocha */

// Import the real Mongoose collections directly (bypassing
// @bayle/common's main entry point, which pulls in
// express-winston/winston and breaks under jest's ESM runner).
const Collections = await import(
  '@bayle/common/dist/collections/index.js'
);

describe('Tenant schema - rent term frequency', () => {
  // The rent code has always read `tenant.frequency`, but the field was absent
  // from the schema, so mongoose's strict mode dropped it on every write and
  // every read fell back to 'months'. A daily contract was then recomputed on a
  // monthly grid the first time a payment was recorded.
  it('persists a non-monthly frequency instead of dropping it', () => {
    const tenant = new Collections.Tenant({
      realmId: '507f1f77bcf86cd799439012',
      name: 'Short stay',
      frequency: 'days'
    });

    expect(tenant.toObject().frequency).toBe('days');
  });

  it('accepts every term length a lease can define', () => {
    ['days', 'weeks', 'months', 'years'].forEach((frequency) => {
      const tenant = new Collections.Tenant({
        realmId: '507f1f77bcf86cd799439012',
        name: 'Tenant',
        frequency
      });

      expect(tenant.validateSync()).toBeUndefined();
      expect(tenant.toObject().frequency).toBe(frequency);
    });
  });

  it('rejects a frequency no lease can produce', () => {
    const tenant = new Collections.Tenant({
      realmId: '507f1f77bcf86cd799439012',
      name: 'Tenant',
      frequency: 'fortnights'
    });

    expect(tenant.validateSync()?.errors?.frequency).toBeDefined();
  });

  it('leaves the field unset on a tenant that never carried one', () => {
    // legacy documents: the read paths keep falling back to 'months' until the
    // migration backfills them from their lease
    const tenant = new Collections.Tenant({
      realmId: '507f1f77bcf86cd799439012',
      name: 'Legacy tenant'
    });

    expect(tenant.toObject().frequency).toBeUndefined();
  });
});

describe('Tenant schema - charges mode', () => {
  it('defaults chargesMode to provisions', () => {
    const tenant = new Collections.Tenant({
      realmId: '507f1f77bcf86cd799439012',
      name: 'Tenant'
    });

    expect(tenant.toObject().chargesMode).toBe('provisions');
  });

  it('accepts forfait', () => {
    const tenant = new Collections.Tenant({
      realmId: '507f1f77bcf86cd799439012',
      name: 'Tenant',
      chargesMode: 'forfait'
    });

    expect(tenant.validateSync()).toBeUndefined();
    expect(tenant.toObject().chargesMode).toBe('forfait');
  });

  it('rejects an unknown charges mode', () => {
    const tenant = new Collections.Tenant({
      realmId: '507f1f77bcf86cd799439012',
      name: 'Tenant',
      chargesMode: 'monthly'
    });

    expect(tenant.validateSync()?.errors?.chargesMode).toBeDefined();
  });
});

describe('ChargeRegularization schema', () => {
  it('defaults shared to false and keeps lines', () => {
    const reg = new Collections.ChargeRegularization({
      realmId: '507f1f77bcf86cd799439012',
      tenantId: '507f1f77bcf86cd799439013',
      periodStart: new Date('2017-01-01'),
      periodEnd: new Date('2017-12-31'),
      lines: [{ label: 'condo', amount: 500, recoverable: true }]
    });

    const obj = reg.toObject();
    expect(obj.shared).toBe(false);
    expect(obj.lines[0].recoverable).toBe(true);
    expect(reg.validateSync()).toBeUndefined();
  });

  it('rejects an unknown applied type', () => {
    const reg = new Collections.ChargeRegularization({
      realmId: '507f1f77bcf86cd799439012',
      tenantId: '507f1f77bcf86cd799439013',
      appliedType: 'refund'
    });

    expect(reg.validateSync()?.errors?.appliedType).toBeDefined();
  });
});
