import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../../../components/ui/tabs';
import { useCallback, useContext } from 'react';
import { downloadDocument } from '../../../utils/fetch';
import IncomingTenants from '../../../components/accounting/IncomingTenants';
import moment from 'moment';
import { observer } from 'mobx-react-lite';
import OutgoingTenants from '../../../components/accounting/OutgoingTenants';
import Page from '../../../components/Page';
import PeriodPicker from '../../../components/PeriodPicker';
import PropertyResults from '../../../components/accounting/PropertyResults';
import SearchFilterBar from '../../../components/SearchFilterBar';
import { StoreContext } from '../../../store';
import TenantSettlements from '../../../components/accounting/TenantSettlements';
import { toast } from 'sonner';
import useFillStore from '../../../hooks/useFillStore';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import { withAuthentication } from '../../../components/Authentication';

function YearPicker() {
  const store = useContext(StoreContext);
  const router = useRouter();
  const year = router.query.year || moment().year();

  const onChange = useCallback(
    async (period) => {
      await router.push(
        `/${store.organization.selected.name}/accounting/${period.format(
          'YYYY'
        )}`
      );
    },
    [router, store.organization.selected.name]
  );

  return (
    <PeriodPicker
      period="year"
      value={moment(year, 'YYYY')}
      onChange={onChange}
    />
  );
}

async function fetchData(store, router) {
  const [accounting] = await Promise.all([
    store.accounting.fetch(router.query.year),
    store.propertyAccounting.fetch(router.query.year)
  ]);
  return accounting;
}

function Accounting() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const store = useContext(StoreContext);
  const [fetching] = useFillStore(fetchData, [router]);

  const getSettlementsAsCsv = useCallback(
    async (e) => {
      e.stopPropagation();
      try {
        await downloadDocument({
          endpoint: `/csv/settlements/${router.query.year}`,
          documentName: t('Settlements - {{year}}.csv', {
            year: router.query.year
          })
        });
      } catch (error) {
        console.error(error);
        toast.error(t('Something went wrong'));
      }
    },
    [t, router.query.year]
  );

  const getPropertyResultsAsCsv = useCallback(
    async (e) => {
      e.stopPropagation();
      try {
        await downloadDocument({
          endpoint: `/csv/properties/${router.query.year}`,
          documentName: t('Results by property - {{year}}.csv', {
            year: router.query.year
          })
        });
      } catch (error) {
        console.error(error);
        toast.error(t('Something went wrong'));
      }
    },
    [t, router.query.year]
  );

  const getIncomingTenantsAsCsv = useCallback(
    async (e) => {
      e.stopPropagation();
      try {
        await downloadDocument({
          endpoint: `/csv/tenants/incoming/${router.query.year}`,
          documentName: t('Incoming tenants - {{year}}.csv', {
            year: router.query.year
          })
        });
      } catch (error) {
        console.error(error);
        toast.error(t('Something went wrong'));
      }
    },
    [t, router.query.year]
  );

  const getOutgoingTenantsAsCsv = useCallback(
    async (e) => {
      e.stopPropagation();
      try {
        await downloadDocument({
          endpoint: `/csv/tenants/outgoing/${router.query.year}`,
          documentName: t('Outgoing tenants - {{year}}.csv', {
            year: router.query.year
          })
        });
      } catch (error) {
        console.error(error);
        toast.error(t('Something went wrong'));
      }
    },
    [t, router.query.year]
  );

  const getYearInvoices = useCallback(
    (tenant) => async () => {
      try {
        await downloadDocument({
          endpoint: `/documents/invoice/${tenant._id}/${router.query.year}`,
          documentName: `${tenant.name}-${router.query.year}-${t('invoice')}.pdf`
        });
      } catch (error) {
        console.error(error);
        toast.error(t('Something went wrong'));
      }
    },
    [router.query.year, t]
  );

  const handleSearch = useCallback(
    (_, searchText) => {
      store.accounting.setSearch(searchText);
    },
    [store.accounting]
  );

  return (
    <Page
      title={t('Accounting')}
      PageActions={
        <>
          <SearchFilterBar onSearch={handleSearch} className="w-full sm:w-60" />
          <YearPicker />
        </>
      }
      loading={fetching}
      dataCy="accountingPage"
    >
      <Tabs defaultValue="incoming">
        <TabsList className="flex justify-start w-screen-nomargin-sm md:w-full overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="incoming" className="min-w-48 sm:w-full">{`${t(
            'Incoming tenants'
          )} (${
            store.accounting.filteredData.incomingTenants?.length || 0
          })`}</TabsTrigger>
          <TabsTrigger value="outgoing" className="min-w-48 sm:w-full">{`${t(
            'Outgoing tenants'
          )} (${
            store.accounting.filteredData.outgoingTenants?.length || 0
          })`}</TabsTrigger>
          <TabsTrigger value="settlements" className="min-w-48 sm:w-full">{`${t(
            'Settlements'
          )} (${
            store.accounting.filteredData.settlements?.length || 0
          })`}</TabsTrigger>
          <TabsTrigger value="properties" className="min-w-48 sm:w-full">{`${t(
            'Properties'
          )} (${
            store.propertyAccounting.data.properties?.length || 0
          })`}</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming">
          <IncomingTenants onCSVClick={getIncomingTenantsAsCsv} />
        </TabsContent>
        <TabsContent value="outgoing">
          <OutgoingTenants onCSVClick={getOutgoingTenantsAsCsv} />
        </TabsContent>
        <TabsContent value="settlements">
          <TenantSettlements
            onCSVClick={getSettlementsAsCsv}
            onDownloadYearInvoices={getYearInvoices}
          />
        </TabsContent>
        <TabsContent value="properties">
          <PropertyResults onCSVClick={getPropertyResultsAsCsv} />
        </TabsContent>
      </Tabs>
    </Page>
  );
}

export default withAuthentication(observer(Accounting));
