import { TextField } from './TextField';
import useTranslation from 'next-translate/useTranslation';

export function AddressField({ disabled }) {
  const { t } = useTranslation('common');
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <TextField
          label={t('Street 1')}
          name="address.street1"
          disabled={disabled}
        />
      </div>
      <div className="md:col-span-2">
        <TextField
          label={t('Street 2')}
          name="address.street2"
          disabled={disabled}
        />
      </div>
      <TextField
        label={t('Zip code')}
        name="address.zipCode"
        disabled={disabled}
      />
      <TextField label={t('City')} name="address.city" disabled={disabled} />
      <TextField label={t('State')} name="address.state" disabled={disabled} />
      <TextField
        label={t('Country')}
        name="address.country"
        disabled={disabled}
      />
    </div>
  );
}
