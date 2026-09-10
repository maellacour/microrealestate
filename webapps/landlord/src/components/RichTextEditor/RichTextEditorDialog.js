import dynamic from 'next/dynamic';
import { useCallback } from 'react';

const RichTextEditor = dynamic(import('./RichTextEditor'), {
  ssr: false
});

// Full-screen editor overlay. The editor renders its own header and close
// button, so a plain fixed container is enough (no modal chrome needed).
export default function RichTextEditorDialog({
  open,
  setOpen,
  onLoad,
  onSave,
  title,
  fields,
  editable
}) {
  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background">
      <RichTextEditor
        title={title}
        fields={fields}
        onLoad={onLoad}
        onSave={onSave}
        onClose={handleClose}
        showPrintButton
        editable={editable}
      />
    </div>
  );
}
