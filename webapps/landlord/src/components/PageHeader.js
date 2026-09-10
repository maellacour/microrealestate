import { cn } from '../utils';

/**
 * Screen-level heading: the page name, an optional line of context under it
 * (period, address, lease dates…) and an optional slot for the controls that
 * drive the whole page (period picker, add button…).
 */
export default function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <div className="text-muted-foreground mt-1.5 text-sm">{subtitle}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
