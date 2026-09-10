import { LuArrowLeft, LuHistory, LuKeyRound, LuTrash } from 'react-icons/lu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../../../components/ui/tabs';
import { useCallback, useContext, useMemo, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import ConfirmDialog from '../../../components/ConfirmDialog';
import dynamic from 'next/dynamic';
import Map from '../../../components/Map';
import moment from 'moment';
import NumberFormat from '../../../components/NumberFormat';
import { observer } from 'mobx-react-lite';
import Page from '../../../components/Page';
import PanelCard from '../../../components/PanelCard';
import PropertyColocation from '../../../components/properties/PropertyColocation';
import PropertyExpenses from '../../../components/properties/PropertyExpenses';
import PropertyForm from '../../../components/properties/PropertyForm';
import ShortcutButton from '../../../components/ShortcutButton';
import { Skeleton } from '../../../components/ui/skeleton';
import { StoreContext } from '../../../store';
import { toast } from 'sonner';
import { toJS } from 'mobx';
import types from '../../../components/properties/types';
import useFillStore from '../../../hooks/useFillStore';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import { withAuthentication } from '../../../components/Authentication';

// Results uses recharts — load it client-side to keep it off the initial bundle.
const PropertyResults = dynamic(
  () => import('../../../components/properties/PropertyResults'),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> }
);

function PropertyOverviewCard() {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);

  return (
    <PanelCard Icon={LuKeyRound} title={t('Property')}>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">
            {t('Rent excluding tax and expenses')}
          </span>
          <NumberFormat value={store.property.selected.price} />
        </div>
        <Map address={store.property.selected.address} />
      </div>
    </PanelCard>
  );
}

