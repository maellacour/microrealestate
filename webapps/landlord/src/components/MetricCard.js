import { Card } from './ui/card';
import { cn } from '../utils';
import { LuChevronRight } from 'react-icons/lu';

const TONES = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground'
};

/**
 * A single figure: a small caps label, the value, and an optional line of
 * context under it. Used wherever the app shows a headline number (dashboard,
 * rents overview, property results). A card that leads somewhere carries a
 * chevron, so a clickable figure is told apart from a static one at rest.
 */
export default function MetricCard({
  label,
  value,
  hint,
  Icon,
  tone = 'default',
  onClick,
  children,
  className,
  dataCy
}) {
  const interactive = !!onClick;

  return (
    <Card
      data-cy={dataCy}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick(event);
              }
            }
          : undefined
      }
      className={cn(
        'flex flex-col gap-1 p-6',
        interactive
          ? 'group hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-ring cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2'
          : null,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {Icon ? <Icon className="text-muted-foreground/60 size-4" /> : null}
          {interactive ? (
            <LuChevronRight className="text-muted-foreground/50 group-hover:text-foreground size-4 transition-colors" />
          ) : null}
        </span>
      </div>
      <div
        className={cn(
          'text-2xl font-semibold leading-tight tabular-nums',
          TONES[tone]
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="text-muted-foreground text-xs">{hint}</div>
      ) : null}
      {children}
    </Card>
  );
}
