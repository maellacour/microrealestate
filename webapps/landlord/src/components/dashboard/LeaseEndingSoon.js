import { useContext, useMemo } from 'react';
import { Button } from '../ui/button';
import { cn } from '../../utils';
import moment from 'moment';
import { observer } from 'mobx-react-lite';
import { StoreContext } from '../../store';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

const HORIZON_DAYS = 90;
const SOON_DAYS = 30;

export function useLeasesEndingSoon() {
  const store = useContext(StoreContext);

  return useMemo(() => {
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
}

// A section of the "Needs attention" panel — the panel owns the empty state,
// so this renders nothing when no lease is ending.
function LeaseEndingSoon({ items }) {
  const store = useContext(StoreContext);
  const router = useRouter();
  const { t } = useTranslation('common');

  return items.length ? (
    <div>
      <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
        {t('Leases ending soon')}
      </div>
      <div className="flex flex-col gap-2">
        {items.map(({ tenant, end, daysLeft }) => (
          <div key={tenant._id} className="flex items-center gap-2 text-sm">
            <Button
              variant="link"
              onClick={() =>
                router.push(
                  `/${store.organization.selected.name}/tenants/${tenant._id}`
                )
              }
              className="m-0 flex-grow justify-start p-0 text-left"
            >
              {tenant.name}
            </Button>
            <span
              className={cn(
                'whitespace-nowrap font-medium tabular-nums',
                daysLeft <= SOON_DAYS ? 'text-warning' : 'text-muted-foreground'
              )}
            >
              {end.format('L')}
            </span>
          </div>
        ))}
      </div>
    </div>
  ) : null;
}

export default observer(LeaseEndingSoon);
