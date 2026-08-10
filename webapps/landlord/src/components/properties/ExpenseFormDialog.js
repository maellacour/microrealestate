import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import moment from 'moment';
import ResponsiveDialog from '../ResponsiveDialog';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import useTranslation from 'next-translate/useTranslation';

export const EXPENSE_CATEGORIES = [
  'works',
  'insurance',
  'property_tax',
  'condo_charges',
  'management_fees',
  'loan_interest',
  'other'
];

const emptyExpense = () => ({
  category: 'other',
  amount: '',
  date: moment().format('YYYY-MM-DD'),
  description: ''
});

export default function ExpenseFormDialog({
  open,
  setOpen,
  propertyId,
  expense,
  store
}) {
  const { t } = useTranslation('common');
  const [values, setValues] = useState(emptyExpense());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setValues(
      expense
        ? {
            category: expense.category,
            amount: expense.amount,
            date: moment(expense.date).format('YYYY-MM-DD'),
            description: expense.description || ''
          }
        : emptyExpense()
    );
  }, [open, expense]);

  const handleSave = useCallback(async () => {
    const amount = Number(values.amount);
    if (!amount || amount <= 0) {
      toast.error(t('Enter a valid amount'));
      return;
    }
    if (!values.date) {
      toast.error(t('Enter a date'));
      return;
    }

    setSaving(true);
    const payload = {
      ...(expense ? { _id: expense._id } : { propertyId }),
      category: values.category,
      amount,
      date: values.date,
      description: values.description
    };
    const { status } = expense
      ? await store.expense.update(payload)
      : await store.expense.create(payload);
    setSaving(false);

    if (status !== 200) {
      toast.error(t('Something went wrong'));
      return;
    }
    setOpen(false);
  }, [expense, propertyId, setOpen, store, t, values]);

  return (
    <ResponsiveDialog
      open={open}
      setOpen={setOpen}
      isLoading={saving}
      renderHeader={() => (
        <span>{expense ? t('Edit expense') : t('Add an expense')}</span>
      )}
      renderContent={() => (
        <div className="w-full space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-category">{t('Category')}</Label>
            <Select
              value={values.category}
              onValueChange={(category) =>
                setValues((current) => ({ ...current, category }))
              }
            >
              <SelectTrigger id="expense-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {t(`expenseCategory.${category}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-amount">{t('Amount')}</Label>
            <Input
              id="expense-amount"
              type="number"
              min="0"
              step="0.01"
              value={values.amount}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  amount: event.target.value
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-date">{t('Date')}</Label>
            <Input
              id="expense-date"
              type="date"
              value={values.date}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  date: event.target.value
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-description">{t('Description')}</Label>
            <Textarea
              id="expense-description"
              value={values.description}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
            />
          </div>
        </div>
      )}
      renderFooter={() => (
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave} data-cy="saveExpenseButton">
            {t('Save')}
          </Button>
        </>
      )}
    />
  );
}
