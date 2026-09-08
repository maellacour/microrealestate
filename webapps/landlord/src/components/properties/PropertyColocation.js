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
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import ColocationRegularizeDialog from './ColocationRegularizeDialog';
import ConfirmDialog from '../ConfirmDialog';
import { EmptyIllustration } from '../Illustrations';
import { Input } from '../ui/input';
import { LuTrash } from 'react-icons/lu';
import NumberFormat from '../NumberFormat';
import { observer } from 'mobx-react-lite';
import { StoreContext } from '../../store';
import { toast } from 'sonner';
import useTranslation from 'next-translate/useTranslation';

const round = (value) => Math.round((value || 0) * 100) / 100;

function PropertyColocation({ propertyId }) {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [toAdd, setToAdd] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openRegularize, setOpenRegularize] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        store.colocation.fetch(propertyId),
        store.tenant.fetch()
      ]);
      setLoading(false);
    })();
  }, [propertyId, store]);

  const colocation = useMemo(
    () => store.colocation.items.find((c) => c.propertyId === propertyId),
    [store.colocation.items, propertyId]
  );

  useEffect(() => {
    if (colocation) {
      setMembers(
        colocation.members.map((m) => ({
          tenantId: m.tenantId,
          sharePercent: m.sharePercent,
          name: m.tenant?.name,
          rentAmount: m.tenant?.rentAmount || 0
        }))
      );
    }
  }, [colocation]);

  // tenants that rent this property, eligible as colocation members
  const tenantsOnProperty = useMemo(
    () =>
      store.tenant.items.filter((tenant) =>
        (tenant.properties || []).some(
          (p) => (p.propertyId?._id || p.propertyId) === propertyId
        )
      ),
    [store.tenant.items, propertyId]
  );

  const candidates = useMemo(
    () =>
      tenantsOnProperty.filter(
        (tenant) => !members.some((m) => m.tenantId === tenant._id)
      ),
    [tenantsOnProperty, members]
  );

  const totalShare = round(
    members.reduce((sum, m) => sum + (Number(m.sharePercent) || 0), 0)
  );
  const totalRent = round(
    members.reduce((sum, m) => sum + (m.rentAmount || 0), 0)
  );

  const handleCreate = useCallback(async () => {
    const { status } = await store.colocation.create({
      propertyId,
      members: tenantsOnProperty.map((tenant) => ({ tenantId: tenant._id }))
    });
    if (status !== 200) {
      toast.error(t('Something went wrong'));
    }
  }, [propertyId, tenantsOnProperty, store, t]);

  const handleSave = useCallback(async () => {
    const { status } = await store.colocation.update({
      _id: colocation._id,
      members: members.map((m) => ({
        tenantId: m.tenantId,
        sharePercent: Number(m.sharePercent) || 0
      }))
    });
    if (status !== 200) {
      toast.error(t('Something went wrong'));
    } else {
      toast.success(t('Saved'));
    }
  }, [colocation, members, store, t]);

  const handleDelete = useCallback(async () => {
    const { status } = await store.colocation.delete([colocation._id]);
    if (status !== 200) {
      toast.error(t('Something went wrong'));
    }
  }, [colocation, store, t]);

  if (loading) {
    return null;
  }

  if (!colocation) {
    return (
      <div className="space-y-4">
        {tenantsOnProperty.length ? (
          <>
            <div className="text-muted-foreground">
              {t(
                'Group the leases renting this property as a colocation to manage shares and shared charges together.'
              )}
            </div>
            <Button onClick={handleCreate} data-cy="createColocation">
              {t('Create a colocation')}
            </Button>
          </>
        ) : (
          <EmptyIllustration
            label={t('Create leases on this property first')}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Tenant')}</TableHead>
            <TableHead className="text-right">{t('Rent')}</TableHead>
            <TableHead className="w-32 text-right">{t('Share (%)')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member, index) => (
            <TableRow key={member.tenantId}>
              <TableCell>{member.name}</TableCell>
              <TableCell className="text-right">
                <NumberFormat value={member.rentAmount} className="inline" />
              </TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="text-right"
                  data-cy={`colocationShare${index}`}
                  value={member.sharePercent}
                  onChange={(event) =>
                    setMembers((current) =>
                      current.map((m, i) =>
                        i === index
                          ? { ...m, sharePercent: event.target.value }
                          : m
                      )
                    )
                  }
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setMembers((current) =>
                      current.filter((_, i) => i !== index)
                    )
                  }
                >
                  <LuTrash className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-between text-sm">
        <span className={totalShare === 100 ? '' : 'text-warning'}>
          {t('Total share')}: {totalShare}%
        </span>
        <span>
          {t('Total rent')}:{' '}
          <NumberFormat value={totalRent} className="inline" />
        </span>
      </div>

      {candidates.length ? (
        <div className="flex items-center gap-2">
          <Select value={toAdd} onValueChange={setToAdd}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={t('Add a tenant')} />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((tenant) => (
                <SelectItem key={tenant._id} value={tenant._id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={!toAdd}
            onClick={() => {
              const tenant = candidates.find((c) => c._id === toAdd);
              if (tenant) {
                setMembers((current) => [
                  ...current,
                  {
                    tenantId: tenant._id,
                    sharePercent: 0,
                    name: tenant.name,
                    rentAmount:
                      (tenant.properties || []).reduce(
                        (sum, p) => sum + (p.rent || 0),
                        0
                      ) || 0
                  }
                ]);
                setToAdd('');
              }
            }}
          >
            {t('Add')}
          </Button>
        </div>
      ) : null}

      <div className="flex justify-between items-center gap-2">
        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
          {t('Delete the colocation')}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenRegularize(true)}>
            {t('Common charges regularization')}
          </Button>
          <Button onClick={handleSave} data-cy="saveColocation">
            {t('Save')}
          </Button>
        </div>
      </div>

      <ColocationRegularizeDialog
        open={openRegularize}
        setOpen={setOpenRegularize}
        colocationId={colocation._id}
        store={store}
      />
      <ConfirmDialog
        title={t('Delete this colocation?')}
        open={confirmDelete}
        setOpen={setConfirmDelete}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default observer(PropertyColocation);
