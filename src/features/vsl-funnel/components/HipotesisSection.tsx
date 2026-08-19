import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchHipotesis, deleteHipotesis, type Hipotesis } from '@/features/delivery-tracker/lib/deliveryOsRepo';
import { HipotesisKanban } from './HipotesisKanban';
import { HipotesisRegistro } from './HipotesisRegistro';
import { HipotesisFormDialog } from './HipotesisFormDialog';
import { Cuaderno } from './Cuaderno';

type View = 'kanban' | 'registro' | 'cuaderno';

const VIEWS: { value: View; label: string }[] = [
  { value: 'kanban', label: 'Kanban' },
  { value: 'registro', label: 'Registro' },
  { value: 'cuaderno', label: 'Cuaderno' },
];

interface Props {
  clientId: string;
}

// Toggle simple con botones en vez de un 4to nivel de Tabs anidado — acá ya
// estamos en Delivery OS > VSL Funnel > Hipótesis, un Tabs más se siente
// pesado. El diálogo de alta/edición y la confirmación de borrado viven acá
// (no en Kanban/Registro) para que ambas vistas compartan el mismo estado.
export function HipotesisSection({ clientId }: Props) {
  const [view, setView] = useState<View>('kanban');
  const [hipotesis, setHipotesis] = useState<Hipotesis[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Hipotesis | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hipotesis | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHipotesis(await fetchHipotesis(clientId));
    } catch (err) {
      console.error('[HipotesisSection] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(h: Hipotesis) {
    setEditing(h);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteHipotesis(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error('[HipotesisSection] delete failed:', err);
      toast.error('Error al eliminar la hipótesis');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <HipotesisFormDialog clientId={clientId} open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={load} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta hipótesis?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="inline-flex gap-1 p-1 bg-secondary/50 rounded-lg w-fit">
          {VIEWS.map((v) => (
            <Button
              key={v.value}
              size="sm"
              variant="ghost"
              className={cn(
                'h-7 px-3 text-xs',
                view === v.value && 'bg-background shadow-sm',
              )}
              onClick={() => setView(v.value)}
            >
              {v.label}
            </Button>
          ))}
        </div>
        {view !== 'cuaderno' && (
          <Button size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Nueva hipótesis
          </Button>
        )}
      </div>

      {view === 'cuaderno' ? (
        <Cuaderno clientId={clientId} />
      ) : loading ? (
        <div className="h-40 rounded-lg bg-secondary/40 animate-pulse" />
      ) : view === 'kanban' ? (
        <HipotesisKanban hipotesis={hipotesis} onChanged={load} onEdit={openEdit} onDelete={setDeleteTarget} />
      ) : (
        <HipotesisRegistro hipotesis={hipotesis} onEdit={openEdit} onDelete={setDeleteTarget} />
      )}
    </div>
  );
}
