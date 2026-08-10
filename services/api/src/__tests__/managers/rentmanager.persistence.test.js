/* eslint-env node, mocha */
import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Import the real Mongoose collections directly (bypassing
// @microrealestate/common's main entry point, which pulls in
// express-winston/winston and breaks under jest's ESM runner).
// This gives us the real Tenant schema so casting behaves exactly
// as it does in production.
const Collections = await import(
  '@microrealestate/common/dist/collections/index.js'
);

// No live MongoDB connection is available in this test: disable command
// buffering so operations fail fast (a MongooseError) instead of hanging
// for bufferTimeoutMS once schema casting has succeeded. This lets us
// assert on *which* error is thrown - a CastError means the update
// document didn't survive schema casting, anything else means casting
// passed and the (unreachable) database was actually contacted.
mongoose.set('bufferCommands', false);

jest.unstable_mockModule('@microrealestate/common', () => ({
  Collections,
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  Service: {
    getInstance: () => ({
      envConfig: {
        getValues: () => ({
          EMAILER_URL: 'http://emailer.test',
          DEMO_MODE: true
        })
      }
    })
  },
  ServiceError: class ServiceError extends Error {}
}));

jest.unstable_mockModule('axios', () => ({
  default: {
    get: jest.fn().mockRejectedValue(new Error('unreachable in test'))
  }
}));

const RentManager = await import('../../managers/rentmanager.js');
const Contract = await import('../../managers/contract.js');

// Demo-data-shaped fixture: properties[].property is a fully embedded
// Property sub-document (not a ref) and properties[].entryDate/exitDate
// are plain 'DD/MM/YYYY' strings, exactly like the seeded demo dataset
// that triggered the original CastError.
function buildTenantFixture() {
  const begin = '2016-01-01T00:00:00';
  const end = '2024-12-31T23:59:59';
  const generated = Contract.create({
    begin: Date.parse(begin),
    end: Date.parse(end),
    frequency: 'months',
    properties: [{ rent: 5000 }]
  });

  return {
    _id: '507f1f77bcf86cd799439011',
    realmId: '507f1f77bcf86cd799439012',
    name: 'GOOGLE FRANCE',
    frequency: 'months',
    beginDate: begin,
    endDate: end,
    discount: 0,
    vatRatio: 0,
    rents: generated.rents,
    properties: [
      {
        propertyId: '507f1f77bcf86cd799439013',
        entryDate: '01/01/2016',
        exitDate: '31/12/2024',
        property: {
          _id: '507f1f77bcf86cd799439013',
          realmId: '507f1f77bcf86cd799439012',
          name: 'Office 1',
          type: 'office'
        },
        rent: 5000,
        expenses: []
      }
    ]
  };
}

describe('rentmanager payment persistence', () => {
  const term = '2024120100';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not throw a CastError when recording a payment against demo-shaped embedded properties', async () => {
    const fixture = buildTenantFixture();
    jest
      .spyOn(Collections.Tenant, 'findOne')
      .mockReturnValue({ lean: () => Promise.resolve(fixture) });

    const req = {
      realm: { _id: fixture.realmId },
      params: { term },
      headers: {},
      body: { _id: fixture._id, payments: [{ amount: 5000, type: 'cheque' }] }
    };
    const res = { json: jest.fn() };

    let caughtError;
    try {
      await RentManager.updateByTerm(req, res);
    } catch (error) {
      caughtError = error;
    }

    // Without a live DB the update ultimately can't complete, but the
    // failure must come from the (unreachable) network layer, never from
    // Mongoose failing to cast the update document.
    expect(caughtError).not.toBeInstanceOf(mongoose.Error.CastError);
  });

  it('characterizes the bug: replacing the whole lean document throws a CastError on embedded properties', async () => {
    const fixture = buildTenantFixture();

    await expect(
      Collections.Tenant.findOneAndUpdate(
        { _id: fixture._id, realmId: fixture.realmId },
        fixture,
        { new: true }
      ).lean()
    ).rejects.toBeInstanceOf(mongoose.Error.CastError);
  });
});
