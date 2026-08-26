import * as utils from '../index.js';
import fileUrl from 'file-url';
import moment from 'moment';
import path from 'path';
import { sanitize } from '../../src/utils/index.js';
import { Service } from '@microrealestate/common';

const round = (value) => Math.round((value || 0) * 100) / 100;

export async function get(params) {
  const { TEMPLATES_DIRECTORY } = Service.getInstance().envConfig.getValues();

  // Force the term filter to empty so getRentsData returns every rent term of
  // the whole lease, not a single month.
  const data = await utils.getRentsData({ ...params, term: '' });

  if (!data || !data.tenant || !data.tenant.rents) {
    throw new Error(
      `data not found to generate document payment_history with id=${params.id}`
    );
  }

  const timeRange = data.tenant.contract.lease?.timeRange;

  const schedule = [];
  const payments = [];
  let totalCharged = 0;
  let totalPaid = 0;

  data.tenant.rents.forEach((rent) => {
    const balance = round(rent.total.balance);
    const grandTotal = round(rent.total.grandTotal);
    const payment = round(rent.total.payment);
    const termDue = round(grandTotal - balance); // this term's own charge
    const newBalance = round(grandTotal - payment); // running balance after term

    schedule.push({
      term: rent.term,
      balance,
      termDue,
      payment,
      newBalance
    });

    totalCharged = round(totalCharged + termDue);
    totalPaid = round(totalPaid + payment);

    (rent.payments || []).forEach((p) => {
      payments.push({
        term: rent.term,
        date: p.date,
        type: p.type,
        reference: p.reference,
        amount: p.amount
      });
    });
  });

  // Sort the received payments chronologically.
  payments.sort(
    (a, b) =>
      moment(a.date, 'DD/MM/YYYY').valueOf() -
      moment(b.date, 'DD/MM/YYYY').valueOf()
  );

  const contract = data.tenant.contract;
  contract.beginDateFmt = contract.beginDate
    ? moment(contract.beginDate).format('DD/MM/YYYY')
    : '';
  contract.endDateFmt = contract.endDate
    ? moment(contract.endDate).format('DD/MM/YYYY')
    : '';
  contract.terminationDateFmt = contract.terminationDate
    ? moment(contract.terminationDate).format('DD/MM/YYYY')
    : '';

  const remaining = round(totalCharged - totalPaid);
  // Deposit still held (not yet paid back) can be offset against the debt.
  const depositHeld = round(
    (data.tenant.guaranty || 0) - (data.tenant.guarantyPayback || 0)
  );

  data.timeRange = timeRange;
  data.schedule = schedule;
  data.payments = payments;
  data.summary = {
    totalCharged,
    totalPaid,
    remaining,
    depositHeld,
    hasDeposit: depositHeld > 0,
    netRemaining: round(remaining - depositHeld)
  };

  // How the security deposit was paid at move-in (shown only when recorded).
  const depositType = data.tenant.guarantyType || '';
  const depositDate = data.tenant.guarantyDate
    ? moment(data.tenant.guarantyDate).format('DD/MM/YYYY')
    : '';
  const depositReference = data.tenant.guarantyReference || '';
  data.deposit = {
    amount: round(data.tenant.guaranty || 0),
    type: depositType,
    date: depositDate,
    reference: depositReference,
    hasPaymentInfo:
      round(data.tenant.guaranty || 0) > 0 &&
      !!(depositType || depositDate || depositReference)
  };
  data.today = moment().format('DD/MM/YYYY');
  data.fileName = sanitize(`${data.tenant.name}-releve-paiements`);

  data.cssUrl = fileUrl(path.join(TEMPLATES_DIRECTORY, 'css', 'print.css'));
  data.logoUrl = fileUrl(path.join(TEMPLATES_DIRECTORY, 'img', 'logo.png'));

  return data;
}
