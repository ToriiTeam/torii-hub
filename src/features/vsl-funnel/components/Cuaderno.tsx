import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchNotebookEntries, createNotebookEntry, type NotebookEntrySummary } from '@/features/vsl-funnel/lib/notebookRepo';
import { CuadernoEditor } from './CuadernoEditor';

interface Props {
  clientId: string;
}

export function Cuaderno({ clientId }: Props) {
  const [entries, setEntries] = useState<NotebookEntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitulo, setNewTitulo] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await fetchNotebookEntries(clientId));
    } catch (err) {
      console.error('[Cuaderno] load failed:', err);
      toast.error('Error al cargar el cuaderno');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!newTitulo.trim()) { toast.error('El título es requerido'); return; }
    setCreating(true);
    try {
      const entry = await createNotebookEntry(clientId, newTitulo.trim());
      setDialogOpen(false);
      setNewTitulo('');
      await load();
      setOpenId(entry.id);
    } catch (err) {
      console.error('[Cuaderno] create failed:', err);
      toast.error('Error al crear el documento');
    } finally {
      setCreating(false);
    }
  }

  if (openId) {
    return (
      <CuadernoEditor
        entryId={openId}
        onBack={() => { setOpenId(null); load(); }}
        onSaved={load}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setNewTitulo(''); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Nuevo documento</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-2">
            <Label>Título</Label>
            <Input
              value={newTitulo}
              onChange={(e) => setNewTitulo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              className="bg-secondary/50"
              placeholder="Ej: Notas de estrategia de contenido"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !newTitulo.trim()}>
              {creating ? 'Creando…' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Nuevo documento
        </Button>
      </div>

      {loading ? (
        <div className="h-32 rounded-lg bg-secondary/40 animate-pulse" />
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
          Todavía no hay documentos en el cuaderno de este cliente.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {entries.map((entry) => (
            <Card
              key={entry.id}
              className="bg-card border-border/50 hover:border-primary/30 cursor-pointer transition-colors"
              onClick={() => setOpenId(entry.id)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{entry.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(entry.updated_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
