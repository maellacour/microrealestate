import { Card } from './ui/card';
import { cn } from '../utils';

/**
 * A titled block of content: a heading, an optional line explaining it, and
 * whatever the panel shows (a list, a chart, a table). Unlike MetricCard it
 * makes no assumption about the size of what it wraps.
 */
export default function PanelCard({
  Icon,
  title,
  description,
  actions,
  children,
  className
}) {
  return (
    <Card className={cn('flex flex-col p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-medium leading-none tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="text-muted-foreground mt-1.5 text-xs">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          actions
        ) : Icon ? (
          <Icon className="text-muted-foreground/60 size-5 shrink-0" />
        ) : null}
      </div>
      <div className="mt-4 flex-grow">{children}</div>
    </Card>
  );
}
