import { LuAlertTriangle, LuCoins, LuWallet } from 'react-icons/lu';
import { cn } from '../../utils';
import MetricCard from '../MetricCard';
import moment from 'moment';
import NumberFormat from '../NumberFormat';
import { observer } from 'mobx-react-lite';
import { Progress } from '../ui/progress';
import { StoreContext } from '../../store';
import { TbCashRegister } from 'react-icons/tb';
import { useContext } from 'react';
import useFormatNumber from '../../hooks/useFormatNumber';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

function KeyFigures({ className }) {
  const store = useContext(StoreContext);
  const router = useRouter();
  const { t } = useTranslation('common');
  const formatNumber = useFormatNumber();

  const overview = store.dashboard.data.overview;
  const currentMonth = overview?.currentMonth || { charged: 0, collected: 0 };
  const arrears = overview?.arrears || { total: 0, tenantCount: 0 };
  // Settling arrears can push collections past what the month itself calls,
  // so the bar is capped rather than overflowing.
  const collectedRatio = currentMonth.charged
    ? Math.min(
        100,
        Math.round((currentMonth.collected / currentMonth.charged) * 100)
      )
    : 0;

  const showRents = (status) => () => {
    const yearMonth = moment().format('YYYY.MM');
    store.rent.setFilters({ status: status ? [status] : [] });
    store.rent.setPeriod(moment(yearMonth, 'YYYY.MM', true));
    router.push(
      `/${store.organization.selected.name}/rents/${yearMonth}${
        status ? `?statuses=${status}` : ''
      }`
    );
  };

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
        className
      )}
    >
      <MetricCard
        Icon={TbCashRegister}
        label={t('Collected this month')}
        value={<NumberFormat value={currentMonth.collected} showZero />}
        hint={t('of {{amount}} called', {
          amount: formatNumber(currentMonth.charged)
        })}
        onClick={showRents()}
      >
        <Progress
          value={collectedRatio}
          className="mt-2 h-1.5"
          indicatorClassName="bg-success"
        />
      </MetricCard>

      <MetricCard
        Icon={LuAlertTriangle}
        label={t('Outstanding rent')}
        tone={arrears.total > 0 ? 'warning' : 'success'}
        value={<NumberFormat value={arrears.total} showZero />}
        hint={
          arrears.tenantCount
            ? t('{{count}} tenants concerned', { count: arrears.tenantCount })
            : t('Well done! All rents are paid')
        }
        onClick={arrears.total > 0 ? showRents('notpaid') : undefined}
      />

      <MetricCard
        Icon={LuCoins}
        label={t('Revenues')}
        value={<NumberFormat value={overview?.totalYearRevenues} showZero />}
        hint={t('Total revenues for the year')}
      />

      <MetricCard
        Icon={LuWallet}
        label={t('Deposits held')}
        value={<NumberFormat value={overview?.depositsHeld} showZero />}
        hint={t('Security deposits still held for running leases')}
      />
    </div>
  );
}

export default observer(KeyFigures);
