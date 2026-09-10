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
import ChargeRegularizationApplyDialog from './ChargeRegularizationApplyDialog';
import ChargeRegularizationFormDialog from './ChargeRegularizationFormDialog';
import { Checkbox } from '../ui/checkbox';
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
  const [applying, setApplying] = useState(null);

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

  const handleUnapply = useCallback(
    async (regularization) => {
      const { status } = await store.chargeRegularization.unapply(
        regularization._id
      );
      if (status !== 200) {
        toast.error(t('Something went wrong'));
      }
    },
    [store, t]
  );

  const handleShare = useCallback(
    async (regularization, shared) => {
      const { status } = await store.chargeRegularization.update({
        _id: regularization._id,
        shared
      });
      if (status !== 200) {
        toast.error(t('Something went wrong'));
      }
    },
    [store, t]
  );

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
                  <TableCell className="flex items-center justify-end gap-1">
                    {regularization.appliedToTerm ? (
                      <>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {t('Applied to {{term}}', {
                            term: moment(
                              String(regularization.appliedToTerm),
                              'YYYYMMDDHH'
                            ).format('MMM YYYY')
                          })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnapply(regularization)}
                        >
                          {t('Unapply')}
                        </Button>
                      </>
                    ) : balance ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setApplying(regularization)}
                      >
                        {t('Apply to a term')}
                      </Button>
                    ) : null}
                    <label className="flex items-center gap-1 text-xs mr-1 whitespace-nowrap">
                      <Checkbox
                        checked={!!regularization.shared}
                        onCheckedChange={(checked) =>
                          handleShare(regularization, !!checked)
                        }
                      />
                      {t('Share with tenant')}
                    </label>
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
                      disabled={!!regularization.appliedToTerm}
                      onClick={() => openEditDialog(regularization)}
                    >
                      <LuPencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!!regularization.appliedToTerm}
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
      <ChargeRegularizationApplyDialog
        open={!!applying}
        setOpen={(open) => !open && setApplying(null)}
        regularization={applying}
        rents={tenant?.rents}
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
