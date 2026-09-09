import { cn } from '../../utils';
import { createContext } from 'react';
import { useField } from 'formik';

// Shares the formik field (name/value/onChange) with the RadioField children,
// so a native radio group stays a controlled formik field.
export const RadioGroupContext = createContext(null);

export function RadioFieldGroup({ children, label, disabled, ...props }) {
  const [field, meta] = useField(props.name);
  const hasError = !!(meta.touched && meta.error);

  return (
    <fieldset
      className="flex flex-col gap-2 pt-2"
      aria-label={props['aria-label']}
    >
      {label ? (
        <legend
          className={cn(
            'text-muted-foreground mb-1',
            hasError ? 'text-destructive' : ''
          )}
        >
          {label}
        </legend>
      ) : null}
      <RadioGroupContext.Provider
        value={{
          name: field.name,
          value: field.value,
          onChange: field.onChange,
          disabled
        }}
      >
        <div className="flex flex-col gap-1.5">{children}</div>
      </RadioGroupContext.Provider>
      {hasError ? (
        <div className="text-destructive text-xs">{meta.error}</div>
      ) : null}
    </fieldset>
  );
}
