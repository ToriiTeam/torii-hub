import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { EXPENSE_COST_TYPES } from '@/features/finanzas/lib/types';
import type { ExpenseCostType } from '@/features/finanzas/lib/types';
import type { ExpenseCategoryBucket } from '@/features/finanzas/lib/categorize';
import type { FinanzasTabProps } from './types';

// The 6 canonical buckets from categorize.ts — used here directly as the
// Select's real options, not passed through categorize() on insert. New
// rows are created with one of these exact values, so they never need
// bucketing/fallback-to-Otros the way historical messy data does.
const CATEGORY_OPTIONS: ExpenseCategoryBucket[] = ['Equipo', 'Adquisición', 'Software', 'Publicidad', 'Mentoría', 'Otros'];

// No prior color mapping existed for these 6 categories anywhere in the
// Hub (checked) — this is a new mapping. Only 4 of the theme's 6 semantic
// colors are visually distinct (primary and destructive are both red), so
// Mentoría/Otros fall back to two shades of neutral gray instead of reusing
// a red that would visually collide with Publicidad.
const CATEGORY_BADGE_CLASS: Record<ExpenseCategoryBucket, string> = {
  Equipo: 'bg-info/20 text-info',
  Adquisición: 'bg-warning/20 text-warning',
  Software: 'bg-success/20 text-success',
  Publicidad: 'bg-primary/20 text-primary',
  Mentoría: 'bg-secondary text-foreground',
  Otros: 'bg-secondary text-muted-foreground',
};

// Same CF/CV → Fijo/Variable convention already used in the old
// Finanzas.tsx's costTypeBadge().
function costTypeBadge(ct: string | null) {
  if (ct === 'CF') return <Badge className="text-xs border-0 bg-info/20 text-info">Fijo</Badge>;
  if (ct === 'CV') return <Badge className="text-xs border-0 bg-warning/20 text-warning">Variable</Badge>;
  return <span className="text-muted-foreground text-xs">—</span>;
}

function categoryBadge(category: string | null) {
  const cat = (CATEGORY_OPTIONS as string[]).includes(category ?? '') ? (category as ExpenseCategoryBucket) : null;
  if (!cat) return <span className="text-muted-foreground text-xs">{category ?? '—'}</span>;
  return <Badge className={cn('text-xs border-0', CATEGORY_BADGE_CLASS[cat])}>{cat}</Badge>;
}

function fmtUSD(n: number): string {
  return `$${Math.round(n).toLocaleString('es')}`;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yy', { locale: es }); } catch { return '—'; }
}

// ─── AddEgresoDialog ──────────────────────────────────────────────────────

function AddEgresoDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'),
    category: 'Otros' as ExpenseCategoryBucket, cost_type: 'CV' as ExpenseCostType, description: '',
  });
  const [saving, setSaving] = useState(false);

  function upd<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!form.name.trim() || !form.amount) { toast.error('Concepto y monto son requeridos'); return; }
    setSaving(true);
    const { error } = await supabase.from('expenses').insert({
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      date: form.date,
      category: form.category,
      cost_type: form.cost_type,
      description: form.description || null,
    });
    setSaving(false);
    if (error) { toast.error('Error al guardar el egreso'); return; }
    toast.success('Egreso registrado');
    onSaved(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>Agregar Egreso</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Concepto *</Label>
            <Input value={form.name} onChange={(e) => upd('name', e.target.value)} className="bg-secondary/50 mt-1" placeholder="ej. Suscripción HubSpot" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Monto (USD) *</Label>
            <Input type="number" value={form.amount} onChange={(e) => upd('amount', e.target.value)} className="bg-secondary/50 mt-1" placeholder="0" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fecha</Label>
            <Input type="date" value={form.date} onChange={(e) => upd('date', e.target.value)} className="bg-secondary/50 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Categoría</Label>
            <Select value={form.category} onValueChange={(v) => upd('category', v as ExpenseCategoryBucket)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de costo</Label>
            <Select value={form.cost_type} onValueChange={(v) => upd('cost_type', v as ExpenseCostType)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_COST_TYPES.map((t) => <SelectItem key={t} value={t}>{t === 'CF' ? 'Fijo (CF)' : 'Variable (CV)'}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => upd('description', e.target.value)} className="bg-secondary/50 mt-1 resize-none" placeholder="Detalle opcional" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving || !form.name.trim() || !form.amount} className="bg-primary">
            {saving ? 'Guardando…' : 'Registrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function TabEgresos({ expenses, refetch }: FinanzasTabProps) {
  const [adding, setAdding] = useState(false);

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => b.date.localeCompare(a.date)),
    [expenses],
  );

  const totalCF = useMemo(() => expenses.filter((e) => e.cost_type === 'CF').reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const totalCV = useMemo(() => expenses.filter((e) => e.cost_type === 'CV').reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const totalGeneral = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este egreso? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Egreso eliminado');
    refetch();
  }

  return (
    <div className="space-y-4">

      {/* ── Totales ── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Costos Fijos (CF)</p>
              <TrendingDown className="h-4 w-4 text-info" />
            </div>
            <p className="text-xl font-bold text-destructive">{fmtUSD(totalCF)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Costos Variables (CV)</p>
              <TrendingDown className="h-4 w-4 text-warning" />
            </div>
            <p className="text-xl font-bold text-destructive">{fmtUSD(totalCV)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Total general</p>
              <DollarSign className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-xl font-bold text-destructive">{fmtUSD(totalGeneral)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabla ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Egresos ({expenses.length})
            </CardTitle>
            <Button size="sm" onClick={() => setAdding(true)} className="bg-primary h-7 text-xs px-2 ml-auto">
              <Plus className="h-3 w-3 mr-1" />Agregar Egreso
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Fecha</TableHead>
                <TableHead className="text-xs">Concepto</TableHead>
                <TableHead className="text-xs">Categoría</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs text-right">Monto</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(e.date)}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {e.name}
                    {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                  </TableCell>
                  <TableCell>{categoryBadge(e.category)}</TableCell>
                  <TableCell>{costTypeBadge(e.cost_type)}</TableCell>
                  <TableCell className="text-sm text-right font-medium text-destructive">{fmtUSD(Number(e.amount))}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/50 hover:text-destructive" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">Sin egresos registrados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {adding && (
        <AddEgresoDialog onClose={() => setAdding(false)} onSaved={refetch} />
      )}
    </div>
  );
}
