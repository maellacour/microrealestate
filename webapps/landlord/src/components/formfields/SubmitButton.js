import { Button } from '../ui/button';
import { LuLoader } from 'react-icons/lu';
import { useFormikContext } from 'formik';

// Formik-aware submit button (shadcn). Drop-in replacement for the former MUI
// commonui SubmitButton: same { label } API and data-cy="submit" hook.
export function SubmitButton({ label, disabled, ...props }) {
  const { isSubmitting } = useFormikContext();

  // Swallow MUI-only props so they never reach the DOM / shadcn Button.
  delete props.size;
  delete props.variant;
  delete props.color;

  return (
    <Button
      type="submit"
      disabled={isSubmitting || disabled}
      data-cy="submit"
      {...props}
    >
      {isSubmitting ? <LuLoader className="mr-2 size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
