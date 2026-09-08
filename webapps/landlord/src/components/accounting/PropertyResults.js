import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { useContext, useMemo } from 'react';
import { Button } from '../ui/button';
import { EmptyIllustration } from '../Illustrations';
import { GrDocumentCsv } from 'react-icons/gr';
import { LuAlertTriangle } from 'react-icons/lu';
import NumberFormat from '../NumberFormat';
import { observer } from 'mobx-react-lite';
import PropertyIcon from '../properties/PropertyIcon';
import { StoreContext } from '../../store';
import useTranslation from 'next-translate/useTranslation';

function PropertyResults({ onCSVClick }) {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);

  // The accounting page has a single search bar shared by all its tabs.
  const searchText = store.accounting.searchText;
  const properties = useMemo(() => {
    const items = store.propertyAccounting.data.properties || [];
    if (!searchText) {
      return items;
    }
    return items.filter(({ name }) =>
      name?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [store.propertyAccounting.data.properties, searchText]);

  const totals = useMemo(
    () =>
      properties.reduce(
        (acc, property) => {
          acc.collected += property.revenue.collected;
          acc.expenses += property.expenses.total;
          acc.netResult += property.netResult;
          return acc;
        },
        { collected: 0, expenses: 0, netResult: 0 }
      ),
    [properties]
  );

  return properties.length ? (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-lg md:text-xl">
          {t('Results by property')}
          <Button variant="ghost" size="icon" onClick={onCSVClick}>
            <GrDocumentCsv className="size-6" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Property')}</TableHead>
              <TableHead className="text-right">
                {t('Collected revenue')}
              </TableHead>
              <TableHead className="text-right">{t('Expenses')}</TableHead>
              <TableHead className="text-right">{t('Net result')}</TableHead>
              <TableHead className="text-right">{t('Still due')}</TableHead>
              <TableHead className="text-right">
                {t('Occupancy rate')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <PropertyIcon type={property.type} />
                    <span>{property.name}</span>
                    {property.allocationApproximate ||
                    property.occupancyOverlap ? (
                      <LuAlertTriangle
                        className="size-4 text-warning"
                        title={
                          property.allocationApproximate
                            ? t(
                                'Amounts are split between the properties of a shared lease'
                              )
                            : t('Several leases overlap on this property')
                        }
                      />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <NumberFormat
                    value={property.revenue.collected}
                    showZero
                    className="text-right"
                  />
                </TableCell>
                <TableCell>
                  <NumberFormat
                    value={property.expenses.total}
                    showZero
                    className="text-right"
                  />
                </TableCell>
                <TableCell>
                  <NumberFormat
                    value={property.netResult}
                    withColor
                    showZero
                    className="text-right font-semibold"
                  />
                </TableCell>
                <TableCell>
                  <NumberFormat
                    value={property.stillDue}
                    debitColor
                    className="text-right"
                  />
                </TableCell>
                <TableCell className="text-right">
                  {Math.round(property.occupancy.rate * 100)}%
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell>{t('Total')}</TableCell>
              <TableCell>
                <NumberFormat
                  value={totals.collected}
                  showZero
                  className="text-right"
                />
              </TableCell>
              <TableCell>
                <NumberFormat
                  value={totals.expenses}
                  showZero
                  className="text-right"
                />
              </TableCell>
              <TableCell>
                <NumberFormat
                  value={totals.netResult}
                  withColor
                  showZero
                  className="text-right"
                />
              </TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  ) : (
    <EmptyIllustration label={t('No property found')} />
  );
}

export default observer(PropertyResults);
