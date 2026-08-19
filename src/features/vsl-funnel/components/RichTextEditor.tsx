import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Toggle } from '@/components/ui/toggle';
import { Bold, Heading1, Heading2, List } from 'lucide-react';

interface Props {
  content: JSONContent | null;
  onChange?: (content: JSONContent) => void;
  minHeight?: string;
  editable?: boolean;
}

// Extraído de CuadernoEditor.tsx (Hipótesis > Cuaderno) — mismo motor
// TipTap/StarterKit y misma barra de herramientas mínima (bold/H1/H2/
// bullets), ahora reusable donde haga falta un documento rich-text sin la
// UI de título/volver/guardar de un notebook completo (ej. hipotesis_doc
// de un VSL entry). editable=false oculta la barra y renderiza solo
// lectura (usado en el detalle expandido de un VSL entry).
export function RichTextEditor({ content, onChange, minHeight = '160px', editable = true }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content ?? '',
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getJSON() as JSONContent),
    editorProps: {
      attributes: {
        class: `prose prose-sm prose-invert max-w-none focus:outline-none px-3 py-2.5`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-secondary/20">
      {editable && (
        <div className="flex items-center gap-1 border-b border-border/40 px-2 py-1.5 bg-secondary/20">
          <Toggle size="sm" pressed={editor?.isActive('bold')} onPressedChange={() => editor?.chain().focus().toggleBold().run()}>
            <Bold className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" pressed={editor?.isActive('heading', { level: 1 })} onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" pressed={editor?.isActive('heading', { level: 2 })} onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" pressed={editor?.isActive('bulletList')} onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}>
            <List className="h-3.5 w-3.5" />
          </Toggle>
        </div>
      )}
      <EditorContent editor={editor} className="bg-background/40" />
    </div>
  );
}
