import { occupancyFraction, round2 } from '../prorate.js';
import moment from 'moment';

export default function taskBase(
  contract,
  rentDate,
  previousRent,
  settlements,
  rent
) {
  const currentMoment = moment(rentDate, 'DD/MM/YYYY HH:mm');
  rent.term = Number(currentMoment.format('YYYYMMDDHH'));
  if (contract.frequency === 'months') {
    rent.term = Number(
      moment(currentMoment).startOf('month').format('YYYYMMDDHH')
    );
  }
  if (contract.frequency === 'days') {
    rent.term = Number(
      moment(currentMoment).startOf('day').format('YYYYMMDDHH')
    );
  }
  if (contract.frequency === 'hours') {
    rent.term = Number(
      moment(currentMoment).startOf('hour').format('YYYYMMDDHH')
    );
  }
  rent.month = currentMoment.month() + 1; // 0 based
  rent.year = currentMoment.year();

  contract.properties
    .filter((property) => {
      const entryMoment = moment(property.entryDate).startOf('day');
      const exitMoment = moment(property.exitDate).endOf('day');

      return currentMoment.isBetween(
        entryMoment,
        exitMoment,
        contract.frequency,
        '[]'
      );
    })
    .forEach(function (property) {
      if (property.property) {
        const name = property.property.name || '';
        const expenses = property.expenses || [];

        // Effective exit for this term: the property exit date, brought forward
        // to the early-termination date when the lease is terminated early.
        const exitBound = contract.termination
          ? moment.min(moment(property.exitDate), moment(contract.termination))
          : moment(property.exitDate);

        // Prorate the first/last partial periods (pro rata temporis).
        const fraction = occupancyFraction(
          currentMoment,
          contract.frequency,
          property.entryDate,
          exitBound
        );

        rent.preTaxAmounts.push({
          description: name,
          amount: round2((property.rent || 0) * fraction)
        });

        if (expenses.length) {
          rent.charges.push(
            ...expenses
              .filter(({ beginDate, endDate }) => {
                // An expense without a date window applies to every term.
                if (!beginDate || !endDate) {
                  return true;
                }
                const expenseBegin = moment(beginDate, 'DD/MM/YYYY').startOf(
                  'day'
                );
                const expenseEnd = moment(endDate, 'DD/MM/YYYY').endOf('day');

                return currentMoment.isBetween(
                  expenseBegin,
                  expenseEnd,
                  contract.frequency,
                  '[]'
                );
              })
              .map(({ title, amount }) => ({
                description: title,
                amount: round2((amount || 0) * fraction)
              }))
          );
        }
      }
    });
  if (settlements) {
    rent.description = settlements.description || '';
  }
  return rent;
}
