import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Clock, AlertTriangle, Target, Users, ArrowDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { categorize } from '@/features/finanzas/lib/categorize';
import { calcCajaActual, calcDeuda, calcPatrimonioNeto, calcPorCobrar } from '@/features/finanzas/lib/financeCalc';
import type { Expense, Income } from '@/features/finanzas/lib/types';
import type { FinanzasTabProps } from './types';

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

function sumIncomes(incomes: Income[], since: string, until: string, opts: { excludeAportes: boolean }): number {
  return incomes
    .filter((i) => i.status === 'Paid' && inRange(i.date, since, until))
    .filter((i) => !opts.excludeAportes || i.type !== 'Aporte de capital')
    .reduce((sum, i) => sum + Number(i.amount), 0);
}

function sumExpenses(expenses: Expense[], since: string, until: string): number {
  return expenses
    .filter((e) => inRange(e.date, since, until))
    .reduce((sum, e) => sum + Number(e.amount), 0);
}

function sumExpensesByBucket(expenses: Expense[], since: string, until: string, buckets: string[]): number {
  return expenses
    .filter((e) => inRange(e.date, since, until) && buckets.includes(categorize(e.category)))
    .reduce((sum, e) => sum + Number(e.amount), 0);
}

interface PeriodResult {
  ingresos: number;
  gastos: number;
  resultado: number;
  margen: number | null;
}

function computePeriod(incomes: Income[], expenses: Expense[], since: string, until: string): PeriodResult {
  const ingresos = sumIncomes(incomes, since, until, { excludeAportes: true });
  const gastos = sumExpenses(expenses, since, until);
  const resultado = ingresos - gastos;
  const margen = safeDiv(resultado, ingresos);
  return { ingresos, gastos, resultado, margen };
}

