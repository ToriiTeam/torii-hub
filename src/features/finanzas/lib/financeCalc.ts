import type { CashOpeningBalance, Debt, Income, Expense } from './types';

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
