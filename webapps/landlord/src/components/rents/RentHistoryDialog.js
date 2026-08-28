import {
  Accordion,
  AccordionDetails,
  AccordionSummary
} from '@material-ui/core';
import { Card, CardContent, CardHeader } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { LuChevronsUpDown, LuDownload, LuPencil } from 'react-icons/lu';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { downloadDocument } from '../../utils/fetch';
import { getPeriod } from '../../utils';
import Loading from '../Loading';
import moment from 'moment';
import NewPaymentDialog from '../payment/NewPaymentDialog';
import RentDetails from './RentDetails';
import { StoreContext } from '../../store';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import useTranslation from 'next-translate/useTranslation';

function RentListItem({ rent, tenant, onClick }) {
  const { t } = useTranslation('common');

  const handleClick = useCallback(
    (event) => {
      event.stopPropagation();
      onClick?.(event);
    },
    [onClick]
  );

  return (
    <Card className="p-2 cursor-pointer" onClick={handleClick}>
      <CardHeader className="flex flex-row justify-between items-center">
        <div className="text-xl">
          {getPeriod(t, rent.term, tenant.occupant.frequency)}
        </div>
        <div>
          <Button variant="ghost" size="icon" onClick={handleClick}>
            <LuPencil />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <RentDetails rent={rent} />
      </CardContent>
    </Card>
  );
}

function YearRentList({ tenant, year, onClick }) {
  const rents =
    tenant.rents?.filter(({ term }) => String(term).slice(0, 4) === year) || [];

  const handleClick = useCallback(
    ({ occupant }, rent) =>
      () => {
        onClick({ _id: occupant._id, ...rent, occupant });
      },
    [onClick]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 w-full">
      {rents?.map((rent) => {
        return (
          <RentListItem
            key={rent.term}
            rent={rent}
            tenant={tenant}
            onClick={handleClick(tenant, rent)}
          />
        );
      })}
    </div>
  );
}

function RentHistory({ tenantId }) {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState();
  const [rentYears, setRentYears] = useState([]);
  const [expandedYear, setExpandedYear] = useState(
    moment().startOf('month').format('YYYYMMDDHH').slice(0, 4)
  );
  const [openNewPaymentDialog, setOpenNewPaymentDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const fetchTenantRents = useCallback(
    async (showLoadingAnimation = true) => {
      showLoadingAnimation && setLoading(true);
      const response = await store.rent.fetchTenantRents(tenantId);
      if (response.status !== 200) {
        toast.error(t('Cannot get tenant information'));
      } else {
        const tenant = response.data;
        setTenant(tenant);
        setRentYears(
          Array.from(
            tenant.rents.reduce((acc, { term }) => {
              acc.add(String(term).slice(0, 4));
              return acc;
            }, new Set())
          )
        );
      }
      showLoadingAnimation && setLoading(false);
    },
    [store, t, tenantId]
  );

  useEffect(() => {
    fetchTenantRents();
  }, [t, tenantId, store.rent, store, fetchTenantRents]);

  const handleAccordionChange = (year) => (event, isExpanded) => {
    setExpandedYear(isExpanded ? year : false);
  };

  const handleClick = useCallback(
    (rent) => {
      setSelectedPayment(rent);
      setOpenNewPaymentDialog(true);
    },

    [setOpenNewPaymentDialog, setSelectedPayment]
  );

  const handleClose = useCallback(() => {
    fetchTenantRents(false);
  }, [fetchTenantRents]);

  return (
    <>
      <NewPaymentDialog
        open={openNewPaymentDialog}
        setOpen={setOpenNewPaymentDialog}
        data={selectedPayment}
        onClose={handleClose}
      />
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="pb-4">
            <div className="text-xl font-semibold">{tenant.occupant.name}</div>
            {tenant.occupant.beginDate && tenant.occupant.endDate && (
              <div className="text-muted-foreground text-xs">
                {t('Contract from {{beginDate}} to {{endDate}}', {
                  beginDate: moment(
                    tenant.occupant.beginDate,
                    'DD/MM/YYYY'
                  ).format('L'),
                  endDate: moment(tenant.occupant.endDate, 'DD/MM/YYYY').format(
                    'L'
                  )
                })}
              </div>
            )}
          </div>
          <div className="overflow-y-auto p-4">
            {rentYears.map((year) => {
              return (
                <Accordion
                  key={year}
                  expanded={expandedYear === year}
                  onChange={handleAccordionChange(year)}
                >
                  <AccordionSummary expandIcon={<LuChevronsUpDown />}>
                    {year}
                  </AccordionSummary>
                  {expandedYear === year ? (
                    <AccordionDetails>
                      <YearRentList
                        tenant={tenant}
                        year={year}
                        onClick={handleClick}
                      />
                    </AccordionDetails>
                  ) : null}
                </Accordion>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export default function RentHistoryDialog({ open, setOpen, data: tenant }) {
  const { t } = useTranslation('common');
  const handleClose = useCallback(() => setOpen(false), [setOpen]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  const handleDownloadStatement = useCallback(async () => {
    if (!tenant?._id) {
      return;
    }
    const trimmedNote = note.trim();
    try {
      await downloadDocument({
        endpoint: `/documents/payment_history/${tenant._id}/all${
          trimmedNote ? `?note=${encodeURIComponent(trimmedNote)}` : ''
        }`,
        documentName: `${tenant.name}-${t('Rent payment statement')}.pdf`
      });
      setNoteOpen(false);
      setNote('');
    } catch (error) {
      console.error(error);
      toast.error(t('Something went wrong'));
    }
  }, [tenant, t, note]);

  return (
    <Drawer open={open} onOpenChange={setOpen} dismissible={false}>
      <DrawerContent className="w-full h-full p-4">
        <DrawerHeader className="flex justify-between items-center p-0">
          <DrawerTitle className="hidden">{t('Rent schedule')}</DrawerTitle>
          <span className="text-xl font-semibold">{t('Rent schedule')}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setNoteOpen(true)}
            >
              <LuDownload className="size-4" />
              {t('Rent payment statement')}
            </Button>
            <Button variant="secondary" onClick={handleClose}>
              {t('Close')}
            </Button>
          </div>
        </DrawerHeader>
        {tenant ? <RentHistory tenantId={tenant._id} /> : null}
      </DrawerContent>
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Rent payment statement')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <span className="text-sm text-muted-foreground">
              {t('Add an optional note to print at the end of the statement.')}
            </span>
            <Textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('Note (optional)')}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setNoteOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button className="gap-1" onClick={handleDownloadStatement}>
              <LuDownload className="size-4" />
              {t('Download')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}
