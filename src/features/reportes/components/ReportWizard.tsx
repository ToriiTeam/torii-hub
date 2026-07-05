import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { Step1ClientMonth } from './wizard/Step1ClientMonth';
import { Step2MetricsReview } from './wizard/Step2MetricsReview';
import { Step3Narrativa } from './wizard/Step3Narrativa';
import { Step4Diagnostico } from './wizard/Step4Diagnostico';
import { Step5Recomendaciones } from './wizard/Step5Recomendaciones';
import { Step6PreviewGenerate } from './wizard/Step6PreviewGenerate';
import { useReportDraft } from '../hooks/useReportDraft';
import { createReport, updateReportPdfUrl, uploadReportPdf, markReportSent } from '../lib/reportsRepo';
import { blobToBase64 } from '../lib/generatePdf';
import { generateNarrativeDraft } from '../lib/generateNarrativeDraft';
import { supabase } from '@/integrations/supabase/client';

const STEP_LABELS = [
  'Cliente y período',
  'Métricas',
  'Resumen y aprendizajes',
  'Diagnóstico',
  'Recomendaciones',
  'Preview y generación',
];

interface ReportWizardProps {
  onClose: () => void;
  onSaved: () => void;
}

export function ReportWizard({ onClose, onSaved }: ReportWizardProps) {
  const {
    draft,
    periodRange,
    setClient,
    setPeriodType,
    setMonthPeriod,
    setWeekStart,
    setCustomRange,
    setMetrics,
    setNarrativa,
    loadMetrics,
    loadingMetrics,
  } = useReportDraft();
  const [step, setStep] = useState(0);
  const [reportId, setReportId] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [generatingNarrativa, setGeneratingNarrativa] = useState(false);

  // Auto-fill once when the metrics step is first reached for a given
  // client/period — Step2 also has a manual "Auto-llenar de nuevo" button
  // for after the user changes client/period.
  useEffect(() => {
    if (step === 1 && draft.clientId && !draft.metricsAutoFilled) {
      loadMetrics();
    }
  }, [step, draft.clientId, draft.metricsAutoFilled, loadMetrics]);

  useEffect(() => {
    if (!draft.clientId) {
      setClientEmail(null);
      return;
    }
    supabase.from('clients').select('email').eq('id', draft.clientId).single().then(({ data }) => {
      setClientEmail(data?.email ?? null);
    });
  }, [draft.clientId]);

  const canGoNext = step === 0 ? !!draft.clientId : true;

  async function handleGenerateNarrativa() {
    if (!draft.clientId) return;
    setGeneratingNarrativa(true);
    try {
      const narrativa = await generateNarrativeDraft({
        clientId: draft.clientId,
        clientName: draft.clientName,
        periodLabel: periodRange.label,
        fechaInicio: periodRange.fechaInicio,
        fechaFin: periodRange.fechaFin,
        metrics: draft.metrics,
      });
      setNarrativa(narrativa);
      toast.success('Borrador generado — revisalo en los pasos siguientes');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el borrador con IA');
    } finally {
      setGeneratingNarrativa(false);
    }
  }

  async function ensureReport(): Promise<string> {
    if (reportId) return reportId;
    const report = await createReport({
      client_id: draft.clientId,
      periodo_tipo: draft.periodType,
      fecha_inicio: periodRange.fechaInicio,
      fecha_fin: periodRange.fechaFin,
      metricas: draft.metrics,
      narrativa: draft.narrativa,
    });
    setReportId(report.id);
    return report.id;
  }

  async function handleGenerated(blob: Blob) {
    const id = await ensureReport();
    const url = await uploadReportPdf(id, draft.clientId, periodRange.fechaInicio, blob);
    await updateReportPdfUrl(id, url);
    onSaved();
  }

  async function handleSend(blob: Blob) {
    if (!clientEmail) {
      toast.error('Este cliente no tiene email cargado');
      return;
    }
    const id = await ensureReport();
    const url = await uploadReportPdf(id, draft.clientId, periodRange.fechaInicio, blob);
    await updateReportPdfUrl(id, url);

    const base64 = await blobToBase64(blob);
    const { error } = await supabase.functions.invoke('send-report-email', {
      body: {
        to: clientEmail,
        clientName: draft.clientName,
        monthLabel: periodRange.label,
        pdfBase64: base64,
      },
    });
    if (error) throw error;

    await markReportSent(id);
    onSaved();
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <Step1ClientMonth
            clientId={draft.clientId}
            periodType={draft.periodType}
            year={draft.year}
            month={draft.month}
            weekStart={draft.weekStart}
            customSince={draft.customSince}
            customUntil={draft.customUntil}
            onClientChange={setClient}
            onPeriodTypeChange={setPeriodType}
            onMonthPeriodChange={setMonthPeriod}
            onWeekStartChange={setWeekStart}
            onCustomRangeChange={setCustomRange}
          />
        );
      case 1:
        return (
          <Step2MetricsReview
            metrics={draft.metrics}
            autoFilled={draft.metricsAutoFilled}
            loading={loadingMetrics}
            onChange={setMetrics}
            onReload={loadMetrics}
            disabled={!draft.clientId}
            onGenerateNarrativa={handleGenerateNarrativa}
            generatingNarrativa={generatingNarrativa}
          />
        );
      case 2:
        return <Step3Narrativa narrativa={draft.narrativa} onChange={setNarrativa} />;
      case 3:
        return <Step4Diagnostico narrativa={draft.narrativa} onChange={setNarrativa} />;
      case 4:
        return <Step5Recomendaciones narrativa={draft.narrativa} onChange={setNarrativa} />;
      case 5:
        return (
          <Step6PreviewGenerate
            clientName={draft.clientName}
            periodLabel={periodRange.label}
            metrics={draft.metrics}
            trend={draft.trend}
            narrativa={draft.narrativa}
            canSend={!!clientEmail}
            sendDisabledReason={!clientEmail ? 'Este cliente no tiene email cargado en Clientes.' : undefined}
            onGenerated={handleGenerated}
            onSend={handleSend}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Nuevo informe</h2>
          <p className="text-sm text-muted-foreground">
            Paso {step + 1} de {STEP_LABELS.length} · {STEP_LABELS[step]}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="flex gap-1.5">
        {STEP_LABELS.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-secondary'}`}
          />
        ))}
      </div>

      {renderStep()}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" />Anterior
        </Button>
        {step < STEP_LABELS.length - 1 && (
          <Button onClick={() => setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1))} disabled={!canGoNext} className="bg-primary">
            Siguiente<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
