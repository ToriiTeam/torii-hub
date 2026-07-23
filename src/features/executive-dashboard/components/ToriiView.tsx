import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Users, Handshake, AlertTriangle } from 'lucide-react';
import { PortfolioView } from './PortfolioView';
import { MetricInfo, type MetricInfoProps } from './shared/MetricInfo';
import type { ToriiData } from '../types';
import {
  calcMargenBruto, calcMargenNeto, calcROI, calcTicketPromedio, calcCAC, calcIngresosOperativos, calcEgresosPeriodo,
  sumExpensesByBucket,
} from '@/features/finanzas/lib/financeCalc';
import {
  countNuevosClientes, countClientesActivos, calcCostoDeEntrega, calcCostoPorLlamadaAgendada, calcCostoPorLlamadaCalificada,
  calcRoas, calcChurn, calcRetencionMedia, calcLTV, calcLTGP, calcLtgpCac, countClientesActivosAlInicio,
  countClientesCancelados, MIN_CANCELLED_SAMPLE,
} from '../lib/businessHealth';

function fmtMoney(v: number | null): string {
  return v == null ? '—' : `$${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}
function fmtX(v: number | null): string {
  return v == null ? '—' : `${v.toFixed(1)}x`;
}
function fmtN(v: number): string {
  return v.toLocaleString();
}

// Single mechanism for every card in this view: when the "Nuevo Torii"
// toggle is ON, the (since, until) already fed into every query (ads,
// closing, incomes, expenses, clients — see fetchToriiData.ts) is clamped
// to 2026-06-01 upstream in ExecutiveDashboard.tsx. No per-card exceptions,
// no client/oferta/fuente filtering — this label just states that one
// fact identically everywhere.
function dateFloorScope(on: boolean): string {
  return on ? "Piso 'Nuevo Torii': 2026-06-01 en adelante" : 'Sin filtro adicional — usa el período seleccionado arriba';
}

// Torii's own closing-funnel cards (Reuniones, Show rate, Calificados,
// Close rate, Cierres, Revenue de Torii) add fuente != 'LinkedIn' on top of
// the same date floor — LinkedIn outbound calls are the old funnel, kept
// in the raw data but excluded from these specific cards.
function funnelScope(on: boolean): string {
  return `${dateFloorScope(on)}${on ? " + fuente != 'LinkedIn'" : ''}`;
}

function MiniKpi({ label, value, sub, valueClassName, info }: {
  label: string; value: string; sub?: string; valueClassName?: string; info: MetricInfoProps;
}) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <MetricInfo {...info} />
        </div>
        <p className={`text-lg font-bold ${valueClassName ?? ''}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

interface ToriiViewProps {
  data: ToriiData;
  periodSuffix: string;
  periodStart: string;
  periodEnd: string;
  // See dateFloorScope() above — presentational for MetricInfo's labels,
  // the actual clamp already happened upstream before `data` was fetched.
  nuevoToriiOnly: boolean;
}

export function ToriiView({ data, periodSuffix, periodStart, periodEnd, nuevoToriiOnly }: ToriiViewProps) {
  const { ads, closing, incomesTotal, expensesTotal, netProfit, portfolioMrr, portfolio, qualifiedAdsCalls, closedViaAds } = data;
  const { healthIncomes, healthExpenses, healthClients, healthInstallments, healthReservas } = data;

  // ── Grupo 1: Rentabilidad ──────────────────────────────────────────────
  const ingresosOperativos = calcIngresosOperativos(healthIncomes, periodStart, periodEnd);
  const egresosPeriodo = calcEgresosPeriodo(healthExpenses, periodStart, periodEnd);
  const costosDirectos = sumExpensesByBucket(healthExpenses, periodStart, periodEnd, ['Equipo', 'Software']);
  const margenBruto = calcMargenBruto(healthIncomes, healthExpenses, periodStart, periodEnd);
  const margenNeto = calcMargenNeto(healthIncomes, healthExpenses, periodStart, periodEnd);
  const roi = calcROI(healthIncomes, healthExpenses, periodStart, periodEnd);

  // ── Grupo 2: Adquisición ────────────────────────────────────────────────
  const clientesActivos = countClientesActivos(healthClients);
  // Meta spend comes from ads.inversion (ads_metricas_diarias via
  // meta-ads-proxy — the automated, reliable source), not from
  // expenses.category='Publicidad'. That category is still read elsewhere
  // (Finanzas) and still exists, but going forward it's only meant for ad
  // spend the Meta API doesn't cover (another platform, a one-off manual
  // boost) — never for Meta spend the sync already tracks, which is what
  // caused it to disagree with the real numbers (confirmed by audit).
  const adquisicionExpenses = sumExpensesByBucket(healthExpenses, periodStart, periodEnd, ['Adquisición']);
  const costoAdquisicionTotal = ads.inversion + adquisicionExpenses;
  // Nuevo Torii ON: denominator is "clientes cerrados vía ADS"
  // (client_closer_calls where cerro=true AND fuente='ADS') — a deal
  // closed via Referido/Otro after the date floor doesn't count. OFF:
  // reverts to the original clients.start_date-in-range definition.
  const nuevosClientes = countNuevosClientes(healthClients, periodStart, periodEnd);
  const cac = calcCAC(costoAdquisicionTotal, nuevoToriiOnly ? closedViaAds : nuevosClientes);
  const costoPorLlamadaAgendada = calcCostoPorLlamadaAgendada(healthExpenses, periodStart, periodEnd, healthReservas);
  const costoPorLlamadaCalificada = calcCostoPorLlamadaCalificada(ads.inversion, qualifiedAdsCalls);
  const costoDeEntrega = calcCostoDeEntrega(healthExpenses, periodStart, periodEnd, clientesActivos);

  // ── Grupo 3: ROAS (Meta Ads) ────────────────────────────────────────────
  const clientesConCanal = healthClients.filter((c) => c.canal_captacion != null).length;
  const roas = calcRoas({
    clients: healthClients, incomes: healthIncomes, installments: healthInstallments,
    since: periodStart, until: periodEnd, gastoPublicidad: ads.inversion,
  });

  // ── Grupo 4: LTGP:CAC ───────────────────────────────────────────────────
  const clientesCancelados = countClientesCancelados(healthClients, periodStart, periodEnd);
  const activosAlInicio = countClientesActivosAlInicio(healthClients, periodStart);
  const churn = calcChurn(healthClients, periodStart, periodEnd);
  const retencionMedia = calcRetencionMedia(churn);
  const ticketPromedio = calcTicketPromedio(healthIncomes, periodStart, periodEnd);
  const ltv = calcLTV(ticketPromedio, retencionMedia);
  const ltgp = calcLTGP(ltv, costoDeEntrega, retencionMedia);
  const ltgpCac = calcLtgpCac(ltgp, cac);
  const muestraChica = clientesCancelados < MIN_CANCELLED_SAMPLE;

  const kpis: { label: string; value: string; icon: typeof DollarSign; cls?: string; info: MetricInfoProps }[] = [
    {
      label: 'Revenue de Torii (ventas propias)', value: fmtMoney(portfolioMrr), icon: DollarSign,
      cls: portfolioMrr > 0 ? 'text-success' : undefined,
      info: {
        formula: "Suma de client_closer_calls.precio donde owner_type='torii' y cerro=true, dentro del período seleccionado.",
        source: 'client_closer_calls',
        scopeLabel: funnelScope(nuevoToriiOnly),
      },
    },
    {
      label: `Ingresos totales ${periodSuffix}`, value: fmtMoney(incomesTotal), icon: TrendingUp,
      info: {
        formula: 'Suma de incomes.amount de TODAS las filas (sin filtrar por status ni tipo), dentro del período seleccionado.',
        source: 'incomes',
        scopeLabel: dateFloorScope(nuevoToriiOnly),
      },
    },
    {
      label: `Egresos totales ${periodSuffix}`, value: fmtMoney(expensesTotal), icon: TrendingDown,
      info: {
        formula: 'Suma de expenses.amount de TODAS las filas, dentro del período seleccionado.',
        source: 'expenses',
        scopeLabel: dateFloorScope(nuevoToriiOnly),
      },
    },
    {
      label: 'Resultado neto', value: fmtMoney(netProfit), icon: DollarSign, cls: netProfit >= 0 ? 'text-success' : 'text-destructive',
      info: {
        formula: 'Ingresos totales − Egresos totales del mismo período.',
        source: 'incomes + expenses',
        scopeLabel: dateFloorScope(nuevoToriiOnly),
        breakdown: [
          { label: 'Ingresos totales', value: fmtMoney(incomesTotal) },
          { label: 'Egresos totales', value: fmtMoney(expensesTotal) },
        ],
      },
    },
    {
      label: 'Inversión ads propia', value: fmtMoney(ads.inversion), icon: DollarSign,
      info: {
        formula: 'Suma de ads_metricas_diarias.inversion de las cuentas propias de Torii (ads_campanas.client_id es null), dentro del período seleccionado.',
        source: 'ads_metricas_diarias + ads_campanas',
        scopeLabel: dateFloorScope(nuevoToriiOnly),
      },
    },
    {
      label: 'Leads (cuentas propias)', value: fmtN(ads.leads), icon: Users,
      info: {
        formula: 'Suma de ads_metricas_diarias.leads de las cuentas propias de Torii, dentro del período seleccionado.',
        source: 'ads_metricas_diarias + ads_campanas',
        scopeLabel: dateFloorScope(nuevoToriiOnly),
      },
    },
    {
      label: 'Reuniones (funnel propio)', value: fmtN(closing.reuniones), icon: Handshake,
      info: {
        formula: "Cantidad de filas en client_closer_calls donde owner_type='torii', dentro del período seleccionado (sin filtrar por resultado).",
        source: 'client_closer_calls',
        scopeLabel: funnelScope(nuevoToriiOnly),
      },
    },
    {
      label: 'Cierres (Torii)', value: fmtN(closing.cierres), icon: Handshake,
      info: {
        formula: "Cantidad de filas en client_closer_calls donde owner_type='torii' y cerro=true, dentro del período seleccionado.",
        source: 'client_closer_calls',
        scopeLabel: funnelScope(nuevoToriiOnly),
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="bg-card border-border/50">
              <CardContent className="p-4 text-center">
                <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className={`text-lg font-bold ${k.cls ?? ''}`}>{k.value}</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <MetricInfo {...k.info} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium">Closing propio de Torii</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-lg font-bold">{fmtPct(closing.showRate)}</p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-xs text-muted-foreground">Show rate</p>
              <MetricInfo
                formula="Se presentaron / Reuniones, sobre client_closer_calls donde owner_type='torii', dentro del período seleccionado."
                source="client_closer_calls"
                scopeLabel={funnelScope(nuevoToriiOnly)}
                breakdown={[
                  { label: 'Se presentaron', value: fmtN(closing.asistieron) },
                  { label: 'Reuniones', value: fmtN(closing.reuniones) },
                ]}
              />
            </div>
          </div>
          <div>
            <p className="text-lg font-bold">{closing.calificados}</p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-xs text-muted-foreground">Calificados</p>
              <MetricInfo
                formula="Cantidad de filas en client_closer_calls donde owner_type='torii' y califico=true, dentro del período seleccionado."
                source="client_closer_calls"
                scopeLabel={funnelScope(nuevoToriiOnly)}
              />
            </div>
          </div>
          <div>
            <p className="text-lg font-bold">{fmtPct(closing.closeRate)}</p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-xs text-muted-foreground">Close rate</p>
              <MetricInfo
                formula="Cierres / Calificados, sobre client_closer_calls donde owner_type='torii', dentro del período seleccionado."
                source="client_closer_calls"
                scopeLabel={funnelScope(nuevoToriiOnly)}
                breakdown={[
                  { label: 'Cierres', value: fmtN(closing.cierres) },
                  { label: 'Calificados', value: fmtN(closing.calificados) },
                ]}
              />
            </div>
          </div>
          <div>
            <p className="text-lg font-bold">{fmtMoney(ads.cpl)}</p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-xs text-muted-foreground">CPL propio</p>
              <MetricInfo
                formula="Inversión ads propia / Leads (cuentas propias)."
                source="ads_metricas_diarias"
                scopeLabel={dateFloorScope(nuevoToriiOnly)}
                breakdown={[
                  { label: 'Inversión ads', value: fmtMoney(ads.inversion) },
                  { label: 'Leads', value: fmtN(ads.leads) },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Salud del Negocio ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Salud del Negocio <span className="text-sm font-normal text-muted-foreground">{periodSuffix}</span></h2>

        {/* Grupo 1: Rentabilidad */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Rentabilidad</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MiniKpi
              label="Margen bruto" value={fmtPct(margenBruto)}
              valueClassName={margenBruto == null ? 'text-muted-foreground' : margenBruto >= 0 ? 'text-success' : 'text-destructive'}
              info={{
                formula: '(Ingresos operativos − Costos directos) / Ingresos operativos. Ingresos operativos = incomes con status=Paid y type=Cliente. Costos directos = expenses de categoría Equipo + Software.',
                source: 'incomes + expenses',
                scopeLabel: dateFloorScope(nuevoToriiOnly),
                breakdown: [
                  { label: 'Ingresos operativos', value: fmtMoney(ingresosOperativos) },
                  { label: 'Costos directos (Equipo+Software)', value: fmtMoney(costosDirectos) },
                ],
              }}
            />
            <MiniKpi
              label="Margen neto" value={fmtPct(margenNeto)}
              valueClassName={margenNeto == null ? 'text-muted-foreground' : margenNeto >= 0 ? 'text-success' : 'text-destructive'}
              info={{
                formula: '(Ingresos operativos − Egresos totales) / Ingresos operativos.',
                source: 'incomes + expenses',
                scopeLabel: dateFloorScope(nuevoToriiOnly),
                breakdown: [
                  { label: 'Ingresos operativos', value: fmtMoney(ingresosOperativos) },
                  { label: 'Egresos totales', value: fmtMoney(egresosPeriodo) },
                ],
              }}
            />
            <MiniKpi
              label="ROI" value={roi != null ? fmtX(roi) : 'Sin datos'}
              valueClassName={roi != null && roi >= 1 ? 'text-success' : undefined}
              info={{
                formula: 'Ingresos operativos / Egresos totales.',
                source: 'incomes + expenses',
                scopeLabel: dateFloorScope(nuevoToriiOnly),
                breakdown: [
                  { label: 'Ingresos operativos', value: fmtMoney(ingresosOperativos) },
                  { label: 'Egresos totales', value: fmtMoney(egresosPeriodo) },
                ],
              }}
            />
          </div>
        </div>

        {/* Grupo 2: Adquisición */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Adquisición</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MiniKpi
              label="CAC"
              value={cac != null ? fmtMoney(cac) : 'Sin datos'}
              sub={nuevoToriiOnly
                ? `${closedViaAds} cliente${closedViaAds !== 1 ? 's' : ''} cerrado${closedViaAds !== 1 ? 's' : ''} vía ADS`
                : `${nuevosClientes} cliente${nuevosClientes !== 1 ? 's' : ''} nuevo${nuevosClientes !== 1 ? 's' : ''}`}
              info={{
                formula: nuevoToriiOnly
                  ? "Costo de adquisición total (Inversión ads + gasto de categoría Adquisición) / Clientes cerrados vía ADS (client_closer_calls donde cerro=true y fuente='ADS')."
                  : 'Costo de adquisición total (Inversión ads + gasto de categoría Adquisición) / Nuevos clientes (clients.start_date dentro del período).',
                source: nuevoToriiOnly ? 'ads_metricas_diarias + expenses + client_closer_calls' : 'ads_metricas_diarias + expenses + clients',
                scopeLabel: dateFloorScope(nuevoToriiOnly),
                breakdown: nuevoToriiOnly ? [
                  { label: 'Inversión ads', value: fmtMoney(ads.inversion) },
                  { label: 'Gasto Adquisición', value: fmtMoney(adquisicionExpenses) },
                  { label: 'Clientes cerrados vía ADS', value: fmtN(closedViaAds) },
                ] : [
                  { label: 'Inversión ads', value: fmtMoney(ads.inversion) },
                  { label: 'Gasto Adquisición', value: fmtMoney(adquisicionExpenses) },
                  { label: 'Nuevos clientes', value: fmtN(nuevosClientes) },
                ],
              }}
            />
            {nuevoToriiOnly ? (
              <MiniKpi
                label="Costo por llamada calificada"
                value={costoPorLlamadaCalificada != null ? fmtMoney(costoPorLlamadaCalificada) : 'Sin datos'}
                sub={`${qualifiedAdsCalls} llamada${qualifiedAdsCalls !== 1 ? 's' : ''} calificada${qualifiedAdsCalls !== 1 ? 's' : ''} (ADS)`}
                info={{
                  formula: "Inversión en ads / cantidad de client_closer_calls donde owner_type='torii', fuente='ADS', se_presento=true y califico=true.",
                  source: 'ads_metricas_diarias + client_closer_calls',
                  scopeLabel: dateFloorScope(nuevoToriiOnly),
                  breakdown: [
                    { label: 'Inversión ads', value: fmtMoney(ads.inversion) },
                    { label: 'Llamadas calificadas (ADS)', value: fmtN(qualifiedAdsCalls) },
                  ],
                }}
              />
            ) : (
              <MiniKpi
                label="Costo por llamada agendada"
                value={costoPorLlamadaAgendada != null ? fmtMoney(costoPorLlamadaAgendada) : 'Sin datos'}
                sub={`${healthReservas} reserva${healthReservas !== 1 ? 's' : ''}`}
                info={{
                  formula: 'Gasto de categoría Adquisición / Reservas (TODAS las filas de client_closer_calls en el período, cualquier owner_type).',
                  source: 'expenses + client_closer_calls',
                  scopeLabel: dateFloorScope(nuevoToriiOnly),
                  breakdown: [
                    { label: 'Gasto Adquisición', value: fmtMoney(adquisicionExpenses) },
                    { label: 'Reservas (todas)', value: fmtN(healthReservas) },
                  ],
                }}
              />
            )}
            <MiniKpi
              label="Costo de entrega"
              value={costoDeEntrega != null ? fmtMoney(costoDeEntrega) : 'Sin datos'}
              sub={`${clientesActivos} cliente${clientesActivos !== 1 ? 's' : ''} activo${clientesActivos !== 1 ? 's' : ''}`}
              info={{
                formula: 'Gasto de categoría Equipo + Software / Clientes activos.',
                source: 'expenses + clients',
                scopeLabel: dateFloorScope(nuevoToriiOnly),
                breakdown: [
                  { label: 'Gasto Equipo+Software', value: fmtMoney(costosDirectos) },
                  { label: 'Clientes activos', value: fmtN(clientesActivos) },
                ],
              }}
            />
          </div>
        </div>

        {/* Grupo 3: ROAS (Meta Ads) */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">ROAS (Meta Ads)</h3>
          {clientesConCanal === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Cargá canal_captacion en Clientes para ver este número.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniKpi
                label="ROAS Cash" value={roas.cash != null ? fmtX(roas.cash) : 'Sin datos'}
                sub={`${roas.clientesBase} cliente${roas.clientesBase !== 1 ? 's' : ''} Meta Ads`}
                info={{
                  formula: "Cash cobrado (incomes Paid) de clientes con canal_captacion='Meta Ads' cuyo start_date cae en el período / Inversión ads.",
                  source: 'incomes + clients + ads_metricas_diarias',
                  scopeLabel: dateFloorScope(nuevoToriiOnly),
                  breakdown: [
                    { label: 'Inversión ads', value: fmtMoney(ads.inversion) },
                    { label: 'Clientes Meta Ads en rango', value: fmtN(roas.clientesBase) },
                  ],
                }}
              />
              <MiniKpi
                label="ROAS Upfront" value={roas.upfront != null ? fmtX(roas.upfront) : 'Sin datos'}
                info={{
                  formula: 'Primera cuota (client_installments #1, o el pago equivalente en incomes) de esos mismos clientes / Inversión ads.',
                  source: 'client_installments + incomes + clients + ads_metricas_diarias',
                  scopeLabel: dateFloorScope(nuevoToriiOnly),
                }}
              />
              <MiniKpi
                label="ROAS Contrato" value={roas.contrato != null ? fmtX(roas.contrato) : 'Sin datos'}
                info={{
                  formula: 'Suma de TODAS las cuotas (client_installments) de esos mismos clientes / Inversión ads.',
                  source: 'client_installments + clients + ads_metricas_diarias',
                  scopeLabel: dateFloorScope(nuevoToriiOnly),
                }}
              />
            </div>
          )}
        </div>

        {/* Grupo 4: LTGP:CAC */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">LTGP:CAC</h3>
          {muestraChica && (
            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-warning mb-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Muestra chica, no confiable todavía ({clientesCancelados} de {MIN_CANCELLED_SAMPLE} clientes cancelados necesarios).
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniKpi
              label="Churn" value={fmtPct(churn)}
              info={{
                formula: 'Clientes cancelados en el período / Clientes activos al inicio del período.',
                source: 'clients',
                scopeLabel: dateFloorScope(nuevoToriiOnly),
                breakdown: [
                  { label: 'Cancelados en el período', value: fmtN(clientesCancelados) },
                  { label: 'Activos al inicio del período', value: fmtN(activosAlInicio) },
                ],
              }}
            />
            <MiniKpi
              label="LTV" value={ltv != null ? fmtMoney(ltv) : 'Sin datos'}
              info={{
                formula: 'Ticket promedio (incomes Paid + type=Cliente) × Retención media (1 / Churn).',
                source: 'incomes + clients',
                scopeLabel: dateFloorScope(nuevoToriiOnly),
                breakdown: [
                  { label: 'Ticket promedio', value: fmtMoney(ticketPromedio) },
                  { label: 'Retención media', value: retencionMedia != null ? retencionMedia.toFixed(2) : '—' },
                ],
              }}
            />
            <MiniKpi
              label="LTGP"
              value={ltgp != null ? fmtMoney(ltgp) : 'Sin datos'}
              valueClassName={ltgp == null ? 'text-muted-foreground' : ltgp >= 0 ? 'text-success' : 'text-destructive'}
              info={{
                formula: 'LTV − (Costo de entrega × Retención media).',
                source: 'incomes + expenses + clients',
                scopeLabel: dateFloorScope(nuevoToriiOnly),
                breakdown: [
                  { label: 'LTV', value: fmtMoney(ltv) },
                  { label: 'Costo de entrega', value: fmtMoney(costoDeEntrega) },
                  { label: 'Retención media', value: retencionMedia != null ? retencionMedia.toFixed(2) : '—' },
                ],
              }}
            />
            <MiniKpi
              label="LTGP:CAC"
              value={ltgpCac != null ? fmtX(ltgpCac) : 'Sin datos'}
              valueClassName={ltgpCac == null ? 'text-muted-foreground' : ltgpCac < 1 ? 'text-destructive' : ltgpCac <= 3 ? 'text-warning' : 'text-success'}
              info={{
                formula: 'LTGP / CAC.',
                source: 'incomes + expenses + clients + ads_metricas_diarias',
                scopeLabel: dateFloorScope(nuevoToriiOnly),
                breakdown: [
                  { label: 'LTGP', value: fmtMoney(ltgp) },
                  { label: 'CAC', value: fmtMoney(cac) },
                ],
              }}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold">Resumen del portfolio</h2>
        </div>
        {/* showToriiRevenue=false: the "Revenue de Torii" KPI card would
            just repeat portfolioMrr, already shown above in this same
            view's own KPI row. This embedded portfolio table already
            receives the SAME clamped (since, until) as everything else in
            this view (fetchToriiData.ts passes it straight through to
            fetchPortfolioData), so it's covered by the single mechanism
            too — no separate scoping needed here. */}
        <PortfolioView data={portfolio} showToriiRevenue={false} />
      </div>
    </div>
  );
}
