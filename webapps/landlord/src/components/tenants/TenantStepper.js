import BillingForm, {
  validate as BillingFormValidate
} from './forms/BillingForm';
import LeaseContractForm, {
  validate as LeaseContractFormValidate
} from './forms/LeaseContractForm';
import { Step, StepContent, StepLabel, Stepper } from '../ui/stepper';
import TenantForm, { validate as TenantFormValidate } from './forms/TenantForm';
import { useCallback, useContext, useState } from 'react';
import DocumentsForm from './forms/DocumentsForm';
import { StoreContext } from '../../store';
import useTranslation from 'next-translate/useTranslation';

export default function TenantStepper({ onSubmit }) {
  const store = useContext(StoreContext);
  const { t } = useTranslation('common');
  const [activeStep, setActiveStep] = useState(0);

  const handleSubmit = useCallback(
    async (tenantPart) => {
      try {
        let isFormsValid = false;
        try {
          await TenantFormValidate(store.tenant?.selected);
          await LeaseContractFormValidate(store.tenant?.selected);
          await BillingFormValidate(store.tenant?.selected);
          isFormsValid = activeStep >= 3;
        } catch (error) {
          console.log(error);
          isFormsValid = false;
        }
        await onSubmit({ ...tenantPart, stepperMode: !isFormsValid });
        setActiveStep(activeStep + 1);
      } catch (error) {
        // do nothing on error
      }
    },
    [onSubmit, store.tenant?.selected, activeStep]
  );

  return (
    <Stepper activeStep={activeStep} orientation="vertical">
      <Step>
        <StepLabel>{t('Tenant information')}</StepLabel>
        <StepContent>
          <div className="px-2">
            <TenantForm onSubmit={handleSubmit} />
          </div>
        </StepContent>
      </Step>
      <Step>
        <StepLabel>{t('Lease')}</StepLabel>
        <StepContent>
          <div className="px-2">
            <LeaseContractForm onSubmit={handleSubmit} />
          </div>
        </StepContent>
      </Step>
      <Step>
        <StepLabel>{t('Billing information')}</StepLabel>
        <StepContent>
          <div className="px-2">
            <BillingForm onSubmit={handleSubmit} />
          </div>
        </StepContent>
      </Step>
      <Step>
        <StepLabel>{t('Documents')}</StepLabel>
        <StepContent>
          <div className="px-2">
            <DocumentsForm onSubmit={handleSubmit} />
          </div>
        </StepContent>
      </Step>
    </Stepper>
  );
}
