import { RadioGroupContext } from './RadioFieldGroup';
import { useContext } from 'react';

export function RadioField({ value, label, disabled, ...props }) {
  const ctx = useContext(RadioGroupContext) || {};
  const id = `${ctx.name}-${value}`;

  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 text-sm cursor-pointer"
    >
      <input
        type="radio"
        id={id}
        name={ctx.name}
        value={value}
        checked={ctx.value === value}
        onChange={ctx.onChange}
        disabled={disabled || ctx.disabled}
        className="size-4 accent-primary"
        {...props}
      />
      {label}
    </label>
  );
}
