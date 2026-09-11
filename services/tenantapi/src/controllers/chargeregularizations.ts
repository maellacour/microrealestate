import * as Express from 'express';
import {
  Charges,
  Collections,
  logger,
  ServiceError
} from '@bayle/common';
import { UserServicePrincipal } from '@bayle/types';

const round = (value: number) => Math.round((value || 0) * 100) / 100;

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
    const { provisionsCalled, recoverableTotal, balance } =
      Charges.computeRegularization(
        tenant.rents,
        regularization.lines,
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
      balance,
      note: regularization.note || ''
    };
  });

  response.json({ results });
}
