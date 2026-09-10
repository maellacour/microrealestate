import {
  fetchDashboard,
  fetchLeases,
  fetchProperties,
  fetchTenants,
  QueryKeys
} from '../../utils/restcalls';
import dynamic from 'next/dynamic';
import KeyFigures from '../../components/dashboard/KeyFigures';
import moment from 'moment';
import NeedsAttention from '../../components/dashboard/NeedsAttention';
import Page from '../../components/Page';
import Portfolio from '../../components/dashboard/Portfolio';
import Shortcuts from '../../components/dashboard/Shortcuts';
import { Skeleton } from '../../components/ui/skeleton';
import { StoreContext } from '../../store';
import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import useTranslation from 'next-translate/useTranslation';
import { withAuthentication } from '../../components/Authentication';

// The year chart pulls in recharts — load it client-side so it stays out of
// the dashboard's initial bundle.
const YearFigures = dynamic(
  () => import('../../components/dashboard/YearFigures'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[520px] md:col-span-5" />
  }
);

function Dashboard() {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const dashboardQuery = useQuery({
    queryKey: [QueryKeys.DASHBOARD],
    queryFn: () => fetchDashboard(store),
    refetchOnMount: 'always',
    retry: 3
  });
  const tenantsQuery = useQuery({
    queryKey: [QueryKeys.TENANTS],
    queryFn: () => fetchTenants(store),
    refetchOnMount: 'always',
    retry: 3
  });
  const propertiesQuery = useQuery({
    queryKey: [QueryKeys.PROPERTIES],
    queryFn: () => fetchProperties(store),
    refetchOnMount: 'always',
    retry: 3
  });
  const leasesQuery = useQuery({
    queryKey: [QueryKeys.LEASES],
    queryFn: () => fetchLeases(store),
    refetchOnMount: 'always',
    retry: 3
  });
  const isLoading =
    dashboardQuery.isLoading ||
    tenantsQuery.isLoading ||
    propertiesQuery.isLoading ||
    leasesQuery.isLoading;
  const isFirstConnection =
    !leasesQuery?.data?.length ||
    !dashboardQuery?.data?.overview?.propertyCount ||
    !tenantsQuery?.data?.length ||
    !propertiesQuery?.data?.length;

  return (
    <Page
      title={t('Dashboard')}
      subtitle={t('Welcome {{firstName}} {{lastName}}!', {
        firstName: store.user.firstName,
        lastName: store.user.lastName
      })}
      PageActions={
        <span className="text-muted-foreground text-sm first-letter:uppercase">
          {moment().format('dddd LL')}
        </span>
      }
      loading={isLoading}
      dataCy="dashboardPage"
    >
      <div className="flex flex-col gap-4">
        {isFirstConnection ? (
          <Shortcuts firstConnection className="w-full" />
        ) : (
          // The create actions stay a keystroke from the heading, then the
          // figures, what needs acting on, and the year in review.
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Shortcuts className="md:col-span-5" />
            <KeyFigures className="md:col-span-5" />
            <NeedsAttention className="md:col-span-3" />
            <Portfolio className="md:col-span-2" />
            <YearFigures className="md:col-span-5" />
          </div>
        )}
      </div>
    </Page>
  );
}

export default withAuthentication(Dashboard);
