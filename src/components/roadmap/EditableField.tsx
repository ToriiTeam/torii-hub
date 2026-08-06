import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Click-to-edit field: view mode is plain text, a click swaps in an
// Input/Textarea autofocused in place, blur saves directly (no confirm
// step, no modal) — same "celda editable, guardado directo" contract as
// VentasPage.tsx in torii-portal, adapted to prose-length roadmap fields
// (a dense table cell would be too small for these).

interface EditableFieldProps {
  value: string | null;
  onSave: (next: string) => Promise<void> | void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  textClassName?: string;
}

export function EditableField({
  value, onSave, placeholder = 'Sin definir — click para completar', multiline = true, className, textClassName,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const [errored, setErrored] = useState(false);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => { setDraft(value ?? ''); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  async function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next === (value ?? '')) return;
    setSaving(true);
    setErrored(false);
    try {
      await onSave(next);
    } catch {
      setErrored(true);
      setDraft(value ?? '');
      setTimeout(() => setErrored(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    const shared = {
      ref,
      className: cn(multiline ? 'min-h-16' : 'h-8', 'text-sm', className),
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
        if (!multiline && e.key === 'Enter') (e.target as HTMLInputElement).blur();
      },
    };
    return multiline ? <Textarea {...shared} /> : <Input {...shared} />;
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn(
        'min-h-8 rounded-md border border-transparent px-2 py-1.5 text-sm cursor-text hover:border-border hover:bg-secondary/30 whitespace-pre-wrap',
        !draft && 'text-muted-foreground italic',
        textClassName,
      )}
    >
      {draft || placeholder}
      {saving && <Loader2 className="inline-block h-3 w-3 ml-2 animate-spin text-muted-foreground" />}
      {errored && <span className="ml-2 text-xs text-destructive">No se pudo guardar</span>}
    </div>
  );
}
