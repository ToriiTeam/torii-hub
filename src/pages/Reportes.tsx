import { useState } from 'react';
import { ReportsListView } from '@/features/reportes/components/ReportsListView';
import { ReportWizard } from '@/features/reportes/components/ReportWizard';

export default function Reportes() {
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
        />
      ) : (
        <ReportsListView onNewReport={() => setCreating(true)} refreshKey={refreshKey} />
      )}
    </div>
  );
}
