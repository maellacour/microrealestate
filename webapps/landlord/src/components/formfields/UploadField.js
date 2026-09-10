import { useCallback, useEffect, useRef } from 'react';
import { useField, useFormikContext } from 'formik';
import { Button } from '../ui/button';
import { cn } from '../../utils';
import FormField from './FormField';
import { Input } from '../ui/input';
import { LuPaperclip } from 'react-icons/lu';

export function UploadField({ label, disabled, ...props }) {
  const { isSubmitting, setFieldValue } = useFormikContext();
  const [field, meta] = useField(props.name);
  const hasError = !!(meta.touched && meta.error);
  const inputRef = useRef(null);

  // Start empty: a File cannot be rehydrated from stored form state.
  useEffect(() => {
    setFieldValue(field.name, null);
  }, [field.name, setFieldValue]);

  const handleChange = useCallback(
    (event) => {
      setFieldValue(field.name, event.target.files[0], true);
    },
    [field.name, setFieldValue]
  );

  return (
    <FormField name={props.name} label={label}>
      <div className="flex gap-2">
        <Input
          readOnly
          value={field.value?.name ?? ''}
          disabled={disabled || isSubmitting}
          className={cn(
            'flex-grow',
            hasError ? 'border-destructive border-2' : ''
          )}
        />
        <input
          ref={inputRef}
          type="file"
          id={props.name}
          name={props.name}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || isSubmitting}
          onClick={() => inputRef.current?.click()}
        >
          <LuPaperclip className="size-4" />
        </Button>
      </div>
    </FormField>
  );
}
