import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wallet, Clock, AlertTriangle, DollarSign, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { calcCajaActual, calcDeuda, calcPatrimonioNeto, calcPorCobrar } from '@/features/finanzas/lib/financeCalc';
import type { Debt, Income } from '@/features/finanzas/lib/types';
import { SensitiveAmount } from './SensitiveAmount';
import type { FinanzasTabProps } from './types';

function fmtUSD(n: number): string {
  return `$${Math.round(n).toLocaleString('es')}`;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yy', { locale: es }); } catch { return '—'; }
}

function KpiCard({ label, value, icon: Icon, valueClassName, sensitive }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; valueClassName?: string; sensitive?: boolean;
}) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={cn('text-xl font-bold', valueClassName)}>
          {sensitive ? <SensitiveAmount>{value}</SensitiveAmount> : value}
        </p>
      </CardContent>
    </Card>
  );
}

function clienteLabel(income: Income, clientNameById: Map<string, string>): string {
  const name = income.client_id ? clientNameById.get(income.client_id) : null;
  const base = name ?? income.source;
  if (income.installment_number && income.total_installments) {
    return `${base} — cuota ${income.installment_number}/${income.total_installments}`;
  }
  return base;
}

function estadoBadge(status: string | null) {
  if (status === 'Overdue') return <Badge className="text-xs border-0 bg-destructive/20 text-destructive">Overdue</Badge>;
  if (status === 'Pending') return <Badge className="text-xs border-0 bg-warning/20 text-warning">Pending</Badge>;
  return <Badge className="text-xs border-0 bg-secondary text-muted-foreground">{status ?? '—'}</Badge>;
}

// ─── AddDebtDialog ──────────────────────────────────────────────────────────

