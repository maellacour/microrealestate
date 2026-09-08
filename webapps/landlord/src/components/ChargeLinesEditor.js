import { LuPlus, LuTrash } from 'react-icons/lu';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import useTranslation from 'next-translate/useTranslation';

export const emptyLine = () => ({ label: '', amount: '', recoverable: true });

// Controlled editor for a list of charge lines { label, amount, recoverable }.
// Shared by the tenant regularization form and the colocation common-charges
// dialog.
export default function ChargeLinesEditor({ lines, onChange }) {
  const { t } = useTranslation('common');

  const update = (index, patch) =>
    onChange(
      lines.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );

  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            className="flex-1"
            placeholder={t('Description')}
            value={line.label}
            onChange={(event) => update(index, { label: event.target.value })}
          />
          <Input
            className="w-32"
            type="number"
            min="0"
            step="0.01"
            placeholder={t('Amount')}
            value={line.amount}
            onChange={(event) => update(index, { amount: event.target.value })}
          />
          <label className="flex items-center gap-1 text-sm whitespace-nowrap">
            <Checkbox
              checked={line.recoverable}
              onCheckedChange={(checked) =>
                update(index, { recoverable: !!checked })
              }
            />
            {t('Recoverable')}
          </label>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(lines.filter((_, i) => i !== index))}
          >
            <LuTrash className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...lines, emptyLine()])}
      >
        <LuPlus className="size-4" />
        {t('Add a line')}
      </Button>
    </div>
  );
}
