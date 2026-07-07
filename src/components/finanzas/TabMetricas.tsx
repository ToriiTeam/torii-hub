import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Users, Target, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { categorize } from '@/features/finanzas/lib/categorize';
import type { ExpenseCategoryBucket } from '@/features/finanzas/lib/categorize';
import { SensitiveAmount } from './SensitiveAmount';
import type { FinanzasTabProps } from './types';

const CATEGORY_ORDER: ExpenseCategoryBucket[] = ['Equipo', 'Adquisición', 'Software', 'Publicidad', 'Mentoría', 'Otros'];

function fmtUSD(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${Math.round(n).toLocaleString('es')}`;
}

function fmtPct(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function safeDiv(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function inRange(dateStr: string | null, since: string, until: string): boolean {
  if (!dateStr) return false;
  return dateStr >= since && dateStr <= until;
}

function KpiCard({ label, value, sub, icon: Icon, valueClassName, sensitive, subSensitive }: {
  label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; valueClassName?: string;
  sensitive?: boolean; subSensitive?: boolean;
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
        {sub && (
          <p className="text-xs text-muted-foreground mt-1">
            {subSensitive ? <SensitiveAmount>{sub}</SensitiveAmount> : sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface TargetsForm {
  target_margin: string;
  target_mrr: string;
  target_clients: string;
  current_mrr: string;
  current_active_clients: string;
  new_clients_ytd: string;
}

export default function TabMetricas({ periodBounds, incomes, expenses, financeTargets, refetch }: FinanzasTabProps) {
  const { periodStart, periodEnd, yearStart, yearEnd, currentYear } = periodBounds;

  // ── 1. Rentabilidad (año calendario completo, NO YTD-hasta-mes) ─────────
  const ingresosAno = useMemo(
    () => incomes
      .filter((i) => i.status === 'Paid' && i.type !== 'Aporte de capital' && inRange(i.date, yearStart, yearEnd))
      .reduce((s, i) => s + Number(i.amount), 0),
    [incomes, yearStart, yearEnd],
  );
  const egresosAno = useMemo(
    () => expenses.filter((e) => inRange(e.date, yearStart, yearEnd)).reduce((s, e) => s + Number(e.amount), 0),
    [expenses, yearStart, yearEnd],
  );
  const resultadoAno = ingresosAno - egresosAno;
  const margenNeto = safeDiv(resultadoAno, ingresosAno);

  const costosDirectosAno = useMemo(
    () => expenses
      .filter((e) => inRange(e.date, yearStart, yearEnd) && (categorize(e.category) === 'Equipo' || categorize(e.category) === 'Software'))
      .reduce((s, e) => s + Number(e.amount), 0),
    [expenses, yearStart, yearEnd],
  );
  const margenBruto = safeDiv(ingresosAno - costosDirectosAno, ingresosAno);

  // ── 2. Ingresos recurrentes y clientes ───────────────────────────────────
  const ingresosClienteAno = useMemo(
    () => incomes.filter((i) => i.status === 'Paid' && i.type === 'Cliente' && inRange(i.date, yearStart, yearEnd)),
    [incomes, yearStart, yearEnd],
  );
  const ticketPromedio = safeDiv(
    ingresosClienteAno.reduce((s, i) => s + Number(i.amount), 0),
    ingresosClienteAno.length,
  );

  // "del mes activo" generalizado a "del período seleccionado" — ya no hay
  // un mes fijo por defecto (el default ahora es "Todo").
  const ingresosClientePeriodo = useMemo(
    () => incomes
      .filter((i) => i.status === 'Paid' && i.type === 'Cliente' && inRange(i.date, periodStart, periodEnd))
      .reduce((s, i) => s + Number(i.amount), 0),
    [incomes, periodStart, periodEnd],
  );
  const ingresoPorClienteActivo = financeTargets?.current_active_clients
    ? safeDiv(ingresosClientePeriodo, financeTargets.current_active_clients)
    : null;

  // ── 3. Adquisición ────────────────────────────────────────────────────────
  const publicidadAno = useMemo(
    () => expenses.filter((e) => inRange(e.date, yearStart, yearEnd) && categorize(e.category) === 'Publicidad').reduce((s, e) => s + Number(e.amount), 0),
    [expenses, yearStart, yearEnd],
  );
  const adquisicionAno = useMemo(
    () => expenses.filter((e) => inRange(e.date, yearStart, yearEnd) && categorize(e.category) === 'Adquisición').reduce((s, e) => s + Number(e.amount), 0),
    [expenses, yearStart, yearEnd],
  );
  const costoAdquisicionTotal = publicidadAno + adquisicionAno;
  const nuevosClientes = financeTargets?.new_clients_ytd ?? 0;
  const cac = nuevosClientes > 0 ? costoAdquisicionTotal / nuevosClientes : null;

  // ── 4. Estructura de costos ───────────────────────────────────────────────
  const estructuraCostos = useMemo(() => {
    const yearExpenses = expenses.filter((e) => inRange(e.date, yearStart, yearEnd));
    return CATEGORY_ORDER.map((cat) => {
      const monto = yearExpenses.filter((e) => categorize(e.category) === cat).reduce((s, e) => s + Number(e.amount), 0);
      return { cat, monto, pct: safeDiv(monto, egresosAno) };
    });
  }, [expenses, yearStart, yearEnd, egresosAno]);

  // ── 5. Parámetros y objetivos (editable) ──────────────────────────────────
  const [form, setForm] = useState<TargetsForm>({
    target_margin: financeTargets?.target_margin != null ? String(financeTargets.target_margin) : '0',
    target_mrr: financeTargets?.target_mrr != null ? String(financeTargets.target_mrr) : '0',
    target_clients: financeTargets?.target_clients != null ? String(financeTargets.target_clients) : '0',
    current_mrr: financeTargets?.current_mrr != null ? String(financeTargets.current_mrr) : '0',
    current_active_clients: financeTargets?.current_active_clients != null ? String(financeTargets.current_active_clients) : '0',
    new_clients_ytd: financeTargets?.new_clients_ytd != null ? String(financeTargets.new_clients_ytd) : '0',
  });
  const [saving, setSaving] = useState(false);

  // financeTargets is fetched once, asynchronously, by Finanzas.tsx and
  // arrives via props after this component's initial mount — a plain
  // useState initializer would freeze the form at the '0' defaults set
  // before that fetch resolves (or after a save + refetch() completes with
  // fresh values from the DB). Re-sync whenever the underlying record
  // actually changes, same pattern as CreativeDetailPanel.tsx's node sync.
  useEffect(() => {
    setForm({
      target_margin: financeTargets?.target_margin != null ? String(financeTargets.target_margin) : '0',
      target_mrr: financeTargets?.target_mrr != null ? String(financeTargets.target_mrr) : '0',
      target_clients: financeTargets?.target_clients != null ? String(financeTargets.target_clients) : '0',
      current_mrr: financeTargets?.current_mrr != null ? String(financeTargets.current_mrr) : '0',
      current_active_clients: financeTargets?.current_active_clients != null ? String(financeTargets.current_active_clients) : '0',
      new_clients_ytd: financeTargets?.new_clients_ytd != null ? String(financeTargets.new_clients_ytd) : '0',
    });
  }, [financeTargets]);

  function upd(key: keyof TargetsForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveTargets() {
    const targetMargin = parseFloat(form.target_margin);
    const targetMrr = parseFloat(form.target_mrr);
    const targetClients = parseInt(form.target_clients, 10);
    const currentMrr = parseFloat(form.current_mrr);
    const currentActiveClients = parseInt(form.current_active_clients, 10);
    const newClientsYtd = parseInt(form.new_clients_ytd, 10);

    const numbers = [targetMargin, targetMrr, targetClients, currentMrr, currentActiveClients, newClientsYtd];
    if (numbers.some((n) => Number.isNaN(n))) { toast.error('Todos los campos deben ser números válidos'); return; }
    if (numbers.some((n) => n < 0)) { toast.error('Ningún valor puede ser negativo'); return; }
    if (!Number.isInteger(targetClients)) { toast.error('Clientes objetivo debe ser un número entero'); return; }
    if (!Number.isInteger(currentActiveClients)) { toast.error('Clientes activos debe ser un número entero'); return; }
    if (!Number.isInteger(newClientsYtd)) { toast.error('Nuevos clientes debe ser un número entero'); return; }

    setSaving(true);
    const payload = {
      target_margin: targetMargin,
      target_mrr: targetMrr,
      target_clients: targetClients,
      current_mrr: currentMrr,
      current_active_clients: currentActiveClients,
      new_clients_ytd: newClientsYtd,
      updated_at: new Date().toISOString(),
    };
    const { error } = financeTargets?.id
      ? await supabase.from('finance_targets').update(payload).eq('id', financeTargets.id)
      : await supabase.from('finance_targets').insert(payload);
    setSaving(false);
    if (error) { toast.error('Error al guardar los objetivos'); return; }
    toast.success('Objetivos guardados');
    refetch();
  }

  return (
    <div className="space-y-6">

      {/* ── 1. Rentabilidad ── */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Rentabilidad (acumulado {currentYear})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Margen bruto"
            value={fmtPct(margenBruto)}
            sub={`costos directos: ${fmtUSD(costosDirectosAno)}`}
            icon={Target}
            valueClassName={margenBruto == null ? 'text-muted-foreground' : margenBruto >= 0 ? 'text-success' : 'text-destructive'}
            subSensitive
          />
          <KpiCard
            label="Margen neto"
            value={fmtPct(margenNeto)}
            icon={Target}
            valueClassName={margenNeto == null ? 'text-muted-foreground' : margenNeto >= 0 ? 'text-success' : 'text-destructive'}
          />
          <KpiCard
            label="Resultado operativo neto"
            value={fmtUSD(resultadoAno)}
            icon={DollarSign}
            valueClassName={resultadoAno >= 0 ? 'text-success' : 'text-destructive'}
            sensitive
          />
          <KpiCard label="Ingresos operativos" value={fmtUSD(ingresosAno)} icon={DollarSign} valueClassName="text-success" sensitive />
        </div>
      </div>

      {/* ── 2. Ingresos recurrentes y clientes ── */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Ingresos recurrentes y clientes
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="MRR"
            value={fmtUSD(financeTargets?.current_mrr ?? null)}
            sub={financeTargets?.target_mrr != null ? `objetivo: ${fmtUSD(financeTargets.target_mrr)}` : undefined}
            icon={DollarSign}
            sensitive
            subSensitive
          />
          <KpiCard
            label="Clientes activos"
            value={financeTargets?.current_active_clients != null ? financeTargets.current_active_clients.toLocaleString('es') : '—'}
            sub={financeTargets?.target_clients != null ? `objetivo: ${financeTargets.target_clients}` : undefined}
            icon={Users}
          />
          <KpiCard
            label="Ticket promedio"
            value={fmtUSD(ticketPromedio)}
            sub={`${ingresosClienteAno.length} cobro${ingresosClienteAno.length !== 1 ? 's' : ''} en ${currentYear}`}
            icon={DollarSign}
            sensitive
          />
          <KpiCard
            label="Ingreso por cliente activo"
            value={ingresoPorClienteActivo != null ? fmtUSD(ingresoPorClienteActivo) : 'Sin datos'}
            sub="del período seleccionado"
            icon={Users}
            sensitive={ingresoPorClienteActivo != null}
          />
        </div>
      </div>

      {/* ── 3. Adquisición ── */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Adquisición ({currentYear})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Publicidad" value={fmtUSD(publicidadAno)} icon={DollarSign} sensitive />
          <KpiCard label="Comisiones + Helper" value={fmtUSD(adquisicionAno)} icon={DollarSign} sensitive />
          <KpiCard label="Costo de adquisición total" value={fmtUSD(costoAdquisicionTotal)} icon={DollarSign} sensitive />
          <KpiCard
            label="CAC"
            value={cac != null ? fmtUSD(cac) : 'Sin datos'}
            sub={`${nuevosClientes} cliente${nuevosClientes !== 1 ? 's' : ''} nuevo${nuevosClientes !== 1 ? 's' : ''} (YTD)`}
            icon={Target}
            sensitive={cac != null}
          />
        </div>
      </div>

      {/* ── 4. Estructura de costos ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Estructura de costos — {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Categoría</TableHead>
                <TableHead className="text-xs text-right">Monto</TableHead>
                <TableHead className="text-xs text-right">% del total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estructuraCostos.map(({ cat, monto, pct }) => (
                <TableRow key={cat}>
                  <TableCell className="text-sm font-medium">{cat}</TableCell>
                  <TableCell className="text-sm text-right"><SensitiveAmount>{fmtUSD(monto)}</SensitiveAmount></TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground">{fmtPct(pct)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 bg-secondary/20 font-semibold">
                <TableCell>Total egresos {currentYear}</TableCell>
                <TableCell className="text-right"><SensitiveAmount>{fmtUSD(egresosAno)}</SensitiveAmount></TableCell>
                <TableCell className="text-right text-muted-foreground">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── 5. Parámetros y objetivos ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Parámetros y objetivos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Margen objetivo (%)</Label>
              <Input type="number" min={0} step="0.1" value={form.target_margin} onChange={(e) => upd('target_margin', e.target.value)} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">MRR objetivo (USD)</Label>
              <Input type="number" min={0} value={form.target_mrr} onChange={(e) => upd('target_mrr', e.target.value)} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Clientes objetivo</Label>
              <Input type="number" min={0} step={1} value={form.target_clients} onChange={(e) => upd('target_clients', e.target.value)} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">MRR actual (USD)</Label>
              <Input type="number" min={0} value={form.current_mrr} onChange={(e) => upd('current_mrr', e.target.value)} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Clientes activos hoy</Label>
              <Input type="number" min={0} step={1} value={form.current_active_clients} onChange={(e) => upd('current_active_clients', e.target.value)} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Nuevos clientes (acumulado)</Label>
              <Input type="number" min={0} step={1} value={form.new_clients_ytd} onChange={(e) => upd('new_clients_ytd', e.target.value)} className="bg-secondary/50 mt-1" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveTargets} disabled={saving} className="bg-primary">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Guardar objetivos
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
