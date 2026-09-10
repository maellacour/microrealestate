import LeaseEndingSoon, { useLeasesEndingSoon } from './LeaseEndingSoon';
import { CelebrationIllustration } from '../Illustrations';
import { LuAlertTriangle } from 'react-icons/lu';
import { observer } from 'mobx-react-lite';
import PanelCard from '../PanelCard';
import { Separator } from '../ui/separator';
import { StoreContext } from '../../store';
import UnpaidRents from './UnpaidRents';
import { useContext } from 'react';
import useTranslation from 'next-translate/useTranslation';

/**
 * The one place on the dashboard that asks for action: the rents still owed
 * and the leases about to run out, which used to be two full-width cards on
 * either side of a chart.
 */
function NeedsAttention({ className }) {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const unpaid = store.dashboard.data.topUnpaid || [];
  const endingSoon = useLeasesEndingSoon();
  const isClear = !unpaid.length && !endingSoon.length;

  return (
    <PanelCard
      Icon={isClear ? null : LuAlertTriangle}
      title={t('Needs attention')}
      description={
        isClear ? null : t('Rents still owed and leases about to run out')
      }
      className={className}
    >
      {isClear ? (
        <CelebrationIllustration label={t('Nothing needs your attention')} />
      ) : (
        <div className="flex flex-col gap-4">
          <UnpaidRents items={unpaid} />
          {unpaid.length && endingSoon.length ? <Separator /> : null}
          <LeaseEndingSoon items={endingSoon} />
        </div>
      )}
    </PanelCard>
  );
}

export default observer(NeedsAttention);
