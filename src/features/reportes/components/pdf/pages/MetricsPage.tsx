import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { PdfPage } from '../PdfPage';
import type { ReportMetrics, TrendPoint } from '../../../types';

function fmtMoney(v: number | null): string {
  if (v == null) return '—';
  return `$${v.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v.toFixed(1)}%`;
}

interface MetricCard {
  label: string;
  value: string;
}

function buildCards(m: ReportMetrics): MetricCard[] {
  return [
    { label: 'Inversión total', value: fmtMoney(m.inversionTotal) },
    { label: 'Impresiones', value: m.impresiones.toLocaleString('es-MX') },
    { label: 'Clics', value: m.clics.toLocaleString('es-MX') },
    { label: 'Leads', value: m.leads.toLocaleString('es-MX') },
    { label: 'CPL', value: fmtMoney(m.cpl) },
    { label: 'CPM aproximado', value: fmtMoney(m.cpmAprox) },
    { label: 'Reuniones agendadas', value: m.reuniones.toLocaleString('es-MX') },
    { label: 'CPBC', value: fmtMoney(m.cpbc) },
    { label: 'CAC', value: fmtMoney(m.cac) },
    { label: 'Conversión lead → reunión', value: fmtPct(m.conversionLeadReunion) },
    { label: 'Show rate', value: fmtPct(m.showRate) },
    { label: 'Cierres', value: m.cierres.toLocaleString('es-MX') },
  ];
}

interface MetricsPageProps {
  metrics: ReportMetrics;
  trend: TrendPoint[];
}

export function MetricsPage({ metrics, trend }: MetricsPageProps) {
  const cards = buildCards(metrics);
  const chartData = trend.map((t) => ({
    fecha: t.fecha.slice(5), // MM-DD
    inversion: t.inversion,
    leads: t.leads,
  }));

  return (
    <PdfPage pageNumber={2}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>Métricas del período</h2>
      <div style={{ width: 40, height: 3, background: '#e5182b', marginBottom: 16 }} />

      {metrics.sinDatosMeta && (
        <p style={{ fontSize: 11, color: '#a15c00', background: '#fff6e5', border: '1px solid #ffe0a3', borderRadius: 6, padding: '8px 12px', margin: '0 0 16px' }}>
          No hay datos de Meta Ads sincronizados para este cliente en este período — las métricas de inversión/leads/CPL/CPM están en cero.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              border: '1px solid #eee',
              borderRadius: 8,
              padding: '12px 10px',
              background: '#fafafa',
            }}
          >
            <p style={{ fontSize: 9, color: '#888', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {c.label}
            </p>
            <p style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>{c.value}</p>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#1a1a1a' }}>
        Tendencia de inversión y leads (por día)
      </h3>
      {chartData.length > 0 ? (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" vertical={false} />
              <XAxis dataKey="fecha" stroke="#999" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" stroke="#999" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#999" fontSize={10} axisLine={false} tickLine={false} />
              <Line yAxisId="left" type="monotone" dataKey="inversion" stroke="#e5182b" strokeWidth={2} dot={{ r: 3 }} name="Inversión" isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="leads" stroke="#1a1a1a" strokeWidth={2} dot={{ r: 3 }} name="Leads" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: '#999' }}>Sin datos de tendencia para este período.</p>
      )}
    </PdfPage>
  );
}
