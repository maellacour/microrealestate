import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import ConfirmDialog from '../ConfirmDialog';
import { EmptyIllustration } from '../Illustrations';
import ExpenseFormDialog from './ExpenseFormDialog';
import { LuPencil } from 'react-icons/lu';
import { LuPlus } from 'react-icons/lu';
import { LuTrash } from 'react-icons/lu';
import moment from 'moment';
import NumberFormat from '../NumberFormat';
import { observer } from 'mobx-react-lite';
import { StoreContext } from '../../store';
import { toast } from 'sonner';
import useTranslation from 'next-translate/useTranslation';

function PropertyExpenses({ propertyId }) {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { status } = await store.expense.fetch(propertyId);
      setLoading(false);
      if (status !== 200) {
        toast.error(t('Something went wrong'));
      }
    })();
  }, [propertyId, store, t]);

  const openAddDialog = useCallback(() => {
    setEditingExpense(null);
    setOpenForm(true);
  }, []);

  const openEditDialog = useCallback((expense) => {
    setEditingExpense(expense);
    setOpenForm(true);
  }, []);

  const handleDelete = useCallback(async () => {
    const { status } = await store.expense.delete([deletingExpense._id]);
    if (status !== 200) {
      toast.error(t('Something went wrong'));
    }
  }, [deletingExpense, store, t]);

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAddDialog} data-cy="addExpenseButton">
          <LuPlus className="size-4" />
          {t('Add an expense')}
        </Button>
      </div>

      {store.expense.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Date')}</TableHead>
              <TableHead>{t('Category')}</TableHead>
              <TableHead>{t('Description')}</TableHead>
              <TableHead className="text-right">{t('Amount')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {store.expense.items.map((expense) => (
              <TableRow key={expense._id}>
                <TableCell>{moment(expense.date).format('L')}</TableCell>
                <TableCell>
                  {t(`expenseCategory.${expense.category}`)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {expense.description}
                </TableCell>
                <TableCell className="text-right">
                  <NumberFormat value={expense.amount} className="inline" />
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(expense)}
                  >
                    <LuPencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingExpense(expense)}
                  >
                    <LuTrash className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyIllustration label={t('No expenses recorded yet')} />
      )}

      <ExpenseFormDialog
        open={openForm}
        setOpen={setOpenForm}
        propertyId={propertyId}
        expense={editingExpense}
        store={store}
      />
      <ConfirmDialog
        title={t('Delete this expense?')}
        open={!!deletingExpense}
        setOpen={(open) => !open && setDeletingExpense(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default observer(PropertyExpenses);
