import { Button } from '../ui/button';
import { LuLoader } from 'react-icons/lu';
import { useFormikContext } from 'formik';

// Formik-aware submit button (shadcn). Drop-in replacement for the former MUI
// commonui SubmitButton: same { label } API and data-cy="submit" hook. MUI-only
// props (size/variant/color) are swallowed so they never reach the DOM.
export function SubmitButton({
  label,
  disabled,
  size, // eslint-disable-line no-unused-vars
  variant, // eslint-disable-line no-unused-vars
  color, // eslint-disable-line no-unused-vars
  ...props
}) {
  const { isSubmitting } = useFormikContext();
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
