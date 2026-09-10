import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import moment from 'moment';
import ResponsiveDialog from '../ResponsiveDialog';
import { toast } from 'sonner';
import useTranslation from 'next-translate/useTranslation';

export default function ChargeRegularizationApplyDialog({
  open,
  setOpen,
  regularization,
  rents,
  store
}) {
  const { t } = useTranslation('common');
  const [term, setTerm] = useState('');
  const [saving, setSaving] = useState(false);

  const terms = (rents || []).map((rent) => ({
    value: String(rent.term),
    label: moment(String(rent.term), 'YYYYMMDDHH').format('MMMM YYYY')
  }));

  useEffect(() => {
    if (open && terms.length) {
      // default to the most recent term
      setTerm(terms[terms.length - 1].value);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = useCallback(async () => {
    if (!term) {
      toast.error(t('Select a term'));
      return;
    }
    setSaving(true);
    const { status } = await store.chargeRegularization.apply(
      regularization._id,
      Number(term)
    );
    setSaving(false);
    if (status !== 200) {
      toast.error(t('Something went wrong'));
      return;
    }
    setOpen(false);
  }, [term, regularization, store, t, setOpen]);

  return (
    <ResponsiveDialog
      open={open}
      setOpen={setOpen}
      isLoading={saving}
      renderHeader={() => <span>{t('Post the balance on a rent term')}</span>}
      renderContent={() => (
        <div className="w-full space-y-2">
          <Label htmlFor="regularization-term">{t('Rent term')}</Label>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger id="regularization-term">
              <SelectValue placeholder={t('Select a term')} />
            </SelectTrigger>
            <SelectContent>
              {terms.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      renderFooter={() => (
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleApply}>{t('Apply')}</Button>
        </>
      )}
    />
  );
}
