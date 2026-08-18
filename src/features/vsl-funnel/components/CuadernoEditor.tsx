import { useEffect, useState } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { ArrowLeft, Bold, Heading1, Heading2, List, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { fetchNotebookEntry, updateNotebookEntry } from '@/features/vsl-funnel/lib/notebookRepo';

interface Props {
  entryId: string;
  onBack: () => void;
  onSaved: () => void;
}

// Guardado con botón explícito, no autosave — una sola llamada al click,
// sin timers/debounce ni condición de carrera si se navega away a mitad
// de un ciclo de guardado. Más simple de hacer confiable.
export function CuadernoEditor({ entryId, onBack, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: () => setDirty(true),
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none min-h-[280px] focus:outline-none px-4 py-3',
      },
    },
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNotebookEntry(entryId)
      .then((entry) => {
        if (cancelled) return;
        setTitulo(entry.titulo);
        editor?.commands.setContent(entry.contenido ?? '');
        setDirty(false);
      })
      .catch((err) => {
        console.error('[CuadernoEditor] load failed:', err);
        toast.error('Error al cargar el documento');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [entryId, editor]);

  async function handleSave() {
    if (!editor || !titulo.trim()) { toast.error('El título es requerido'); return; }
    setSaving(true);
    try {
      await updateNotebookEntry(entryId, { titulo: titulo.trim(), contenido: editor.getJSON() as JSONContent });
      toast.success('Guardado');
      setDirty(false);
      onSaved();
    } catch (err) {
      console.error('[CuadernoEditor] save failed:', err);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={titulo}
          onChange={(e) => { setTitulo(e.target.value); setDirty(true); }}
          placeholder="Título del documento"
          className="bg-secondary/50 font-medium"
        />
        <Button size="sm" onClick={handleSave} disabled={saving || loading || !dirty} className="flex-shrink-0">
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Guardar
        </Button>
      </div>

      {loading ? (
        <div className="h-72 rounded-lg bg-secondary/40 animate-pulse" />
      ) : (
        <div className="border border-border/50 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-1 border-b border-border/40 px-2 py-1.5 bg-secondary/20">
            <Toggle
              size="sm"
              pressed={editor?.isActive('bold')}
              onPressedChange={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor?.isActive('heading', { level: 1 })}
              onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor?.isActive('heading', { level: 2 })}
              onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor?.isActive('bulletList')}
              onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List className="h-3.5 w-3.5" />
            </Toggle>
          </div>
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}
