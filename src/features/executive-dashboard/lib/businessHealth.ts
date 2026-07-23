import { inRange, safeDiv, sumExpensesByBucket } from '@/features/finanzas/lib/financeCalc';
import type { Expense, Income } from '@/features/finanzas/lib/types';
import type { ClientInstallmentRow } from '@/components/finanzas/types';

// Minimal client shape needed for "Salud del Negocio" — not the same as
// executive-dashboard's own ClientBase (which is scoped to portfolio/
// delivery-phase clients). This one needs ALL clients regardless of
// status, since churn/CAC/ROAS all reason about cancelled and not-yet-
// started clients too.
export interface ClientHealthRow {
  id: string;
  start_date: string | null;
  status: string | null;
  fecha_cancelacion: string | null;
  canal_captacion: string | null;
}

// Below this many cancelled clients, churn/LTV/LTGP:CAC are statistically
// meaningless — shown with a permanent "muestra chica" warning instead of
// hiding the numbers outright. Easy to tune as real cancellation data
// accumulates.
export const MIN_CANCELLED_SAMPLE = 8;

export function countNuevosClientes(clients: ClientHealthRow[], since: string, until: string): number {
  return clients.filter((c) => inRange(c.start_date, since, until)).length;
}

export function countClientesActivos(clients: ClientHealthRow[]): number {
  return clients.filter((c) => c.status === 'active').length;
}

export function calcCostoDeEntrega(expenses: Expense[], since: string, until: string, clientesActivos: number): number | null {
  return safeDiv(sumExpensesByBucket(expenses, since, until, ['Equipo', 'Software']), clientesActivos);
}

// "Viejo Torii" (toggle OFF) version — Adquisición expenses / ALL booked
// calls (any owner_type), period-scoped. Kept alongside
// calcCostoPorLlamadaCalificada below (Nuevo Torii ON) rather than
// replaced, since ToriiView.tsx branches between the two by toggle state.
export function calcCostoPorLlamadaAgendada(expenses: Expense[], since: string, until: string, reservas: number): number | null {
  return safeDiv(sumExpensesByBucket(expenses, since, until, ['Adquisición']), reservas);
}

// Inversión en ads (house accounts, date-floor-scoped) / cantidad de
// client_closer_calls donde owner_type='torii', fuente='ADS',
// se_presento=true y califico=true — both computed in fetchToriiData.ts
// (adsInversion comes from the same `ads` field CAC already uses;
// qualifiedAdsCalls needs raw row access this file doesn't have).
export function calcCostoPorLlamadaCalificada(adsInversion: number, qualifiedAdsCalls: number): number | null {
  return safeDiv(adsInversion, qualifiedAdsCalls);
}

// ─── ROAS (Meta Ads only) ───────────────────────────────────────────────────

export interface RoasResult {
  clientesBase: number;
  cash: number | null;
  upfront: number | null;
  contrato: number | null;
}

export function calcRoas(opts: {
  clients: ClientHealthRow[];
  incomes: Income[];
  installments: ClientInstallmentRow[];
  since: string;
  until: string;
  // Meta ad spend for the denominator — passed in as ads.inversion (from
  // ads_metricas_diarias via meta-ads-proxy), not read from
  // expenses.category='Publicidad'. That category is manually-entered and
  // was found to disagree with the API's real numbers (see the audit that
  // prompted this change) — expenses.Publicidad still exists, but from now
  // on it's only for ad spend the Meta API doesn't cover (another
  // platform, a one-off manual boost), never for Meta spend the sync
  // already tracks. See the same reasoning in ToriiView.tsx's CAC calc.
  gastoPublicidad: number;
}): RoasResult {
  const { clients, incomes, installments, since, until, gastoPublicidad } = opts;

  const metaClientIds = new Set(
    clients.filter((c) => c.canal_captacion === 'Meta Ads' && inRange(c.start_date, since, until)).map((c) => c.id),
  );

  if (metaClientIds.size === 0) {
    return { clientesBase: 0, cash: null, upfront: null, contrato: null };
  }

  const cash = incomes
    .filter((i) => i.status === 'Paid' && i.client_id != null && metaClientIds.has(i.client_id))
    .reduce((s, i) => s + Number(i.amount), 0);

  const installmentsByClient = new Map<string, ClientInstallmentRow[]>();
  for (const inst of installments) {
    if (!inst.client_id || !metaClientIds.has(inst.client_id)) continue;
    const list = installmentsByClient.get(inst.client_id) ?? [];
    list.push(inst);
    installmentsByClient.set(inst.client_id, list);
  }

  let upfront = 0;
  let contrato = 0;
  for (const clientId of metaClientIds) {
    const clientInstallments = installmentsByClient.get(clientId);
    if (clientInstallments && clientInstallments.length > 0) {
      const first = clientInstallments.find((i) => i.installment_number === 1);
      if (first) upfront += Number(first.amount);
      contrato += clientInstallments.reduce((s, i) => s + Number(i.amount), 0);
    } else {
      // No client_installments rows for this client — fall back to the
      // matching incomes row for their first installment.
      const firstIncome = incomes.find((i) => i.client_id === clientId && i.installment_number === 1);
      if (firstIncome) {
        upfront += Number(firstIncome.amount);
        contrato += Number(firstIncome.amount);
      }
    }
  }

  return {
    clientesBase: metaClientIds.size,
    cash: safeDiv(cash, gastoPublicidad),
    upfront: safeDiv(upfront, gastoPublicidad),
    contrato: safeDiv(contrato, gastoPublicidad),
  };
}

// ─── Churn / LTV / LTGP ─────────────────────────────────────────────────────

export function countClientesActivosAlInicio(clients: ClientHealthRow[], periodStart: string): number {
  return clients.filter((c) => {
    if (!c.start_date || c.start_date > periodStart) return false;
    if (c.fecha_cancelacion && c.fecha_cancelacion <= periodStart) return false;
    return true;
  }).length;
}

export function countClientesCancelados(clients: ClientHealthRow[], since: string, until: string): number {
  return clients.filter((c) => inRange(c.fecha_cancelacion, since, until)).length;
}

export function calcChurn(clients: ClientHealthRow[], periodStart: string, periodEnd: string): number | null {
  const cancelados = countClientesCancelados(clients, periodStart, periodEnd);
  const activosAlInicio = countClientesActivosAlInicio(clients, periodStart);
  return safeDiv(cancelados, activosAlInicio);
}

export function calcRetencionMedia(churn: number | null): number | null {
  if (churn == null || churn === 0) return null;
  return 1 / churn;
}

export function calcLTV(ticketPromedio: number | null, retencionMedia: number | null): number | null {
  if (ticketPromedio == null || retencionMedia == null) return null;
  return ticketPromedio * retencionMedia;
}

export function calcLTGP(ltv: number | null, costoDeEntrega: number | null, retencionMedia: number | null): number | null {
  if (ltv == null || costoDeEntrega == null || retencionMedia == null) return null;
  return ltv - costoDeEntrega * retencionMedia;
}

export function calcLtgpCac(ltgp: number | null, cac: number | null): number | null {
  if (ltgp == null || cac == null || cac === 0) return null;
  return ltgp / cac;
}
