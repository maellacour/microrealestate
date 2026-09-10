import { Button } from '../ui/button';
import moment from 'moment';
import NumberFormat from '../NumberFormat';
import { observer } from 'mobx-react-lite';
import { StoreContext } from '../../store';
import { useContext } from 'react';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

// A section of the "Needs attention" panel — the panel owns the empty state,
// so this renders nothing when every rent is settled.
function UnpaidRents({ items }) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const store = useContext(StoreContext);

  const showTenantRents = (tenant, rent) => () => {
    const yearMonth = moment().format('YYYY.MM');
    store.rent.setSelected(rent);
    store.rent.setFilters({ searchText: tenant.name });
    router.push(
      `/${store.organization.selected.name}/rents/${yearMonth}?search=${tenant.name}`
    );
  };

  return items.length ? (
    <div>
      <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
        {t('Top 5 of not paid rents')}
      </div>
      <div className="flex flex-col gap-2">
        {items.map(({ tenant, balance, rent }) => (
          <div key={tenant._id} className="flex items-center gap-2 text-sm">
            <Button
              variant="link"
              onClick={showTenantRents(tenant, rent)}
              className="m-0 flex-grow justify-start p-0 text-left"
            >
              {tenant.name}
            </Button>
            <NumberFormat
              value={balance}
              withColor
              className="font-semibold tabular-nums"
            />
          </div>
        ))}
      </div>
    </div>
  ) : null;
}

export default observer(UnpaidRents);
