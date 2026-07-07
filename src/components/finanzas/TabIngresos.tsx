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
import { Plus, Trash2, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { INCOME_STATUSES, INCOME_TYPES } from '@/features/finanzas/lib/types';
import type { Income, IncomeStatus, IncomeType } from '@/features/finanzas/lib/types';
import type { ClientRow, FinanzasTabProps } from './types';

// Radix's SelectItem forbids value="" — same sentinel pattern used
// elsewhere in this codebase (e.g. Closers.tsx) for "no selection".
const NONE = 'none';

function fmtUSD(n: number): string {
  return `$${Math.round(n).toLocaleString('es')}`;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yy', { locale: es }); } catch { return '—'; }
}

function clienteLabel(income: Income, clientNameById: Map<string, string>): string {
  if (income.client_id) return clientNameById.get(income.client_id) ?? income.source;
  return income.source;
}

function tipoBadgeClass(type: string | null): string {
  if (type === 'Cliente') return 'bg-success/20 text-success';
  if (type === 'Aporte de capital') return 'bg-info/20 text-info';
  return 'bg-secondary text-muted-foreground';
}

function estadoTriggerClass(status: string | null): string {
  if (status === 'Overdue') return 'text-destructive';
  if (status === 'Pending') return 'text-warning';
  return 'text-success';
}

// ─── AddIncomeDialog ──────────────────────────────────────────────────────

function AddIncomeDialog({ clients, onClose, onSaved }: {
  clients: ClientRow[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    source: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), due_date: '',
    type: 'Cliente' as IncomeType, status: 'Paid' as IncomeStatus, model: '',
    installment_number: '', total_installments: '', fee_percent: '',
    client_id: NONE, notes: '',
  });
  const [saving, setSaving] = useState(false);

  function upd<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!form.source.trim() || !form.amount) { toast.error('Cliente/Fuente y monto son requeridos'); return; }
    setSaving(true);
    const { error } = await supabase.from('incomes').insert({
      source: form.source.trim(),
      amount: parseFloat(form.amount),
      date: form.date,
      due_date: form.due_date || null,
      type: form.type,
      status: form.status,
      model: form.model || null,
      installment_number: form.installment_number ? parseInt(form.installment_number, 10) : null,
      total_installments: form.total_installments ? parseInt(form.total_installments, 10) : null,
      fee_percent: form.fee_percent ? parseFloat(form.fee_percent) : null,
      client_id: form.client_id === NONE ? null : form.client_id,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error('Error al guardar el ingreso'); return; }
    toast.success('Ingreso registrado');
    onSaved(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Agregar Ingreso</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Cliente/Fuente *</Label>
            <Input value={form.source} onChange={(e) => upd('source', e.target.value)} className="bg-secondary/50 mt-1" placeholder="ej. Pago cuota — Juan Pérez" />
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
            <Label className="text-xs text-muted-foreground">Fecha esperada (due date)</Label>
            <Input type="date" value={form.due_date} onChange={(e) => upd('due_date', e.target.value)} className="bg-secondary/50 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Modelo</Label>
            <Input value={form.model} onChange={(e) => upd('model', e.target.value)} className="bg-secondary/50 mt-1" placeholder="ej. DFY" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={form.type} onValueChange={(v) => upd('type', v as IncomeType)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCOME_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select value={form.status} onValueChange={(v) => upd('status', v as IncomeStatus)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCOME_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cliente vinculado (opcional)</Label>
            <Select value={form.client_id} onValueChange={(v) => upd('client_id', v)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cuota #</Label>
            <Input type="number" min={1} value={form.installment_number} onChange={(e) => upd('installment_number', e.target.value)} className="bg-secondary/50 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Total cuotas</Label>
            <Input type="number" min={1} value={form.total_installments} onChange={(e) => upd('total_installments', e.target.value)} className="bg-secondary/50 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fee %</Label>
            <Input type="number" step="0.1" value={form.fee_percent} onChange={(e) => upd('fee_percent', e.target.value)} className="bg-secondary/50 mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => upd('notes', e.target.value)} className="bg-secondary/50 mt-1 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving || !form.source.trim() || !form.amount} className="bg-primary">
            {saving ? 'Guardando…' : 'Registrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function TabIngresos({ incomes, clients, refetch }: FinanzasTabProps) {
  const [adding, setAdding] = useState(false);

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const sorted = useMemo(
    () => [...incomes].sort((a, b) => b.date.localeCompare(a.date)),
    [incomes],
  );

  const totalCobrado = useMemo(() => incomes.filter((i) => i.status === 'Paid').reduce((s, i) => s + Number(i.amount), 0), [incomes]);
  const totalPendiente = useMemo(() => incomes.filter((i) => i.status === 'Pending').reduce((s, i) => s + Number(i.amount), 0), [incomes]);
  const totalOverdue = useMemo(() => incomes.filter((i) => i.status === 'Overdue').reduce((s, i) => s + Number(i.amount), 0), [incomes]);

  async function handleStatusChange(income: Income, newStatus: string) {
    const { error } = await supabase.from('incomes').update({ status: newStatus }).eq('id', income.id);
    if (error) { toast.error('Error al actualizar el estado'); return; }
    toast.success('Estado actualizado');
    refetch();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este ingreso? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('incomes').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Ingreso eliminado');
    refetch();
  }

  return (
    <div className="space-y-4">

      {/* ── Totales ── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Cobrado</p>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <p className="text-xl font-bold text-success">{fmtUSD(totalCobrado)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Pendiente</p>
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <p className="text-xl font-bold text-warning">{fmtUSD(totalPendiente)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Overdue</p>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-xl font-bold text-destructive">{fmtUSD(totalOverdue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabla ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Ingresos ({incomes.length})
            </CardTitle>
            <Button size="sm" onClick={() => setAdding(true)} className="bg-primary h-7 text-xs px-2 ml-auto">
              <Plus className="h-3 w-3 mr-1" />Agregar Ingreso
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Fecha</TableHead>
                <TableHead className="text-xs">Cliente/Fuente</TableHead>
                <TableHead className="text-xs">Modelo</TableHead>
                <TableHead className="text-xs text-right">Monto</TableHead>
                <TableHead className="text-xs text-center">Cuota</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(i.date)}</TableCell>
                  <TableCell className="text-sm font-medium">{clienteLabel(i, clientNameById)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{i.model ?? '—'}</TableCell>
                  <TableCell className="text-sm text-right font-medium text-success">{fmtUSD(Number(i.amount))}</TableCell>
                  <TableCell className="text-xs text-center text-muted-foreground">
                    {i.installment_number ? `${i.installment_number}/${i.total_installments ?? '?'}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Select value={i.status ?? 'Paid'} onValueChange={(v) => handleStatusChange(i, v)}>
                      <SelectTrigger className={cn('h-7 w-[110px] bg-secondary/50 text-xs', estadoTriggerClass(i.status))}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INCOME_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs border-0', tipoBadgeClass(i.type))}>{i.type ?? '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/50 hover:text-destructive" onClick={() => handleDelete(i.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">Sin ingresos registrados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {adding && (
        <AddIncomeDialog clients={clients} onClose={() => setAdding(false)} onSaved={refetch} />
      )}
    </div>
  );
}
