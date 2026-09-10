import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { getFormatNumber } from '@/utils/formatnumber';
import { getMoment } from '@/utils';
import getTranslation from '@/utils/i18n/server/getTranslation';
import type { Lease } from '@/types';
import Request from '@/utils/request';

export async function ChargeRegularizationCard({ lease }: { lease: Lease }) {
  const regularizations = await Request.fetchTenantRegularizations(
    lease.tenant.id
  );
  if (!regularizations.length) {
    return null;
  }

  const { locale, t } = await getTranslation();
  const moment = getMoment(locale);
  const formatNumber = getFormatNumber(locale, lease.landlord.currency);

  return (
    <Card className="sm:p-6">
      <CardHeader>
        <CardTitle>{t('Charge regularization')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {regularizations.map((regularization) => (
          <div key={regularization.id} className="flex flex-col gap-2">
            <div className="text-muted-foreground text-sm">
              {moment(regularization.periodStart).format('L')}
              {' → '}
              {moment(regularization.periodEnd).format('L')}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>{t('Description')}</TableCell>
                  <TableCell className="text-right">{t('Amount')}</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regularization.lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>{line.label}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber({ value: line.amount })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span>{t('Provisions called')}</span>
                <span>
                  {formatNumber({ value: regularization.provisionsCalled })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('Recoverable charges')}</span>
                <span>
                  {formatNumber({ value: regularization.recoverableTotal })}
                </span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>
                  {regularization.balance >= 0
                    ? t('Overpaid (credit to you)')
                    : t('Complement due')}
                </span>
                <span>
                  {formatNumber({ value: Math.abs(regularization.balance) })}
                </span>
              </div>
            </div>
            {regularization.note ? (
              <div className="text-sm whitespace-pre-wrap">
                {regularization.note}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
