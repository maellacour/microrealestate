import { useContext, useMemo } from 'react';
import { Button } from '../ui/button';
import { cn } from '../../utils';
import { DashboardCard } from './DashboardCard';
import { LuCalendarClock } from 'react-icons/lu';
import moment from 'moment';
import { observer } from 'mobx-react-lite';
import { StoreContext } from '../../store';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

const HORIZON_DAYS = 90;
const SOON_DAYS = 30;

function LeaseEndingSoon({ className }) {
  const store = useContext(StoreContext);
  const router = useRouter();
  const { t } = useTranslation('common');

  const endingSoon = useMemo(() => {
    const today = moment().startOf('day');
    const limit = moment().add(HORIZON_DAYS, 'days').endOf('day');
    return (store.tenant.items || [])
      .map((tenant) => {
        const end = moment(
          tenant.terminationDate || tenant.endDate,
          'DD/MM/YYYY'
        );
        return { tenant, end, daysLeft: end.diff(today, 'days') };
      })
      .filter(
        ({ end }) =>
          end.isValid() && end.isSameOrAfter(today) && end.isSameOrBefore(limit)
      )
      .sort((a, b) => a.end.diff(b.end))
      .slice(0, 5);
  }, [store.tenant.items]);

  return (
    <DashboardCard
      Icon={LuCalendarClock}
      title={t('Leases ending soon')}
      description={t('Within the next 90 days')}
      renderContent={() =>
        endingSoon.length ? (
          <div className="flex min-h-24 flex-col gap-2">
            {endingSoon.map(({ tenant, end, daysLeft }) => (
              <div
                key={tenant._id}
                className="flex items-center text-sm md:text-base"
              >
                <Button
                  variant="link"
                  onClick={() =>
                    router.push(
                      `/${store.organization.selected.name}/tenants/${tenant._id}`
                    )
                  }
                  className="m-0 flex-grow justify-start p-0"
                >
                  {tenant.name}
                </Button>
                <span
                  className={cn(
                    'whitespace-nowrap font-medium',
                    daysLeft <= SOON_DAYS
                      ? 'text-warning'
                      : 'text-muted-foreground'
                  )}
                >
                  {end.format('L')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground min-h-24 text-base font-normal">
            {t('No lease ending in the next 90 days')}
          </p>
        )
      }
      className={className}
    />
  );
}

export default observer(LeaseEndingSoon);
