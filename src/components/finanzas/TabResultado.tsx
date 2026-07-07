import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { categorize } from '@/features/finanzas/lib/categorize';
import type { ExpenseCategoryBucket } from '@/features/finanzas/lib/categorize';
import type { Expense, Income } from '@/features/finanzas/lib/types';
import { SensitiveAmount } from './SensitiveAmount';
import type { FinanzasTabProps } from './types';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const CATEGORY_ORDER: ExpenseCategoryBucket[] = ['Equipo', 'Adquisición', 'Software', 'Publicidad', 'Mentoría', 'Otros'];

function fmtUSD(n: number): string {
  return `$${Math.round(n).toLocaleString('es')}`;
}

function fmtPct(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function safeDiv(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Specific to this tab's 12-column layout — not promoted to lib/ since
// Dashboard/other tabs only ever need periodBounds' single month/year range.
function monthRange(year: number, monthIndex0: number): { since: string; until: string } {
  const y = year;
  const m = monthIndex0 + 1; // 1-indexed for display math below
  const since = `${y}-${pad2(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate(); // day 0 of next month = last day of this month
  const until = `${y}-${pad2(m)}-${pad2(lastDay)}`;
  return { since, until };
}

function inRange(dateStr: string | null, since: string, until: string): boolean {
  if (!dateStr) return false;
  return dateStr >= since && dateStr <= until;
}

interface ColumnResult {
  label: string;
  ingresosClientes: number;
  otrosIngresos: number;
  totalIngresos: number;
  porCategoria: Record<ExpenseCategoryBucket, number>;
  totalEgresos: number;
  resultado: number;
  margen: number | null;
}

function computeColumn(label: string, incomes: Income[], expenses: Expense[], since: string, until: string): ColumnResult {
  const ingresosClientes = incomes
    .filter((i) => i.status === 'Paid' && i.type === 'Cliente' && inRange(i.date, since, until))
    .reduce((s, i) => s + Number(i.amount), 0);

  const otrosIngresos = incomes
    .filter((i) => i.status === 'Paid' && i.type === 'Otro ingreso' && inRange(i.date, since, until))
    .reduce((s, i) => s + Number(i.amount), 0);

  const totalIngresos = ingresosClientes + otrosIngresos;

  const monthExpenses = expenses.filter((e) => inRange(e.date, since, until));
  const porCategoria = Object.fromEntries(
    CATEGORY_ORDER.map((cat) => [
      cat,
      monthExpenses.filter((e) => categorize(e.category) === cat).reduce((s, e) => s + Number(e.amount), 0),
    ]),
  ) as Record<ExpenseCategoryBucket, number>;

  const totalEgresos = CATEGORY_ORDER.reduce((s, cat) => s + porCategoria[cat], 0);
  const resultado = totalIngresos - totalEgresos;
  const margen = safeDiv(resultado, totalIngresos);

  return { label, ingresosClientes, otrosIngresos, totalIngresos, porCategoria, totalEgresos, resultado, margen };
}

export default function TabResultado({ periodBounds, incomes, expenses }: FinanzasTabProps) {
  const year = periodBounds.currentYear;

  const columns = useMemo(() => {
    const months = MONTH_LABELS.map((label, idx) => {
      const { since, until } = monthRange(year, idx);
      return computeColumn(label, incomes, expenses, since, until);
    });
    const total = computeColumn(
      'TOTAL AÑO',
      incomes,
      expenses,
      `${year}-01-01`,
      `${year}-12-31`,
    );
    return { months, total };
  }, [year, incomes, expenses]);

  const allColumns = [...columns.months, columns.total];

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Resultado — {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sticky left-0 bg-card">Concepto</TableHead>
                {allColumns.map((col) => (
                  <TableHead
                    key={col.label}
                    className={cn('text-xs text-right whitespace-nowrap', col.label === 'TOTAL AÑO' && 'font-semibold')}
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* ── Ingresos ── */}
              <TableRow>
                <TableCell className="text-sm sticky left-0 bg-card">Ingresos por clientes</TableCell>
                {allColumns.map((col) => (
                  <TableCell key={col.label} className="text-sm text-right text-success"><SensitiveAmount>{fmtUSD(col.ingresosClientes)}</SensitiveAmount></TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-sm sticky left-0 bg-card">Otros ingresos operativos</TableCell>
                {allColumns.map((col) => (
                  <TableCell key={col.label} className="text-sm text-right text-success"><SensitiveAmount>{fmtUSD(col.otrosIngresos)}</SensitiveAmount></TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-secondary/20 font-semibold">
                <TableCell className="text-sm sticky left-0 bg-secondary/20">TOTAL INGRESOS OPERATIVOS</TableCell>
                {allColumns.map((col) => (
                  <TableCell key={col.label} className="text-sm text-right text-success"><SensitiveAmount>{fmtUSD(col.totalIngresos)}</SensitiveAmount></TableCell>
                ))}
              </TableRow>

              {/* ── Egresos por categoría ── */}
              {CATEGORY_ORDER.map((cat) => (
                <TableRow key={cat}>
                  <TableCell className="text-sm pl-6 sticky left-0 bg-card text-muted-foreground">{cat}</TableCell>
                  {allColumns.map((col) => (
                    <TableCell key={col.label} className="text-sm text-right"><SensitiveAmount>{fmtUSD(col.porCategoria[cat])}</SensitiveAmount></TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow className="bg-secondary/20 font-semibold">
                <TableCell className="text-sm sticky left-0 bg-secondary/20">TOTAL EGRESOS</TableCell>
                {allColumns.map((col) => (
                  <TableCell key={col.label} className="text-sm text-right text-destructive"><SensitiveAmount>{fmtUSD(col.totalEgresos)}</SensitiveAmount></TableCell>
                ))}
              </TableRow>

              {/* ── Resultado ── */}
              <TableRow className="border-t-2 bg-secondary/30 font-bold">
                <TableCell className="text-sm sticky left-0 bg-secondary/30">RESULTADO OPERATIVO NETO</TableCell>
                {allColumns.map((col) => (
                  <TableCell
                    key={col.label}
                    className={cn('text-sm text-right', col.resultado >= 0 ? 'text-success' : 'text-destructive')}
                  >
                    <SensitiveAmount>{fmtUSD(col.resultado)}</SensitiveAmount>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-sm sticky left-0 bg-card text-muted-foreground">Margen neto %</TableCell>
                {allColumns.map((col) => (
                  <TableCell
                    key={col.label}
                    className={cn(
                      'text-sm text-right',
                      col.margen == null ? 'text-muted-foreground' : col.margen >= 0 ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {fmtPct(col.margen)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
