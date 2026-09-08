import * as utils from '../index.js';
import { Collections, Service } from '@microrealestate/common';
import fileUrl from 'file-url';
import moment from 'moment';
import path from 'path';
import { sanitize } from '../../src/utils/index.js';

const round = (value) => Math.round((value || 0) * 100) / 100;

export async function get(params) {
  const { TEMPLATES_DIRECTORY } = Service.getInstance().envConfig.getValues();

  // params.id is the tenant, params.term carries the regularization id. Force
  // the term filter to empty so getRentsData returns every rent term (we need
  // them all to sum the provisions called over the period).
  const regularizationId = params.term;
  const data = await utils.getRentsData({ ...params, term: '' });

  if (!data || !data.tenant) {
    throw new Error(
      `data not found to generate document charge_regularization with id=${params.id}`
    );
  }

  const regularization = await Collections.ChargeRegularization.findOne({
    _id: regularizationId,
    realmId: data.landlord._id
  }).lean();

  if (!regularization) {
    throw new Error(`charge regularization ${regularizationId} not found`);
  }

  const start = moment(regularization.periodStart).startOf('day');
  const end = moment(regularization.periodEnd).endOf('day');

  // Provisions called over the period: sum of each term's charges when the
  // term falls inside [periodStart, periodEnd].
  const provisionsCalled = round(
    (data.tenant.rents || []).reduce((sum, rent) => {
      const termMoment = moment(String(rent.term), 'YYYYMMDDHH');
      if (termMoment.isBetween(start, end, undefined, '[]')) {
        return sum + ((rent.total && rent.total.charges) || 0);
      }
      return sum;
    }, 0)
  );

  // Only recoverable lines are shown to the tenant.
  const lines = (regularization.lines || [])
    .filter((line) => line.recoverable)
    .map((line) => ({ label: line.label, amount: round(line.amount) }));
  const recoverableTotal = round(
    lines.reduce((sum, line) => sum + line.amount, 0)
  );
  // balance > 0: provisions exceeded real charges -> credit to the tenant.
  // balance < 0: real charges exceeded provisions -> complement due.
  const balance = round(provisionsCalled - recoverableTotal);

  data.regularization = {
    periodStart: start.format('DD/MM/YYYY'),
    periodEnd: end.format('DD/MM/YYYY'),
    lines,
    provisionsCalled,
    recoverableTotal,
    balance,
    isCredit: balance > 0,
    absBalance: Math.abs(balance),
    note: (regularization.note || '').trim()
  };
  data.today = moment().format('DD/MM/YYYY');
  data.fileName = sanitize(`${data.tenant.name}-regularisation-charges`);
  data.cssUrl = fileUrl(path.join(TEMPLATES_DIRECTORY, 'css', 'print.css'));
  data.logoUrl = fileUrl(path.join(TEMPLATES_DIRECTORY, 'img', 'logo.png'));

  return data;
}
