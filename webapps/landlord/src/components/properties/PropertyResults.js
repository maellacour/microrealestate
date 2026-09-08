import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from '../ui/alert';
import { ChartContainer } from '../ui/chart';
import moment from 'moment';
import NumberFormat from '../NumberFormat';
import { observer } from 'mobx-react-lite';
import PeriodPicker from '../PeriodPicker';
import { StoreContext } from '../../store';
import { toast } from 'sonner';
import useFormatNumber from '../../hooks/useFormatNumber';
import useTranslation from 'next-translate/useTranslation';

const EXPENSE_CATEGORIES = [
  'works',
  'insurance',
  'property_tax',
  'condo_charges',
  'management_fees',
  'loan_interest',
  'other'
];

function Figure({ label, children, description }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-normal text-xs xl:text-sm text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-2xl xl:text-3xl font-medium">
        {children}
        {description ? (
          <div className="text-xs font-normal text-muted-foreground mt-1">
            {description}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PropertyResults({ propertyId }) {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const formatNumber = useFormatNumber();
  const [period, setPeriod] = useState(moment());
  const [loading, setLoading] = useState(true);

  const year = period.year();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { status } = await store.propertyAccounting.fetch(year, propertyId);
      setLoading(false);
      if (status !== 200) {
        toast.error(t('Something went wrong'));
      }
    })();
  }, [propertyId, store, t, year]);

  const results = store.propertyAccounting.data.properties?.[0];

  const chartData = useMemo(() => {
    if (!results) {
      return [];
    }
    return results.revenue.byMonth.map((amount, index) => ({
      name: moment().month(index).format('MMM'),
      collected: amount
    }));
  }, [results]);

  const hasRevenue = useMemo(
    () => chartData.some(({ collected }) => collected !== 0),
    [chartData]
  );

  const onPeriodChange = useCallback((newPeriod) => setPeriod(newPeriod), []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PeriodPicker
          format="YYYY"
          period="year"
          value={period}
          onChange={onPeriodChange}
          className="text-xl gap-4"
        />
      </div>

      {loading || !results ? null : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Figure label={t('Collected revenue')}>
              <NumberFormat value={results.revenue.collected} showZero />
            </Figure>
            <Figure label={t('Expenses')}>
              <NumberFormat value={results.expenses.total} showZero />
            </Figure>
            <Figure
              label={t('Net result')}
              description={t('Collected revenue minus expenses')}
            >
              <NumberFormat
                value={results.netResult}
                withColor
                showZero
                className="font-semibold"
              />
            </Figure>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Figure
              label={t('Occupancy rate')}
              description={t('{{days}} days rented', {
                days: results.occupancy.days
              })}
            >
              {Math.round(results.occupancy.rate * 100)}%
            </Figure>
            <Figure
              label={t('Charged rent')}
              description={t('Rent raised by the terms of the year')}
            >
              <NumberFormat value={results.charged} showZero />
            </Figure>
            <Figure
              label={t('Still due')}
              description={t('Charged for the year and not settled yet')}
            >
              <NumberFormat value={results.stillDue} debitColor showZero />
            </Figure>
          </div>

          {results.revenue.depositRetention ? (
            <Alert variant="warning">
              {t(
                'Includes {{amount}} retained from the security deposit rather than received',
                { amount: formatNumber(results.revenue.depositRetention) }
              )}
            </Alert>
          ) : null}

          {results.allocationApproximate ? (
            <Alert variant="warning">
              {t(
                'This property is rented within a lease covering several properties. Amounts are split between them in proportion to their rent.'
              )}
            </Alert>
          ) : null}

          {results.occupancyOverlap ? (
            <Alert variant="warning">
              {t(
                'Several leases overlap on this property during the year. The occupancy rate is capped at 100%.'
              )}
            </Alert>
          ) : null}

          {results.expenses.total ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">
                  {t('Expenses by category')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {EXPENSE_CATEGORIES.filter(
                  (category) => results.expenses.byCategory[category]
                ).map((category) => (
                  <div
                    key={category}
                    className="flex justify-between border-b first:border-t last:border-none py-2"
                  >
                    <span>{t(`expenseCategory.${category}`)}</span>
                    <NumberFormat
                      value={results.expenses.byCategory[category]}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {hasRevenue ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">
                  {t('Collected revenue of {{year}}', { year })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{ collected: { color: 'hsl(var(--chart-2))' } }}
                  className="h-[350px] w-full"
                >
                  <BarChart data={chartData} layout="vertical">
                    <XAxis
                      type="number"
                      hide={true}
                      domain={[0, 'dataMax']}
                      padding={{ left: 35, right: 70 }}
                    />
                    <YAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      type="category"
                      tick={(props) => {
                        const { x, y, payload } = props;
                        return (
                          <text
                            x={x - 30}
                            y={y}
                            className="text-[9px] md:text-xs"
                            fill="hsl(var(--muted-foreground))"
                          >
                            {payload.value}
                          </text>
                        );
                      }}
                    />
                    <Bar
                      dataKey="collected"
                      fill="hsl(var(--chart-2))"
                      stroke="hsl(var(--chart-2-border))"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                      label={{
                        position: 'right',
                        fill: 'hsl(var(--success))',
                        formatter: (value) =>
                          value > 0 ? formatNumber(value) : '',
                        className: 'tracking-tight text-[9px] md:text-sm'
                      }}
                    />
                    <ReferenceLine x={0} stroke="hsl(var(--border))" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

export default observer(PropertyResults);
