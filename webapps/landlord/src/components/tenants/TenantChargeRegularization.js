import { LuDownload, LuPencil, LuPlus, LuTrash } from 'react-icons/lu';
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
import ChargeRegularizationFormDialog from './ChargeRegularizationFormDialog';
import ConfirmDialog from '../ConfirmDialog';
import { downloadDocument } from '../../utils/fetch';
import { EmptyIllustration } from '../Illustrations';
import moment from 'moment';
import NumberFormat from '../NumberFormat';
import { observer } from 'mobx-react-lite';
import { StoreContext } from '../../store';
import { toast } from 'sonner';
import useTranslation from 'next-translate/useTranslation';

function TenantChargeRegularization() {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const tenant = store.tenant.selected;
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const isForfait = tenant?.chargesMode === 'forfait';

  useEffect(() => {
    if (isForfait || !tenant?._id) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { status } = await store.chargeRegularization.fetch(tenant._id);
      setLoading(false);
      if (status !== 200) {
        toast.error(t('Something went wrong'));
      }
    })();
  }, [isForfait, tenant?._id, store, t]);

  const openAddDialog = useCallback(() => {
    setEditing(null);
    setOpenForm(true);
  }, []);

  const openEditDialog = useCallback((regularization) => {
    setEditing(regularization);
    setOpenForm(true);
  }, []);

  const handleDelete = useCallback(async () => {
    const { status } = await store.chargeRegularization.delete([deleting._id]);
    if (status !== 200) {
      toast.error(t('Something went wrong'));
    }
  }, [deleting, store, t]);

  const handleDownload = useCallback(
    async (regularization) => {
      await downloadDocument({
        endpoint: `/documents/charge_regularization/${tenant._id}/${regularization._id}`,
        documentName: `${tenant.name}-regularisation-charges.pdf`
      });
    },
    [tenant]
  );

  if (isForfait) {
    return (
      <div className="text-muted-foreground">
        {t(
          'This tenancy uses flat-rate charges, so there is no charge regularization. Switch the charges regime in the Billing tab to enable it.'
        )}
      </div>
    );
  }

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAddDialog} data-cy="addRegularizationButton">
          <LuPlus className="size-4" />
          {t('New charge regularization')}
        </Button>
      </div>

      {store.chargeRegularization.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Period')}</TableHead>
              <TableHead className="text-right">
                {t('Provisions called')}
              </TableHead>
              <TableHead className="text-right">
                {t('Recoverable charges')}
              </TableHead>
              <TableHead className="text-right">{t('Balance')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {store.chargeRegularization.items.map((regularization) => {
              const computed = regularization.computed || {};
              const balance = computed.balance || 0;
              return (
                <TableRow key={regularization._id}>
                  <TableCell>
                    {moment(regularization.periodStart).format('L')}
                    {' → '}
                    {moment(regularization.periodEnd).format('L')}
                  </TableCell>
                  <TableCell className="text-right">
                    <NumberFormat
                      value={computed.provisionsCalled}
                      className="inline"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <NumberFormat
                      value={computed.recoverableTotal}
                      className="inline"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <NumberFormat value={balance} className="inline" />
                    <div className="text-xs text-muted-foreground">
                      {balance >= 0
                        ? t('Overpaid (credit to tenant)')
                        : t('Complement due by tenant')}
                    </div>
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(regularization)}
                      title={t('Download')}
                    >
                      <LuDownload className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(regularization)}
                    >
                      <LuPencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(regularization)}
                    >
                      <LuTrash className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyIllustration label={t('No charge regularization recorded yet')} />
      )}

      <ChargeRegularizationFormDialog
        open={openForm}
        setOpen={setOpenForm}
        tenantId={tenant?._id}
        rents={tenant?.rents}
        regularization={editing}
        store={store}
      />
      <ConfirmDialog
        title={t('Delete this charge regularization?')}
        open={!!deleting}
        setOpen={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default observer(TenantChargeRegularization);
