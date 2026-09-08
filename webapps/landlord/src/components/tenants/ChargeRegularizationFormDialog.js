import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import ChargeLinesEditor from '../ChargeLinesEditor';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import moment from 'moment';
import NumberFormat from '../NumberFormat';
import ResponsiveDialog from '../ResponsiveDialog';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import useTranslation from 'next-translate/useTranslation';

const round = (value) => Math.round((value || 0) * 100) / 100;

const emptyLine = () => ({ label: '', amount: '', recoverable: true });

const emptyRegularization = () => {
  const lastYear = moment().subtract(1, 'year');
  return {
    periodStart: lastYear.startOf('year').format('YYYY-MM-DD'),
    periodEnd: moment().subtract(1, 'year').endOf('year').format('YYYY-MM-DD'),
    lines: [emptyLine()],
    note: ''
  };
};

// Provisions called over the period, read live from the selected tenant's
// computed rents (same rule as the server: sum of each term's charges when the
// term falls inside the period). A rent term is a YYYYMMDDHH number.
function useProvisionsCalled(rents, periodStart, periodEnd) {
  return useMemo(() => {
    if (!periodStart || !periodEnd) {
      return 0;
    }
    const start = moment(periodStart).startOf('day');
    const end = moment(periodEnd).endOf('day');
    return round(
      (rents || []).reduce((sum, rent) => {
        const termMoment = moment(String(rent.term), 'YYYYMMDDHH');
        if (termMoment.isBetween(start, end, undefined, '[]')) {
          return sum + ((rent.total && rent.total.charges) || 0);
        }
        return sum;
      }, 0)
    );
  }, [rents, periodStart, periodEnd]);
}

export default function ChargeRegularizationFormDialog({
  open,
  setOpen,
  tenantId,
  rents,
  regularization,
  store
}) {
  const { t } = useTranslation('common');
  const [values, setValues] = useState(emptyRegularization());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setValues(
      regularization
        ? {
            periodStart: moment(regularization.periodStart).format(
              'YYYY-MM-DD'
            ),
            periodEnd: moment(regularization.periodEnd).format('YYYY-MM-DD'),
            lines: regularization.lines?.length
              ? regularization.lines.map((line) => ({
                  label: line.label || '',
                  amount: line.amount ?? '',
                  recoverable: line.recoverable !== false
                }))
              : [emptyLine()],
            note: regularization.note || ''
          }
        : emptyRegularization()
    );
  }, [open, regularization]);

  const provisionsCalled = useProvisionsCalled(
    rents,
    values.periodStart,
    values.periodEnd
  );
  const recoverableTotal = round(
    values.lines
      .filter((line) => line.recoverable)
      .reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
  );
  const balance = round(provisionsCalled - recoverableTotal);

  const handleSave = useCallback(async () => {
    if (!values.periodStart || !values.periodEnd) {
      toast.error(t('Enter a date'));
      return;
    }
    if (moment(values.periodEnd).isBefore(moment(values.periodStart))) {
      toast.error(t('The end date must be after the start date'));
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
    const payload = {
      ...(regularization ? { _id: regularization._id } : { tenantId }),
      periodStart: values.periodStart,
      periodEnd: values.periodEnd,
      lines,
      note: values.note
    };
    const { status } = regularization
      ? await store.chargeRegularization.update(payload)
      : await store.chargeRegularization.create(payload);
    setSaving(false);

    if (status !== 200) {
      toast.error(t('Something went wrong'));
      return;
    }
    setOpen(false);
  }, [regularization, tenantId, setOpen, store, t, values]);

  return (
    <ResponsiveDialog
      open={open}
      setOpen={setOpen}
      isLoading={saving}
      renderHeader={() => (
        <span>
          {regularization
            ? t('Edit charge regularization')
            : t('New charge regularization')}
        </span>
      )}
      renderContent={() => (
        <div className="w-full space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regularization-start">{t('Period start')}</Label>
              <Input
                id="regularization-start"
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
              <Label htmlFor="regularization-end">{t('Period end')}</Label>
              <Input
                id="regularization-end"
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
            <Label>{t('Real charges')}</Label>
            <ChargeLinesEditor
              lines={values.lines}
              onChange={(lines) =>
                setValues((current) => ({ ...current, lines }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="regularization-note">{t('Note (optional)')}</Label>
            <Textarea
              id="regularization-note"
              value={values.note}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  note: event.target.value
                }))
              }
            />
          </div>

          <div className="rounded-md border p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{t('Provisions called')}</span>
              <NumberFormat value={provisionsCalled} className="inline" />
            </div>
            <div className="flex justify-between">
              <span>{t('Recoverable charges')}</span>
              <NumberFormat value={recoverableTotal} className="inline" />
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>
                {balance >= 0
                  ? t('Overpaid (credit to tenant)')
                  : t('Complement due by tenant')}
              </span>
              <NumberFormat value={Math.abs(balance)} className="inline" />
            </div>
          </div>
        </div>
      )}
      renderFooter={() => (
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave} data-cy="saveRegularizationButton">
            {t('Save')}
          </Button>
        </>
      )}
    />
  );
}
