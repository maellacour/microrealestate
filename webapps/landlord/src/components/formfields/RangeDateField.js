import { useField, useFormikContext } from 'formik';

import { DateField } from './DateField';
import { durationEndMoment } from '@microrealestate/commonui/utils/contract';
import moment from 'moment';
import { useEffect } from 'react';

export function RangeDateField({
  beginName,
  endName,
  beginLabel,
  endLabel,
  minDate,
  maxDate,
  duration,
  disabled
}) {
  const { setFieldValue } = useFormikContext();
  const [beginField] = useField(beginName);
  const [endField] = useField(endName);

  // When a lease duration is provided, the end date is always derived from the
  // begin date and cannot be edited by hand. Recompute it whenever the begin
  // date (or the duration) changes.
  useEffect(() => {
    if (duration && beginField.value?.isValid()) {
      let newEndDate = durationEndMoment(
        moment(beginField.value).startOf('day'),
        duration
      );
      if (maxDate?.isValid?.() && newEndDate.isAfter(maxDate)) {
        newEndDate = moment(maxDate);
      }
      if (!newEndDate.isSame(endField.value)) {
        setFieldValue(endName, newEndDate, true);
      }
    }
  }, [
    duration,
    beginField.value,
    endField.value,
    endName,
    setFieldValue,
    maxDate
  ]);

  const boundedMin = (minDate?.isValid?.() && minDate) || undefined;
  const boundedMax = (maxDate?.isValid?.() && maxDate) || undefined;

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      <DateField
        label={beginLabel}
        name={beginName}
        minDate={boundedMin}
        maxDate={boundedMax}
        disabled={disabled}
      />
      <DateField
        label={endLabel}
        name={endName}
        minDate={beginField.value || boundedMin}
        maxDate={boundedMax}
        disabled={disabled || !!duration}
      />
    </div>
  );
}
