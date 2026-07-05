import { PdfPage } from '../PdfPage';
import { ReportLogo } from '../ReportLogo';

interface CoverPageProps {
  clientName: string;
  periodLabel: string; // e.g. "Junio 2026", "Semana del 02 al 08 de junio 2026", "01/06/2026 — 30/06/2026"
}

export function CoverPage({ clientName, periodLabel }: CoverPageProps) {
  return (
    <PdfPage pageNumber={1}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ReportLogo size={28} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: 64, height: 4, background: '#e5182b', marginBottom: 24 }} />
          <p style={{ fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Informe de Performance
          </p>
          <h1 style={{ fontSize: 42, fontWeight: 700, margin: '8px 0 0', color: '#1a1a1a' }}>{clientName}</h1>
          <p style={{ fontSize: 20, color: '#555', margin: '12px 0 0' }}>{periodLabel}</p>
        </div>

        <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>
          Preparado por el equipo de Torii — Marketing & Growth
        </p>
      </div>
    </PdfPage>
  );
}
