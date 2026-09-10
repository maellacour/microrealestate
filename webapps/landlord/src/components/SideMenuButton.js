import { Button } from './ui/button';
import { cn } from '../utils';
import useTranslation from 'next-translate/useTranslation';

export default function SideMenuButton({
  item,
  selected,
  collapsed = false,
  className,
  onClick
}) {
  const { t } = useTranslation('common');
  const label = item?.labelId ? t(item.labelId) : null;

  // px-5 puts the 24px icon 20px from the edge, which is dead centre of the
  // collapsed 64px rail — so collapsing wipes the label away without the icon
  // moving at all. The label is clipped rather than hidden, so it still gives
  // the button its accessible name; `title` only adds the sighted hover hint.
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      title={collapsed && label ? label : undefined}
      className={cn(
        'h-12 w-full justify-start gap-3 rounded-none border-none px-5 hover:bg-primary/10',
        selected ? 'bg-primary text-primary-foreground' : null,
        className
      )}
      data-cy={item.dataCy}
    >
      {item.Icon ? <item.Icon className="size-6 shrink-0" /> : null}
      {label ? (
        <span
          className={cn(
            'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none',
            collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
          )}
        >
          {label}
        </span>
      ) : null}
    </Button>
  );
}
