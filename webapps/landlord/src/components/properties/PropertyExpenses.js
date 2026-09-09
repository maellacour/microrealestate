import {
  ALL_YEARS,
  expenseYears,
  summarizeExpenses
} from '../../utils/expenses';
import {
  LuHash,
  LuPencil,
  LuPlus,
  LuTag,
  LuTrash,
  LuWallet
} from 'react-icons/lu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import ConfirmDialog from '../ConfirmDialog';
import { DashboardCard } from '../dashboard/DashboardCard';
import { EmptyIllustration } from '../Illustrations';
import ExpenseFormDialog from './ExpenseFormDialog';
import moment from 'moment';
import NumberFormat from '../NumberFormat';
import { observer } from 'mobx-react-lite';
import { Skeleton } from '../ui/skeleton';
import { StoreContext } from '../../store';
import { toast } from 'sonner';
import useFormatNumber from '../../hooks/useFormatNumber';
import useTranslation from 'next-translate/useTranslation';

function PropertyExpenses({ propertyId }) {
  const { t } = useTranslation('common');
  const formatNumber = useFormatNumber();
  const store = useContext(StoreContext);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [selectedYear, setSelectedYear] = useState(ALL_YEARS);

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

  const years = useMemo(
    () => expenseYears(store.expense.items),
    [store.expense.items]
  );

  // Default to the most recent year once, on first load — never override a
  // choice the user made afterwards (including "All years").
  const didInitYear = useRef(false);
  useEffect(() => {
    if (!didInitYear.current && years.length) {
      didInitYear.current = true;
      setSelectedYear(years[0]);
    }
  }, [years]);

  const { expenses, total, byCategory, topCategory, evolution } = useMemo(
    () => summarizeExpenses(store.expense.items, selectedYear),
    [store.expense.items, selectedYear]
  );

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
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-40" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      </div>
    );
  }

  const hasExpenses = store.expense.items.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hasExpenses && years.length ? (
          <Select
            value={String(selectedYear)}
            onValueChange={(value) =>
              setSelectedYear(value === ALL_YEARS ? ALL_YEARS : Number(value))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_YEARS}>{t('All years')}</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div />
        )}
        <Button onClick={openAddDialog} data-cy="addExpenseButton">
          <LuPlus className="size-4" />
          {t('Add an expense')}
        </Button>
      </div>

      {hasExpenses ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <DashboardCard
              Icon={LuWallet}
              title={t('Total expenses')}
              renderContent={() => <NumberFormat value={total} />}
              description={
                evolution
                  ? `${evolution.delta >= 0 ? '+' : ''}${formatNumber(
                      evolution.delta,
                      'percent',
                      0
                    )} ${t('vs {{year}}', { year: evolution.previousYear })}`
                  : undefined
              }
            />
            <DashboardCard
              Icon={LuHash}
              title={t('Number of expenses')}
              renderContent={() => expenses.length}
              description={
                expenses.length
                  ? `${t('Average per expense')}: ${formatNumber(
                      total / expenses.length
                    )}`
                  : undefined
              }
            />
            <DashboardCard
              Icon={LuTag}
              title={t('Main category')}
              renderContent={() =>
                topCategory ? (
                  <span className="text-2xl xl:text-3xl">
                    {t(`expenseCategory.${topCategory.category}`)}
                  </span>
                ) : (
                  '--'
                )
              }
              description={
                topCategory
                  ? `${formatNumber(topCategory.amount)} · ${formatNumber(
                      total ? topCategory.amount / total : 0,
                      'percent',
                      0
                    )}`
                  : undefined
              }
            />
          </div>

          {byCategory.length > 1 ? (
            <Card className="p-6">
              <div className="text-muted-foreground mb-4 text-sm font-medium">
                {t('Breakdown by category')}
              </div>
              <div className="space-y-3">
                {byCategory.map(({ category, amount }) => {
                  const ratio = total ? amount / total : 0;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-baseline justify-between text-sm">
                        <span>{t(`expenseCategory.${category}`)}</span>
                        <span className="text-muted-foreground">
                          <NumberFormat value={amount} className="inline" />
                          {' · '}
                          {formatNumber(ratio, 'percent', 0)}
                        </span>
                      </div>
                      <div className="bg-secondary h-2 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

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
              {expenses.map((expense) => (
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
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>{t('Total')}</TableCell>
                <TableCell className="text-right">
                  <NumberFormat value={total} className="inline" />
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </>
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
