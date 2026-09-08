import * as Express from 'express';
import { Collections, logger, ServiceError } from '@microrealestate/common';
import { CollectionTypes, UserServicePrincipal } from '@microrealestate/types';
import moment from 'moment';

const round = (value: number) => Math.round((value || 0) * 100) / 100;

// Provisions called over the period: sum of each rent term's charges when the
// term (a YYYYMMDDHH number) falls within [periodStart, periodEnd].
function provisionsCalledInPeriod(
  rents: CollectionTypes.PartRent[] = [],
  periodStart: Date,
  periodEnd: Date
) {
  const start = moment(periodStart).startOf('day');
  const end = moment(periodEnd).endOf('day');
  return round(
    rents.reduce((sum, rent) => {
      const termMoment = moment(String(rent.term), 'YYYYMMDDHH');
      if (termMoment.isBetween(start, end, undefined, '[]')) {
        return sum + ((rent.total && rent.total.charges) || 0);
      }
      return sum;
    }, 0)
  );
}

// Returns the charge regularizations the landlord has shared with this tenant.
// Only recoverable lines are exposed, matching the tenant statement.
export async function getSharedChargeRegularizations(
  request: Express.Request,
  response: Express.Response
) {
  const email = (request as unknown as { user?: UserServicePrincipal }).user
    ?.email;
  if (!email) {
    logger.error('missing email field');
    throw new ServiceError('unauthorized', 401);
  }
  const tenantId = request.params.tenantId;

  const tenant = await Collections.Tenant.findOne({
    _id: tenantId,
    'contacts.email': { $regex: new RegExp(email, 'i') }
  }).lean();
  if (!tenant) {
    throw new ServiceError('tenant not found', 404);
  }

  const regularizations = await Collections.ChargeRegularization.find({
    tenantId: tenant._id,
    realmId: tenant.realmId,
    shared: true
  })
    .sort({ periodEnd: -1 })
    .lean();

  const results = regularizations.map((regularization) => {
    const lines = (regularization.lines || [])
      .filter((line) => line.recoverable)
      .map((line) => ({ label: line.label, amount: round(line.amount) }));
    const recoverableTotal = round(
      lines.reduce((sum, line) => sum + line.amount, 0)
    );
    const provisionsCalled = provisionsCalledInPeriod(
      tenant.rents,
      regularization.periodStart,
      regularization.periodEnd
    );
    return {
      id: regularization._id,
      periodStart: regularization.periodStart,
      periodEnd: regularization.periodEnd,
      lines,
      provisionsCalled,
      recoverableTotal,
      balance: round(provisionsCalled - recoverableTotal),
      note: regularization.note || ''
    };
  });

  response.json({ results });
}
