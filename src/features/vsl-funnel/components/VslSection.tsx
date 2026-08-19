import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { VslEntryCard } from './VslEntryCard';
import { LandingsSueltasSection } from './LandingsSueltasSection';
import { LandingVariantFormDialog } from './LandingVariantFormDialog';
import {
  fetchVslEntries, fetchLandingVariants, addVslEntry, deleteLandingVariant,
  type VslEntry, type LandingVariant,
} from '@/features/vsl-funnel/lib/vslFunnelRepo';
import type { Database } from '@/integrations/supabase/types';

type TrackedLanding = Database['public']['Tables']['tracked_landings']['Row'];

interface Props {
  clientId: string;
}

export function VslSection({ clientId }: Props) {
  const [entries, setEntries] = useState<VslEntry[]>([]);
  const [variants, setVariants] = useState<LandingVariant[]>([]);
  const [trackedLandings, setTrackedLandings] = useState<TrackedLanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [variantDialog, setVariantDialog] = useState<{ vslEntryId: string | null; editing: LandingVariant | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LandingVariant | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, variantsData, landingsRes] = await Promise.all([
        fetchVslEntries(clientId),
        fetchLandingVariants(clientId),
        supabase.from('tracked_landings').select('*').eq('client_id', clientId).order('label'),
      ]);
      setEntries(entriesData);
      setVariants(variantsData);
      setTrackedLandings(landingsRes.data ?? []);
    } catch (err) {
      console.error('[VslSection] load failed:', err);
      toast.error('Error al cargar VSL');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreateVsl() {
    setCreating(true);
    try {
      const created = await addVslEntry(clientId, {
        titulo: 'Nuevo VSL', copy: null, codigo_pegado: null, notas: null,
        hipotesis_doc: null, fecha_desde: null, fecha_hasta: null, tracked_landing_id: null,
      });
      await load();
      setExpandedId(created.id);
    } catch (err) {
      console.error('[VslSection] create VSL failed:', err);
      toast.error('Error al crear el VSL');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteVariant() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLandingVariant(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error('[VslSection] delete variant failed:', err);
      toast.error('Error al eliminar la landing');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-16 rounded-2xl bg-secondary/40 animate-pulse" />
        <div className="h-16 rounded-2xl bg-secondary/40 animate-pulse" />
      </div>
    );
  }

  const sueltas = variants.filter((v) => v.vsl_entry_id === null);
  const variantsByEntry = new Map<string, LandingVariant[]>();
  for (const v of variants) {
    if (!v.vsl_entry_id) continue;
    const arr = variantsByEntry.get(v.vsl_entry_id) ?? [];
    arr.push(v);
    variantsByEntry.set(v.vsl_entry_id, arr);
  }

  return (
    <div className="space-y-6">
      <LandingVariantFormDialog
        clientId={clientId}
        open={!!variantDialog}
        onOpenChange={(open) => !open && setVariantDialog(null)}
        editing={variantDialog?.editing ?? null}
        vslEntryId={variantDialog?.vslEntryId ?? null}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta landing?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVariant} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">VSL</h1>
          <p className="text-sm text-muted-foreground">Registro de VSL con sus landings asociadas — copy, video, hipótesis y variantes en un solo lugar.</p>
        </div>
        <Button size="sm" onClick={handleCreateVsl} disabled={creating}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Nuevo VSL
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
          Todavía no hay VSL cargados para este cliente.
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => (
            <VslEntryCard
              key={entry.id}
              entry={entry}
              variants={variantsByEntry.get(entry.id) ?? []}
              trackedLandings={trackedLandings}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId((cur) => (cur === entry.id ? null : entry.id))}
              onChanged={load}
              onAddVariant={() => setVariantDialog({ vslEntryId: entry.id, editing: null })}
              onEditVariant={(v) => setVariantDialog({ vslEntryId: entry.id, editing: v })}
              onDeleteVariant={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <LandingsSueltasSection
        variants={sueltas}
        onAdd={() => setVariantDialog({ vslEntryId: null, editing: null })}
        onEdit={(v) => setVariantDialog({ vslEntryId: null, editing: v })}
        onDelete={setDeleteTarget}
      />
    </div>
  );
}
