import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as React from 'react';
import { cn } from '../../utils';

const Progress = React.forwardRef(
  ({ className, indicatorClassName, value, ...props }, ref) => {
    // The bar grows from zero on mount so the figure above it and the share it
    // represents arrive together. Reduced motion gets the final state at once.
    const [shown, setShown] = React.useState(0);
    React.useEffect(() => {
      const frame = requestAnimationFrame(() => setShown(value || 0));
      return () => cancelAnimationFrame(frame);
    }, [value]);

    return (
      <ProgressPrimitive.Root
        ref={ref}
        value={value}
        className={cn(
          'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full w-full flex-1 bg-primary transition-transform duration-700 ease-out motion-reduce:transition-none',
            indicatorClassName
          )}
          style={{ transform: `translateX(-${100 - shown}%)` }}
        />
      </ProgressPrimitive.Root>
    );
  }
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
