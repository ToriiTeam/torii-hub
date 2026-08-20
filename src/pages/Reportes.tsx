import { useState } from 'react';
import { ReportsListView } from '@/features/reportes/components/ReportsListView';
import { ReportWizard } from '@/features/reportes/components/ReportWizard';

// fixedClientId/fixedClientName: cuando viene de la subcuenta de un cliente
// puntual (/c/:id/reportes, ver ClienteDetalle.tsx) en vez del modo "Torii"
// del sidebar — mismo patrón que Closers/ContenidoOrganico/VslSection/
// VslTracking/MetaAds. Filtra la lista de informes y precarga/bloquea el
// cliente del wizard, sin selector adentro.
interface ReportesProps {
  fixedClientId?: string;
  fixedClientName?: string;
}

export default function Reportes({ fixedClientId, fixedClientName }: ReportesProps = {}) {
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-sm text-muted-foreground">Informes mensuales en PDF por cliente</p>
      </div>

      {creating ? (
        <ReportWizard
          onClose={() => setCreating(false)}
          onSaved={() => setRefreshKey((k) => k + 1)}
          fixedClientId={fixedClientId}
          fixedClientName={fixedClientName}
        />
      ) : (
        <ReportsListView onNewReport={() => setCreating(true)} refreshKey={refreshKey} fixedClientId={fixedClientId} />
      )}
    </div>
  );
}
