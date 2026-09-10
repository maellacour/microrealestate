import { Badge } from '../ui/badge';
import { cn } from '../../utils';
import useTranslation from 'next-translate/useTranslation';

// Unpaid stays amber and paid green, as everywhere else in the app, but the
// emphasis is inverted: early in a month nearly every row is unpaid, so the
// solid fill is kept for the state worth spotting and the common one is quiet.
const STATUSES = {
  paid: { labelId: 'Paid', variant: 'success' },
  partiallypaid: {
    labelId: 'Partially paid',
    variant: 'outline',
    className: 'bg-warning/15 text-warning border-warning/30'
  },
  notpaid: {
    labelId: 'Not paid',
    variant: 'outline',
    className: 'text-warning border-warning/40'
  }
};

export default function RentStatusBadge({ status, className }) {
  const { t } = useTranslation('common');
  const rentStatus = STATUSES[status];

  return rentStatus ? (
    <Badge
      variant={rentStatus.variant}
      className={cn('font-normal', rentStatus.className, className)}
    >
      {t(rentStatus.labelId)}
    </Badge>
  ) : null;
}
