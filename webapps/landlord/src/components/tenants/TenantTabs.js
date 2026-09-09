import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import BillingForm from './forms/BillingForm';
import { Card } from '../ui/card';
import DocumentsForm from './forms/DocumentsForm';
import LeaseContractForm from './forms/LeaseContractForm';
import { LuAlertTriangle } from 'react-icons/lu';
import { observer } from 'mobx-react-lite';
import { StoreContext } from '../../store';
import TenantChargeRegularization from './TenantChargeRegularization';
import TenantForm from './forms/TenantForm';
import { useContext } from 'react';
import useTranslation from 'next-translate/useTranslation';

function TenantTabs({ onSubmit /*, setError*/, readOnly }) {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);

  const hasMissingCompulsaryDocuments =
    store.tenant.selected.filesToUpload.some(({ missing }) => missing);

  return (
    <Tabs defaultValue="tenant">
      <TabsList className="grid w-full h-auto grid-cols-2 sm:grid-cols-5">
        <TabsTrigger value="tenant" className="w-full">
          {t('Tenant')}
        </TabsTrigger>
        <TabsTrigger value="lease" className="w-full">
          {t('Lease')}
        </TabsTrigger>
        <TabsTrigger value="billing" className="w-full">
          {t('Billing')}
        </TabsTrigger>
        <TabsTrigger value="charges" className="w-full">
          {t('Charges')}
        </TabsTrigger>
        <TabsTrigger value="documents" className="w-full">
          <div className="flex justify-center items-center gap-1">
            {hasMissingCompulsaryDocuments ? (
              <LuAlertTriangle className="text-warning size-6" />
            ) : null}
            <div>{t('Documents')}</div>
          </div>
        </TabsTrigger>
      </TabsList>
      <TabsContent
        forceMount
        value="tenant"
        className="data-[state=inactive]:hidden"
      >
        <Card className="p-6">
          <TenantForm onSubmit={onSubmit} readOnly={readOnly} />
        </Card>
      </TabsContent>
      <TabsContent
        forceMount
        value="lease"
        className="data-[state=inactive]:hidden"
      >
        <Card className="p-6">
          <LeaseContractForm onSubmit={onSubmit} readOnly={readOnly} />
        </Card>
      </TabsContent>
      <TabsContent
        forceMount
        value="billing"
        className="data-[state=inactive]:hidden"
      >
        <Card className="p-6">
          <BillingForm onSubmit={onSubmit} readOnly={readOnly} />
        </Card>
      </TabsContent>
      <TabsContent
        forceMount
        value="charges"
        className="data-[state=inactive]:hidden"
      >
        <Card className="p-6">
          <TenantChargeRegularization />
        </Card>
      </TabsContent>
      <TabsContent
        forceMount
        value="documents"
        className="data-[state=inactive]:hidden"
      >
        <Card className="p-6">
          <DocumentsForm onSubmit={onSubmit} readOnly={readOnly} />
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default observer(TenantTabs);
