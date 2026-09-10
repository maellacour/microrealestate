import { fetchOrganizations, QueryKeys } from '../../../utils/restcalls';
import { Card } from '../../../components/ui/card';
import Page from '../../../components/Page';
import { StoreContext } from '../../../store';
import ThirdPartiesForm from '../../../components/organization/ThirdPartiesForm';
import { toast } from 'sonner';
import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import useTranslation from 'next-translate/useTranslation';
import { withAuthentication } from '../../../components/Authentication';

function ThirdPartiesSettings() {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const {
    data: orgs,
    isError,
    isLoading
  } = useQuery({
    queryKey: [QueryKeys.ORGANIZATIONS],
    queryFn: () => fetchOrganizations(store)
  });

  if (isError) {
    toast.error(t('Error fetching organizations'));
  }

  const organization =
    orgs?.find((org) => org._id === store.organization.selected?._id) ||
    orgs?.[0];

  return (
    <Page
      title={t('Third-parties')}
      subtitle={t(
        'Connect third-parties to extend the functionality of your organization'
      )}
      loading={isLoading}
      dataCy="thirdpartiesPage"
    >
      <Card className="p-6">
        <ThirdPartiesForm organization={organization} />
      </Card>
    </Page>
  );
}

export default withAuthentication(ThirdPartiesSettings);
