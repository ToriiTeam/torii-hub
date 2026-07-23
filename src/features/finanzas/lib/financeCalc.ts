import type { CashOpeningBalance, Debt, Income, Expense } from './types';
import { categorize, type ExpenseCategoryBucket } from './categorize';

// Number(x) rather than raw arithmetic on x.amount: Postgres `numeric`
// columns are typed `number` by the generator but can come back as strings
// over PostgREST at runtime (the same gotcha already worked around with
// parseFloat(String(...)) elsewhere in this codebase, e.g.
// fetchPortfolioData.ts) — silent string concatenation in a financial total
// would be a nasty bug to chase.

// Caja actual = saldo inicial + todo lo cobrado (status='Paid') histórico
// − todos los egresos históricos. Deliberately NOT filtered by
// cash_opening_balance.as_of_date — that field is a label/audit date, not a
// cutoff, per the confirmed reading of "saldo inicial + cobrado − egresos"
// as a flat 3-term formula over full history.
export function calcCajaActual(opts: {
  openingBalance: CashOpeningBalance | null;
  incomes: Income[];
  expenses: Expense[];
}): number {
  const opening = opts.openingBalance ? Number(opts.openingBalance.amount) : 0;
  const cobrado = opts.incomes
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const egresos = opts.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  return opening + cobrado - egresos;
}

// Por cobrar = incomes de clientes todavía no cobrados, ya sea porque
// siguen pendientes o porque se vencieron sin cobrarse.
export function calcPorCobrar(incomes: Income[]): number {
  return incomes
    .filter((i) => i.type === 'Cliente' && (i.status === 'Pending' || i.status === 'Overdue'))
    .reduce((sum, i) => sum + Number(i.amount), 0);
}

// Deuda = cuentas por pagar todavía no saldadas.
export function calcDeuda(debts: Debt[]): number {
  return debts
    .filter((d) => !d.paid)
    .reduce((sum, d) => sum + Number(d.amount), 0);
}

// Patrimonio neto = activos (caja + por cobrar) − pasivos (deuda). Not
// given an explicit formula in the spec — this is the standard accounting
// definition, flagged as an assumption when first proposed and unchallenged
// since.
export function calcPatrimonioNeto(opts: {
  cajaActual: number;
  porCobrar: number;
  deuda: number;
}): number {
  return opts.cajaActual + opts.porCobrar - opts.deuda;
}

// ─── Period-scoped helpers ──────────────────────────────────────────────────
// Added for the "Salud del Negocio" block in ToriiView — same formulas
// Finanzas' TabMetricas.tsx/TabDashboard.tsx already use, but those live as
// inline consts/local helpers hardcoded to the calendar year. Extracted
// here, parametrized by (since, until), so a second consumer doesn't have
// to reimplement them. TabMetricas.tsx/TabDashboard.tsx were deliberately
// left as-is (not migrated) to avoid touching already-working Finanzas
// code in this pass.

export function safeDiv(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export function inRange(dateStr: string | null, since: string, until: string): boolean {
  if (!dateStr) return false;
  return dateStr >= since && dateStr <= until;
}

// Same base incomes filter as TabMetricas.tsx's ingresosAno: Paid, and
// excluding Aporte de capital since capital injections aren't operating
// revenue.
export function calcIngresosOperativos(incomes: Income[], since: string, until: string): number {
  return incomes
    .filter((i) => i.status === 'Paid' && i.type !== 'Aporte de capital' && inRange(i.date, since, until))
    .reduce((s, i) => s + Number(i.amount), 0);
}

export function calcEgresosPeriodo(expenses: Expense[], since: string, until: string): number {
  return expenses.filter((e) => inRange(e.date, since, until)).reduce((s, e) => s + Number(e.amount), 0);
}

export function sumExpensesByBucket(expenses: Expense[], since: string, until: string, buckets: ExpenseCategoryBucket[]): number {
  return expenses
    .filter((e) => inRange(e.date, since, until) && buckets.includes(categorize(e.category)))
    .reduce((s, e) => s + Number(e.amount), 0);
}

export function calcMargenNeto(incomes: Income[], expenses: Expense[], since: string, until: string): number | null {
  const ingresos = calcIngresosOperativos(incomes, since, until);
  const egresos = calcEgresosPeriodo(expenses, since, until);
  return safeDiv(ingresos - egresos, ingresos);
}

export function calcMargenBruto(incomes: Income[], expenses: Expense[], since: string, until: string): number | null {
  const ingresos = calcIngresosOperativos(incomes, since, until);
  const costosDirectos = sumExpensesByBucket(expenses, since, until, ['Equipo', 'Software']);
  return safeDiv(ingresos - costosDirectos, ingresos);
}

// ROI = ingresos operativos / egresos totales del período — same operating
// definition as margen neto (excludes Aporte de capital from ingresos).
export function calcROI(incomes: Income[], expenses: Expense[], since: string, until: string): number | null {
  const ingresos = calcIngresosOperativos(incomes, since, until);
  const egresos = calcEgresosPeriodo(expenses, since, until);
  return safeDiv(ingresos, egresos);
}

// Same base filter as TabMetricas.tsx's ticketPromedio: Paid + type='Cliente'.
export function calcTicketPromedio(incomes: Income[], since: string, until: string): number | null {
  const rows = incomes.filter((i) => i.status === 'Paid' && i.type === 'Cliente' && inRange(i.date, since, until));
  return safeDiv(rows.reduce((s, i) => s + Number(i.amount), 0), rows.length);
}

export function calcCAC(costoAdquisicionTotal: number, nuevosClientes: number): number | null {
  return safeDiv(costoAdquisicionTotal, nuevosClientes);
}
