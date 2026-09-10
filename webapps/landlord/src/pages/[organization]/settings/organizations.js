import { fetchOrganizations, QueryKeys } from '../../../utils/restcalls';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { cn } from '../../../utils';
import config from '../../../config';
import Page from '../../../components/Page';
import { StoreContext } from '../../../store';
import { toast } from 'sonner';
import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import useTranslation from 'next-translate/useTranslation';
import { withAuthentication } from '../../../components/Authentication';

function OrganizationsSettings() {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const {
    data: organizations,
    isError,
    isLoading
  } = useQuery({
    queryKey: [QueryKeys.ORGANIZATIONS],
    queryFn: () => fetchOrganizations(store)
  });

  const handleSwitchOrganization = (organization) => () => {
    window.location.assign(
      `${config.BASE_PATH}/${organization.locale}/${organization.name}/dashboard`
    );
  };

  if (isError) {
    toast.error(t('Error fetching organizations'));
  }

  return (
    <Page
      title={t('Organizations')}
      subtitle={t('Your organizations')}
      loading={isLoading}
      dataCy="organizationsPage"
    >
      <div className="flex flex-col gap-4">
        {organizations?.map((organization) => (
          <Card
            key={organization._id}
            className={cn('flex items-center gap-2 p-4')}
          >
            {store.organization.selected?._id !== organization._id ? (
              <Button
                variant="link"
                onClick={handleSwitchOrganization(organization)}
                className="justify-start text-xl p-0 h-fit min-w-32"
              >
                {organization.name}
              </Button>
            ) : (
              <span className="text-xl min-w-32">{organization.name}</span>
            )}
            <Badge
              variant="outline"
              className="text-secondary-foreground/70 h-fit w-fit"
            >
              {t(
                organization.members.find(
                  (member) => member.user === store.user._id
                ).role
              )}
            </Badge>
          </Card>
        ))}
      </div>
    </Page>
  );
}

export default withAuthentication(OrganizationsSettings);