function OccupancyHistoryCard() {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);

  return (
    <PanelCard Icon={LuHistory} title={t('Previous tenants')}>
      {store.property.selected?.occupancyHistory?.length ? (
        <div className="flex flex-col gap-3">
          {store.property.selected.occupancyHistory.map((occupant) => (
            <div key={occupant.id}>
              <div className="text-sm">{occupant.name}</div>
              <div className="text-muted-foreground text-xs">
                {t('{{beginDate}} to {{endDate}}', {
                  beginDate: moment(occupant.beginDate, 'DD/MM/YYYY').format(
                    'll'
                  ),
                  endDate: moment(occupant.endDate, 'DD/MM/YYYY').format('ll')
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">
          {t('Property not rented so far')}
        </span>
      )}
    </PanelCard>
  );
}

async function fetchData(store, router) {
  const results = await store.property.fetchOne(router.query.id);
  store.property.setSelected(
    store.property.items.find(({ _id }) => _id === router.query.id)
  );
  return results;
}

function Property() {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const router = useRouter();
  const [openConfirmDeletePropertyDialog, setOpenConfirmDeletePropertyDialog] =
    useState(false);
  const [fetching] = useFillStore(fetchData, [router]);

  const handleBack = useCallback(() => {
    router.push(store.appHistory.previousPath);
  }, [router, store.appHistory.previousPath]);

  const propertySummary = useMemo(() => {
    const { _id, status, occupantLabel, type } = store.property.selected;
    if (!_id) {
      return null;
    }
    const vacant = status === 'vacant';
    const propertyType = types.find(({ id }) => id === type);
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge variant={vacant ? 'warning' : 'success'} className="font-normal">
          {vacant ? t('Vacant') : t('Rented')}
        </Badge>
        {propertyType ? <span>{t(propertyType.labelId)}</span> : null}
        {!vacant && occupantLabel ? (
          <span>{t('Occupied by {{tenant}}', { tenant: occupantLabel })}</span>
        ) : null}
      </span>
    );
  }, [store.property.selected, t]);

  const onConfirmDeleteProperty = useCallback(() => {
    setOpenConfirmDeletePropertyDialog(true);
  }, [setOpenConfirmDeletePropertyDialog]);

  const onDeleteProperty = useCallback(async () => {
    const { status } = await store.property.delete([
      store.property.selected._id
    ]);
    if (status !== 200) {
      switch (status) {
        case 422:
          return toast.error(t('Property cannot be deleted'));
        case 404:
          return toast.error(t('Property does not exist'));
        case 403:
          return toast.error(t('You are not allowed to delete the Property'));
        default:
          return toast.error(t('Something went wrong'));
      }
    }

    await router.push(store.appHistory.previousPath);
  }, [store, router, t]);

  const onSubmit = useCallback(
    async (propertyPart) => {
      let property = {
        ...toJS(store.property.selected),
        ...propertyPart,
        price: propertyPart.rent
      };

      if (property._id) {
        const { status, data } = await store.property.update(property);
        if (status !== 200) {
          switch (status) {
            case 422:
              return toast.error(t('Property name is missing'));
            case 403:
              return toast.error(
                t('You are not allowed to update the property')
              );
            default:
              return toast.error(t('Something went wrong'));
          }
        }
        store.property.setSelected(data);
      } else {
        const { status, data } = await store.property.create(property);
        if (status !== 200) {
          switch (status) {
            case 422:
              return toast.error(t('Property name is missing'));
            case 403:
              return toast.error(t('You are not allowed to add a property'));
            case 409:
              return toast.error(t('The property already exists'));
            default:
              return toast.error(t('Something went wrong'));
          }
        }
        store.property.setSelected(data);
        await router.push(
          `/${store.organization.selected.name}/properties/${data._id}`
        );
      }
    },
    [store, t, router]
  );

  return (
    <Page
      title={store.property.selected.name}
      subtitle={propertySummary}
      loading={fetching}
      ActionBar={
        <div className="grid grid-cols-5 gap-1.5 md:gap-4">
          <ShortcutButton
            label={t('Back')}
            Icon={LuArrowLeft}
            onClick={handleBack}
          />
          <ShortcutButton
            label={t('Delete')}
            Icon={LuTrash}
            onClick={onConfirmDeleteProperty}
            className="col-start-2 col-end-2"
            dataCy="removeResourceButton"
          />
        </div>
      }
      dataCy="propertyPage"
    >
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Tabs defaultValue="property" className="md:col-span-2">
            <TabsList className="flex justify-start overflow-x-auto overflow-y-hidden">
              <TabsTrigger value="property" className="w-1/4">
                {t('Property')}
              </TabsTrigger>
              {store.property.selected._id ? (
                <TabsTrigger value="expenses" className="w-1/4">
                  {t('Expenses')}
                </TabsTrigger>
              ) : null}
              {store.property.selected._id ? (
                <TabsTrigger
                  value="colocation"
                  className="w-1/4"
                  data-cy="tabColocation"
                >
                  {t('Colocation')}
                </TabsTrigger>
              ) : null}
              {store.property.selected._id ? (
                <TabsTrigger value="results" className="w-1/4">
                  {t('Results')}
                </TabsTrigger>
              ) : null}
            </TabsList>
            <TabsContent value="property">
              <Card className="p-6">
                <PropertyForm onSubmit={onSubmit} />
              </Card>
            </TabsContent>
            {store.property.selected._id ? (
              <TabsContent value="expenses">
                <Card className="p-6">
                  <PropertyExpenses propertyId={store.property.selected._id} />
                </Card>
              </TabsContent>
            ) : null}
            {store.property.selected._id ? (
              <TabsContent value="colocation">
                <Card className="p-6">
                  <PropertyColocation
                    propertyId={store.property.selected._id}
                  />
                </Card>
              </TabsContent>
            ) : null}
            {store.property.selected._id ? (
              <TabsContent value="results">
                <Card className="p-6">
                  <PropertyResults propertyId={store.property.selected._id} />
                </Card>
              </TabsContent>
            ) : null}
          </Tabs>
          <div className="hidden md:grid grid-cols-1 gap-4 h-fit">
            <PropertyOverviewCard />
            <OccupancyHistoryCard />
          </div>
        </div>

        <ConfirmDialog
          title={t('Are you sure to definitely remove this property?')}
          subTitle={store.property.selected.name}
          open={openConfirmDeletePropertyDialog}
          setOpen={setOpenConfirmDeletePropertyDialog}
          onConfirm={onDeleteProperty}
        />
      </>
    </Page>
  );
}

export default withAuthentication(observer(Property));
