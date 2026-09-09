import { Children, cloneElement, createContext, useContext } from 'react';
import { cn } from '../../utils';
import { LuCheck } from 'react-icons/lu';

// Lightweight vertical stepper, drop-in for the former MUI Stepper/Step/
// StepLabel/StepContent API: <Stepper activeStep><Step><StepLabel/>
// <StepContent/></Step>...</Stepper>. Only the active step's content shows.

const StepContext = createContext({
  index: 0,
  active: false,
  completed: false,
  last: false
});

export function Stepper({ activeStep = 0, children, className }) {
  const steps = Children.toArray(children).filter(Boolean);
  return (
    <div className={cn('flex flex-col', className)}>
      {steps.map((step, index) =>
        cloneElement(step, {
          key: index,
          index,
          active: index === activeStep,
          completed: index < activeStep,
          last: index === steps.length - 1
        })
      )}
    </div>
  );
}

export function Step({ index, active, completed, last, children }) {
  return (
    <StepContext.Provider value={{ index, active, completed, last }}>
      <div className="relative pl-11 pb-4">
        {!last ? (
          <span
            className={cn(
              'absolute left-4 top-9 -bottom-1 w-px',
              completed ? 'bg-primary' : 'bg-border'
            )}
            aria-hidden="true"
          />
        ) : null}
        {children}
      </div>
    </StepContext.Provider>
  );
}

export function StepLabel({ children }) {
  const { index, active, completed } = useContext(StepContext);
  const filled = active || completed;
  return (
    <div className="flex items-center gap-3 min-h-8">
      <span
        className={cn(
          'absolute left-0 flex size-8 items-center justify-center rounded-full text-sm font-semibold',
          filled
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {completed ? <LuCheck className="size-4" /> : index + 1}
      </span>
      <span
        className={cn(
          'font-medium',
          filled ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function StepContent({ children }) {
  const { active } = useContext(StepContext);
  if (!active) {
    return null;
  }
  return <div className="mt-3">{children}</div>;
}