function KpiCard({ label, value, sub, icon: Icon, valueClassName }: {
  label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; valueClassName?: string;
}) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={cn('text-xl font-bold', valueClassName)}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function TabDashboard({ activeMonth, periodBounds, incomes, expenses, clients, debts, financeTargets, openingBalance }: FinanzasTabProps) {
  const { monthStart, monthEnd, yearStart } = periodBounds;
  const activeYear = activeMonth.getFullYear();

  // ── 1. Resultado del mes ────────────────────────────────────────────────
  const monthResult = useMemo(
    () => computePeriod(incomes, expenses, monthStart, monthEnd),
    [incomes, expenses, monthStart, monthEnd],
  );

  // ── 2. Acumulado del año activo — year-to-date real: yearStart hasta
  // monthEnd (NO yearEnd), compuesto acá según la nota de Paso A.
  const ytdResult = useMemo(
    () => computePeriod(incomes, expenses, yearStart, monthEnd),
    [incomes, expenses, yearStart, monthEnd],
  );

  // ── 3. Balance — posición financiera ────────────────────────────────────
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

  // ── 4. Métricas clave ────────────────────────────────────────────────────
  const costosDirectosAno = useMemo(
    () => sumExpensesByBucket(expenses, yearStart, monthEnd, ['Equipo', 'Software']),
    [expenses, yearStart, monthEnd],
  );
  const margenBruto = safeDiv(ytdResult.ingresos - costosDirectosAno, ytdResult.ingresos);

  const publicidadMes = useMemo(
    () => sumExpensesByBucket(expenses, monthStart, monthEnd, ['Publicidad']),
    [expenses, monthStart, monthEnd],
  );
  const adquisicionMes = useMemo(
    () => sumExpensesByBucket(expenses, monthStart, monthEnd, ['Adquisición']),
    [expenses, monthStart, monthEnd],
  );
  const nuevosClientesMes = useMemo(
    () => clients.filter((c) => inRange(c.start_date, monthStart, monthEnd)).length,
    [clients, monthStart, monthEnd],
  );
  const cac = nuevosClientesMes > 0 ? (publicidadMes + adquisicionMes) / nuevosClientesMes : null;

  // ── 5. Cómo cuadra la caja — cascada completa, histórico (all-time) ─────
  const ingresosOperativosHistorico = useMemo(
    () => incomes.filter((i) => i.status === 'Paid' && i.type !== 'Aporte de capital').reduce((s, i) => s + Number(i.amount), 0),
    [incomes],
  );
  const aportesHistorico = useMemo(
    () => incomes.filter((i) => i.status === 'Paid' && i.type === 'Aporte de capital').reduce((s, i) => s + Number(i.amount), 0),
    [incomes],
  );
  const totalCobrado = ingresosOperativosHistorico + aportesHistorico;
  const egresosHistorico = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const saldoInicial = openingBalance ? Number(openingBalance.amount) : 0;

  return (
    <div className="space-y-6">

      {/* ── 1. Resultado del mes ── */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Resultado del mes
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Ingresos" value={fmtUSD(monthResult.ingresos)} icon={TrendingUp} valueClassName="text-success" />
          <KpiCard label="Gastos" value={fmtUSD(monthResult.gastos)} icon={TrendingDown} valueClassName="text-destructive" />
          <KpiCard
            label="Resultado neto"
            value={fmtUSD(monthResult.resultado)}
            icon={DollarSign}
            valueClassName={monthResult.resultado >= 0 ? 'text-success' : 'text-destructive'}
          />
          <KpiCard
            label="Margen neto"
            value={fmtPct(monthResult.margen)}
            icon={Target}
            valueClassName={monthResult.margen == null ? 'text-muted-foreground' : monthResult.margen >= 0 ? 'text-success' : 'text-destructive'}
          />
        </div>
      </div>

      {/* ── 2. Acumulado del año activo (YTD real: yearStart → monthEnd) ── */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Acumulado {activeYear}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Ingresos" value={fmtUSD(ytdResult.ingresos)} icon={TrendingUp} valueClassName="text-success" />
          <KpiCard label="Gastos" value={fmtUSD(ytdResult.gastos)} icon={TrendingDown} valueClassName="text-destructive" />
          <KpiCard
            label="Resultado neto"
            value={fmtUSD(ytdResult.resultado)}
            icon={DollarSign}
            valueClassName={ytdResult.resultado >= 0 ? 'text-success' : 'text-destructive'}
          />
          <KpiCard
            label="Margen neto"
            value={fmtPct(ytdResult.margen)}
            icon={Target}
            valueClassName={ytdResult.margen == null ? 'text-muted-foreground' : ytdResult.margen >= 0 ? 'text-success' : 'text-destructive'}
          />
        </div>
      </div>

      {/* ── 3. Balance — posición financiera ── */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Balance — posición financiera
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Caja actual" value={fmtUSD(cajaActual)} icon={Wallet} valueClassName={cajaActual >= 0 ? 'text-success' : 'text-destructive'} />
          <KpiCard label="Por cobrar" value={fmtUSD(porCobrar)} icon={Clock} valueClassName={porCobrar > 0 ? 'text-warning' : 'text-muted-foreground'} />
          <KpiCard label="Deuda" value={fmtUSD(deuda)} icon={AlertTriangle} valueClassName={deuda > 0 ? 'text-destructive' : 'text-muted-foreground'} />
          <KpiCard
            label="Patrimonio neto"
            value={fmtUSD(patrimonioNeto)}
            icon={DollarSign}
            valueClassName={patrimonioNeto >= 0 ? 'text-success' : 'text-destructive'}
          />
        </div>
      </div>

      {/* ── 4. Métricas clave ── */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Métricas clave
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="MRR"
            value={fmtUSD(financeTargets?.current_mrr ?? null)}
            sub={financeTargets?.target_mrr != null ? `objetivo: ${fmtUSD(financeTargets.target_mrr)}` : undefined}
            icon={DollarSign}
          />
          <KpiCard
            label="Clientes activos"
            value={financeTargets?.current_active_clients != null ? financeTargets.current_active_clients.toLocaleString('es') : '—'}
            sub={financeTargets?.target_clients != null ? `objetivo: ${financeTargets.target_clients}` : undefined}
            icon={Users}
          />
          <KpiCard
            label="Margen bruto"
            value={fmtPct(margenBruto)}
            sub={`costos directos: ${fmtUSD(costosDirectosAno)}`}
            icon={Target}
            valueClassName={margenBruto == null ? 'text-muted-foreground' : margenBruto >= 0 ? 'text-success' : 'text-destructive'}
          />
          <KpiCard
            label="CAC"
            value={cac != null ? fmtUSD(cac) : 'Sin datos'}
            sub={`${nuevosClientesMes} cliente${nuevosClientesMes !== 1 ? 's' : ''} nuevo${nuevosClientesMes !== 1 ? 's' : ''} este mes`}
            icon={Target}
          />
        </div>
      </div>

      {/* ── 5. Cómo cuadra la caja ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Cómo cuadra la caja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Ingresos operativos (histórico)</span>
            <span className="font-semibold text-success">{fmtUSD(ingresosOperativosHistorico)}</span>
            <span className="text-muted-foreground">+</span>
            <span className="text-muted-foreground">Aportes de capital (histórico)</span>
            <span className="font-semibold text-success">{fmtUSD(aportesHistorico)}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />
            <span className="text-muted-foreground">Total cobrado</span>
            <span className="font-semibold">{fmtUSD(totalCobrado)}</span>
          </div>
          <div className="flex items-center pl-1 my-1">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Total cobrado</span>
            <span className="font-semibold">{fmtUSD(totalCobrado)}</span>
            <span className="text-muted-foreground">−</span>
            <span className="text-muted-foreground">Egresos (histórico)</span>
            <span className="font-semibold text-destructive">{fmtUSD(egresosHistorico)}</span>
            <span className="text-muted-foreground">+</span>
            <span className="text-muted-foreground">Saldo inicial</span>
            <span className="font-semibold">{fmtUSD(saldoInicial)}</span>
          </div>
          <div className="flex items-center pl-1 my-1">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Caja actual</span>
            <span className={cn('text-lg font-bold', cajaActual >= 0 ? 'text-success' : 'text-destructive')}>
              {fmtUSD(totalCobrado - egresosHistorico + saldoInicial)}
            </span>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
