import { LuPlus, LuTrash } from 'react-icons/lu';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
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

  const updateLine = useCallback((index, patch) => {
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line, i) =>
        i === index ? { ...line, ...patch } : line
      )
    }));
  }, []);

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
            {values.lines.map((line, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder={t('Description')}
                  value={line.label}
                  onChange={(event) =>
                    updateLine(index, { label: event.target.value })
                  }
                />
                <Input
                  className="w-32"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('Amount')}
                  value={line.amount}
                  onChange={(event) =>
                    updateLine(index, { amount: event.target.value })
                  }
                />
                <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <Checkbox
                    checked={line.recoverable}
                    onCheckedChange={(checked) =>
                      updateLine(index, { recoverable: !!checked })
                    }
                  />
                  {t('Recoverable')}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      lines: current.lines.filter((_, i) => i !== index)
                    }))
                  }
                >
                  <LuTrash className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setValues((current) => ({
                  ...current,
                  lines: [...current.lines, emptyLine()]
                }))
              }
            >
              <LuPlus className="size-4" />
              {t('Add a line')}
            </Button>
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
