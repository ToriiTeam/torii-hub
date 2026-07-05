import { CoverPage } from './pages/CoverPage';
import { MetricsPage } from './pages/MetricsPage';
import { NarrativePage } from './pages/NarrativePage';
import { DiagnosisPage } from './pages/DiagnosisPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import type { ReportMetrics, ReportNarrativa, TrendPoint } from '../../types';

export interface ReportPdfDocumentProps {
  clientName: string;
  monthLabel: string;
  metrics: ReportMetrics;
  trend: TrendPoint[];
  narrativa: ReportNarrativa;
}

// Renders the whole report as 5 fixed-size (PdfPage) divs, stacked. This is
// the single source of truth for both the on-screen preview (scaled down
// via CSS transform by the caller) and the generated PDF (captured 1:1 by
// html2canvas in generatePdf.ts) — same markup, so preview and output can't
// drift apart.
export function ReportPdfDocument({ clientName, monthLabel, metrics, trend, narrativa }: ReportPdfDocumentProps) {
  return (
    <div>
      <CoverPage clientName={clientName} monthLabel={monthLabel} />
      <MetricsPage metrics={metrics} trend={trend} />
      <NarrativePage resumenEjecutivo={narrativa.resumenEjecutivo} aprendizajes={narrativa.aprendizajes} />
      <DiagnosisPage diagnostico={narrativa.diagnostico} planAccion={narrativa.planAccion} />
      <RecommendationsPage recomendaciones={narrativa.recomendaciones} proximosPasos={narrativa.proximosPasos} />
    </div>
  );
}