function AddDebtDialog({ onClose, onSaved, pushHistory }: { onClose: () => void; onSaved: () => void; pushHistory: FinanzasTabProps['pushHistory'] }) {
  const [form, setForm] = useState({ creditor: '', amount: '', due_date: '', note: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.creditor.trim() || !form.amount) { toast.error('Acreedor y monto son requeridos'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('debts').insert({
      creditor: form.creditor.trim(),
      amount: parseFloat(form.amount),
      due_date: form.due_date || null,
      note: form.note || null,
    }).select().single();
    setSaving(false);
    if (error || !data) { toast.error('Error al guardar la deuda'); return; }
    pushHistory({ table: 'debts', op: 'insert', before: null, after: data, label: `deuda con ${data.creditor} $${fmtUSD(Number(data.amount))} agregada` });
    toast.success('Deuda registrada');
    onSaved(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>Nueva deuda</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Acreedor *</Label>
            <Input value={form.creditor} onChange={(e) => setForm((p) => ({ ...p, creditor: e.target.value }))} className="bg-secondary/50 mt-1" placeholder="A quién le debemos" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Monto (USD) *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} className="bg-secondary/50 mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Vencimiento</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} className="bg-secondary/50 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Nota</Label>
            <Textarea rows={2} value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} className="bg-secondary/50 mt-1 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving || !form.creditor.trim() || !form.amount} className="bg-primary">
            {saving ? 'Guardando…' : 'Crear deuda'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function TabBalance({ incomes, expenses, clients, debts, openingBalance, refetch, pushHistory }: FinanzasTabProps) {
  const [savingBalance, setSavingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(openingBalance ? String(openingBalance.amount) : '0');
  const [addingDebt, setAddingDebt] = useState(false);

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const totalCobradoHistorico = useMemo(
    () => incomes.filter((i) => i.status === 'Paid').reduce((s, i) => s + Number(i.amount), 0),
    [incomes],
  );
  const totalEgresosHistorico = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const cajaActual = useMemo(
    () => calcCajaActual({ openingBalance, incomes, expenses }),
    [openingBalance, incomes, expenses],
  );
  const porCobrar = useMemo(() => calcPorCobrar(incomes), [incomes]);
  const deuda = useMemo(() => calcDeuda(debts), [debts]);
  const patrimonioNeto = useMemo(
    () => calcPatrimonioNeto({ cajaActual, porCobrar, deuda }),
    [cajaActual, porCobrar, deuda],
  );

  const cuentasPorCobrar = useMemo(
    () => incomes
      .filter((i) => i.type === 'Cliente' && (i.status === 'Pending' || i.status === 'Overdue'))
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
    [incomes],
  );

  async function saveOpeningBalance() {
    const amount = parseFloat(balanceInput);
    if (Number.isNaN(amount)) { toast.error('Monto inválido'); return; }
    setSavingBalance(true);
    if (openingBalance?.id) {
      const { data, error } = await supabase.from('cash_opening_balance').update({ amount }).eq('id', openingBalance.id).select().single();
      setSavingBalance(false);
      if (error || !data) { toast.error('Error al guardar el saldo inicial'); return; }
      pushHistory({ table: 'cash_opening_balance', op: 'update', before: openingBalance, after: data, label: `saldo inicial actualizado a $${fmtUSD(amount)}` });
    } else {
      const { data, error } = await supabase.from('cash_opening_balance').insert({ amount, as_of_date: format(new Date(), 'yyyy-MM-dd') }).select().single();
      setSavingBalance(false);
      if (error || !data) { toast.error('Error al guardar el saldo inicial'); return; }
      pushHistory({ table: 'cash_opening_balance', op: 'insert', before: null, after: data, label: `saldo inicial creado en $${fmtUSD(amount)}` });
    }
    toast.success('Saldo inicial guardado');
    refetch();
  }

  async function toggleDebtPaid(debt: Debt, paid: boolean) {
    const { error } = await supabase.from('debts').update({ paid }).eq('id', debt.id);
    if (error) { toast.error('Error al actualizar la deuda'); return; }
    pushHistory({
      table: 'debts',
      op: 'update',
      before: debt,
      after: { ...debt, paid },
      label: `deuda con ${debt.creditor} $${fmtUSD(Number(debt.amount))} marcada como ${paid ? 'pagada' : 'no pagada'}`,
    });
    refetch();
  }

  async function deleteDebt(debt: Debt) {
    const { error } = await supabase.from('debts').delete().eq('id', debt.id);
    if (error) { toast.error('Error al eliminar la deuda'); return; }
    pushHistory({ table: 'debts', op: 'delete', before: debt, after: null, label: `deuda con ${debt.creditor} $${fmtUSD(Number(debt.amount))} eliminada` });
    toast.success('Deuda eliminada');
    refetch();
  }

  return (
    <div className="space-y-6">

      {/* ── 1. Posición de caja ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Posición de caja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Saldo inicial</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  className="bg-secondary/50"
                />
                <Button size="icon" variant="outline" onClick={saveOpeningBalance} disabled={savingBalance} className="shrink-0">
                  {savingBalance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total cobrado (histórico)</p>
              <p className="text-lg font-bold text-success"><SensitiveAmount>{fmtUSD(totalCobradoHistorico)}</SensitiveAmount></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total egresos (histórico)</p>
              <p className="text-lg font-bold text-destructive"><SensitiveAmount>{fmtUSD(totalEgresosHistorico)}</SensitiveAmount></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Caja actual</p>
              <p className={cn('text-lg font-bold', cajaActual >= 0 ? 'text-success' : 'text-destructive')}>
                <SensitiveAmount>{fmtUSD(cajaActual)}</SensitiveAmount>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Qué tenés y qué debés ── */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Qué tenés y qué debés
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Caja actual" value={fmtUSD(cajaActual)} icon={Wallet} valueClassName={cajaActual >= 0 ? 'text-success' : 'text-destructive'} sensitive />
          <KpiCard label="Cuentas por cobrar" value={fmtUSD(porCobrar)} icon={Clock} valueClassName={porCobrar > 0 ? 'text-warning' : 'text-muted-foreground'} sensitive />
          <KpiCard label="Deuda" value={fmtUSD(deuda)} icon={AlertTriangle} valueClassName={deuda > 0 ? 'text-destructive' : 'text-muted-foreground'} sensitive />
          <KpiCard label="Patrimonio neto" value={fmtUSD(patrimonioNeto)} icon={DollarSign} valueClassName={patrimonioNeto >= 0 ? 'text-success' : 'text-destructive'} sensitive />
        </div>
      </div>

      {/* ── 3. Cuentas por cobrar ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Cuentas por cobrar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Cliente / Concepto</TableHead>
                <TableHead className="text-xs text-right">Monto</TableHead>
                <TableHead className="text-xs">Fecha esperada</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuentasPorCobrar.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm font-medium">{clienteLabel(i, clientNameById)}</TableCell>
                  <TableCell className="text-sm text-right font-medium"><SensitiveAmount>{fmtUSD(Number(i.amount))}</SensitiveAmount></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(i.due_date)}</TableCell>
                  <TableCell>{estadoBadge(i.status)}</TableCell>
                </TableRow>
              ))}
              {cuentasPorCobrar.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">Sin cuentas por cobrar</TableCell></TableRow>
              )}
              <TableRow className="border-t-2 bg-secondary/20 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right text-warning"><SensitiveAmount>{fmtUSD(porCobrar)}</SensitiveAmount></TableCell>
                <TableCell /><TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── 4. Deuda / Cuentas por pagar ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Deuda / Cuentas por pagar
            </CardTitle>
            <Button size="sm" onClick={() => setAddingDebt(true)} className="bg-primary h-7 text-xs px-2 ml-auto">
              <Plus className="h-3 w-3 mr-1" />Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Acreedor</TableHead>
                <TableHead className="text-xs">Nota</TableHead>
                <TableHead className="text-xs text-right">Monto</TableHead>
                <TableHead className="text-xs">Vencimiento</TableHead>
                <TableHead className="text-xs text-center">Pagada</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.map((d) => (
                <TableRow key={d.id} className={cn(d.paid && 'opacity-50')}>
                  <TableCell className="text-sm font-medium">{d.creditor}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.note ?? '—'}</TableCell>
                  <TableCell className="text-sm text-right font-medium"><SensitiveAmount>{fmtUSD(Number(d.amount))}</SensitiveAmount></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(d.due_date)}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={d.paid} onCheckedChange={(v) => toggleDebtPaid(d, v)} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/50 hover:text-destructive" onClick={() => deleteDebt(d)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {debts.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">Sin deudas registradas</TableCell></TableRow>
              )}
              <TableRow className="border-t-2 bg-secondary/20 font-semibold">
                <TableCell colSpan={2}>Total (no pagada)</TableCell>
                <TableCell className="text-right text-destructive"><SensitiveAmount>{fmtUSD(deuda)}</SensitiveAmount></TableCell>
                <TableCell /><TableCell /><TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {addingDebt && (
        <AddDebtDialog onClose={() => setAddingDebt(false)} onSaved={refetch} pushHistory={pushHistory} />
      )}
    </div>
  );
}
