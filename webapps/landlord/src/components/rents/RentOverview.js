import { LuTrendingDown, LuTrendingUp } from 'react-icons/lu';
import { BsReceipt } from 'react-icons/bs';
import { cn } from '../../utils';
import MetricCard from '../MetricCard';
import NumberFormat from '../NumberFormat';
import { Progress } from '../ui/progress';
import useTranslation from 'next-translate/useTranslation';

export function RentOverview({ data, className }) {
  const { t } = useTranslation('common');

  const totalPaid = data.totalPaid || 0;
  const totalNotPaid = data.totalNotPaid || 0;
  const called = totalPaid + totalNotPaid;
  const paidRatio = called ? Math.round((totalPaid / called) * 100) : 0;

  return (
    <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3', className)}>
      <MetricCard
        Icon={LuTrendingDown}
        label={t('Not paid')}
        tone={totalNotPaid > 0 ? 'warning' : 'muted'}
        value={<NumberFormat value={totalNotPaid} showZero />}
        hint={t('{{count}} rents', { count: data.countNotPaid || 0 })}
      />
      <MetricCard
        Icon={LuTrendingUp}
        label={t('Paid')}
        tone="success"
        value={<NumberFormat value={totalPaid} showZero />}
        hint={t('{{count}} rents', {
          count: (data.countPaid || 0) + (data.countPartiallyPaid || 0)
        })}
      >
        <Progress
          value={paidRatio}
          className="mt-2 h-1.5"
          indicatorClassName="bg-success"
        />
      </MetricCard>
      <MetricCard
        Icon={BsReceipt}
        label={t('Rents')}
        value={data.countAll || 0}
        hint={t('Rents for the period')}
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}
