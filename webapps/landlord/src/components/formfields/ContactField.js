import { TextField } from './TextField';
import useTranslation from 'next-translate/useTranslation';

export function ContactField({
  contactName,
  emailName,
  phone1Name,
  phone2Name,
  showPhone2 = true,
  disabled
}) {
  const { t } = useTranslation('common');
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="md:col-span-3">
        <TextField
          label={t('Contact')}
          name={contactName || 'contact'}
          disabled={disabled}
        />
      </div>
      <TextField
        label={t('Email')}
        name={emailName || 'email'}
        disabled={disabled}
      />
      <TextField
        label={showPhone2 ? t('Phone 1') : t('Phone')}
        name={phone1Name || 'phone1'}
        disabled={disabled}
      />
      {showPhone2 ? (
        <TextField
          label={t('Phone 2')}
          name={phone2Name || 'phone2'}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}
