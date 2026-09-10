import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { Button } from './ui/button';
import { cn } from '../utils';
import moment from 'moment';
import { useMemo } from 'react';
import useTranslation from 'next-translate/useTranslation';

// Controlled: the period lives with the caller (usually the route), so the
// picker and the rest of the screen can never drift apart.
export default function PeriodPicker({
  value,
  period = 'month',
  className,
  onChange
}) {
  const { t } = useTranslation('common');
  const current = useMemo(() => value || moment(), [value]);
  const format = useMemo(() => {
    let format = 'MMM YY';
    switch (period) {
      case 'year':
        format = 'YYYY';
        break;
      case 'week':
        format = 'w, YYYY';
        break;
      case 'day':
        format = 'D MMMM YYYY';
        break;
    }
    return format;
  }, [period]);

  const handlePreviousClick = () => {
    onChange?.(current.clone().subtract(1, period));
  };

  const handleNextClick = () => {
    onChange?.(current.clone().add(1, period));
  };

  return (
    <div
      className={cn(
        'bg-card flex items-center gap-1 rounded-lg border p-1',
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePreviousClick}
        aria-label={t('Previous period')}
        className="size-8"
      >
        <LuChevronLeft className="size-4" />
      </Button>
      <span className="min-w-24 text-center text-base font-medium uppercase tabular-nums">
        {current.format(format)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextClick}
        aria-label={t('Next period')}
        className="size-8"
      >
        <LuChevronRight className="size-4" />
      </Button>
    </div>
  );
}
