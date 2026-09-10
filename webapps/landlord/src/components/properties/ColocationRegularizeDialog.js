import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import ChargeLinesEditor from '../ChargeLinesEditor';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import moment from 'moment';
import ResponsiveDialog from '../ResponsiveDialog';
import { toast } from 'sonner';
import useTranslation from 'next-translate/useTranslation';

const emptyLine = () => ({ label: '', amount: '', recoverable: true });

export default function ColocationRegularizeDialog({
  open,
  setOpen,
  colocationId,
  store
}) {
  const { t } = useTranslation('common');
  const [values, setValues] = useState({
    periodStart: '',
    periodEnd: '',
    lines: [emptyLine()]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const lastYear = moment().subtract(1, 'year');
    setValues({
      periodStart: lastYear.startOf('year').format('YYYY-MM-DD'),
      periodEnd: moment()
        .subtract(1, 'year')
        .endOf('year')
        .format('YYYY-MM-DD'),
      lines: [emptyLine()]
    });
  }, [open]);

  const handleGenerate = useCallback(async () => {
    if (!values.periodStart || !values.periodEnd) {
      toast.error(t('Enter a date'));
      return;
    }
    const lines = values.lines
      .filter((line) => line.label.trim() || line.amount !== '')
      .map((line) => ({
        label: line.label.trim(),
        amount: Number(line.amount) || 0,
        recoverable: !!line.recoverable
      }));

    setSaving(true);
    const { status } = await store.colocation.regularize(colocationId, {
      periodStart: values.periodStart,
      periodEnd: values.periodEnd,
      lines
    });
    setSaving(false);
    if (status !== 200) {
      toast.error(t('Something went wrong'));
      return;
    }
    toast.success(t('Regularizations created for each roommate'));
    setOpen(false);
  }, [values, colocationId, store, t, setOpen]);

  return (
    <ResponsiveDialog
      open={open}
      setOpen={setOpen}
      isLoading={saving}
      renderHeader={() => <span>{t('Common charges regularization')}</span>}
      renderContent={() => (
        <div className="w-full space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coloc-reg-start">{t('Period start')}</Label>
              <Input
                id="coloc-reg-start"
                type="date"
                value={values.periodStart}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    periodStart: event.target.value
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coloc-reg-end">{t('Period end')}</Label>
              <Input
                id="coloc-reg-end"
                type="date"
                value={values.periodEnd}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    periodEnd: event.target.value
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('Common charges')}</Label>
            <ChargeLinesEditor
              lines={values.lines}
              onChange={(lines) =>
                setValues((current) => ({ ...current, lines }))
              }
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {t(
              'Each charge is split by quote-part and a regularization is created for each roommate.'
            )}
          </p>
        </div>
      )}
      renderFooter={() => (
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleGenerate}>{t('Generate')}</Button>
        </>
      )}
    />
  );
}
