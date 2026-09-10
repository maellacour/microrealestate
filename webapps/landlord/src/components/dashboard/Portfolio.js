import { LuKeyRound, LuUserCircle } from 'react-icons/lu';
import { Button } from '../ui/button';
import { observer } from 'mobx-react-lite';
import PanelCard from '../PanelCard';
import { Progress } from '../ui/progress';
import { StoreContext } from '../../store';
import { useContext } from 'react';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

function Portfolio({ className }) {
  const store = useContext(StoreContext);
  const router = useRouter();
  const { t } = useTranslation('common');

  const overview = store.dashboard.data.overview;
  const propertyCount = overview?.propertyCount || 0;
  const rentedPropertyCount = overview?.rentedPropertyCount || 0;
  const rentedRatio = propertyCount
    ? Math.round((rentedPropertyCount / propertyCount) * 100)
    : 0;

  const goTo = (section) => () =>
    router.push(`/${store.organization.selected.name}/${section}`);

  return (
    <PanelCard title={t('Portfolio')} className={className}>
      <div className="flex h-full flex-col justify-center gap-6">
        <div>
          <Button
            variant="link"
            onClick={goTo('properties')}
            className="text-muted-foreground m-0 h-fit gap-2 p-0 text-xs font-medium uppercase tracking-wide"
          >
            <LuKeyRound className="size-4" />
            {t('Properties')}
          </Button>
          <div className="mt-1 text-2xl font-semibold leading-tight tabular-nums">
            {t('{{rented}} of {{total}} rented', {
              rented: rentedPropertyCount,
              total: propertyCount
            })}
          </div>
          <Progress
            value={rentedRatio}
            className="mt-2 h-1.5"
            indicatorClassName="bg-primary"
          />
        </div>

        <div>
          <Button
            variant="link"
            onClick={goTo('tenants')}
            className="text-muted-foreground m-0 h-fit gap-2 p-0 text-xs font-medium uppercase tracking-wide"
          >
            <LuUserCircle className="size-4" />
            {t('Tenants')}
          </Button>
          <div className="mt-1 text-2xl font-semibold leading-tight tabular-nums">
            {overview?.tenantCount || 0}
          </div>
        </div>
      </div>
    </PanelCard>
  );
}

export default observer(Portfolio);
