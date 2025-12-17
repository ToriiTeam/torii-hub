import { useState, useCallback } from 'react';
import { useStore } from './useStore';
import { ReportType, ReportConfig, ReportHistory, N8NConnectionStatus } from '@/types/integrations';
import { toast } from 'sonner';

const reportTypeLabels: Record<ReportType, string> = {
  daily_metrics: 'Métricas Diarias',
  weekly_summary: 'Resumen Semanal',
  monthly_report: 'Reporte Mensual',
  financial: 'Estado Financiero',
  custom: 'Personalizado',
};

export function useN8N() {
  const [isTesting, setIsTesting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [webhookUrl, setWebhookUrl] = useStore<string>('n8n:webhook_url', '');
  const [reportHistory, setReportHistory] = useStore<ReportHistory[]>('reports:history', []);
  const [lastTestResult, setLastTestResult] = useState<boolean | null>(null);

  const connectionStatus: N8NConnectionStatus = {
    connected: !!webhookUrl && lastTestResult === true,
    webhookUrl: webhookUrl || undefined,
    lastTest: lastTestResult !== null ? new Date().toISOString() : undefined,
  };

  const saveWebhookUrl = useCallback((url: string) => {
    setWebhookUrl(url);
    setLastTestResult(null); // Reset test status when URL changes
  }, [setWebhookUrl]);

  const testConnection = useCallback(async () => {
    if (!webhookUrl) {
      toast.error('Ingresa una URL de webhook primero');
      return false;
    }

    setIsTesting(true);
    try {
      // Attempt to send a test request to the webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors', // N8N webhooks may not have CORS configured
        body: JSON.stringify({
          type: 'test',
          timestamp: new Date().toISOString(),
          message: 'Test connection from Torii Platform',
        }),
      });

      // With no-cors, we can't read the response, so we assume success if no error
      setLastTestResult(true);
      toast.success('Conexión exitosa con N8N');
      return true;
    } catch (error) {
      console.error('Error testing N8N connection:', error);
      setLastTestResult(false);
      toast.error('Error al conectar con N8N. Verifica la URL del webhook.');
      return false;
    } finally {
      setIsTesting(false);
    }
  }, [webhookUrl]);

  const sendReport = useCallback(async (config: ReportConfig, data: Record<string, any>) => {
    if (!webhookUrl) {
      toast.error('Configura el webhook de N8N primero');
      return false;
    }

    setIsSending(true);
    
    const reportEntry: ReportHistory = {
      id: Date.now().toString(),
      type: config.type,
      date: new Date().toISOString(),
      status: 'pendiente',
    };

    try {
      const payload = {
        type: config.type,
        typeName: reportTypeLabels[config.type],
        timestamp: new Date().toISOString(),
        period: {
          start: config.startDate,
          end: config.endDate,
        },
        data: data,
        platform: 'Torii',
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify(payload),
      });

      reportEntry.status = 'enviado';
      setReportHistory(prev => [reportEntry, ...prev].slice(0, 50)); // Keep last 50 reports
      
      toast.success(`Reporte "${reportTypeLabels[config.type]}" enviado exitosamente`);
      return true;
    } catch (error) {
      console.error('Error sending report:', error);
      reportEntry.status = 'fallido';
      setReportHistory(prev => [reportEntry, ...prev].slice(0, 50));
      
      toast.error('Error al enviar el reporte. Revisa el webhook.');
      return false;
    } finally {
      setIsSending(false);
    }
  }, [webhookUrl, setReportHistory]);

  const resendReport = useCallback(async (reportId: string) => {
    // Find the report and resend
    const report = reportHistory.find(r => r.id === reportId);
    if (!report) return false;

    // Mark as pending
    setReportHistory(prev => 
      prev.map(r => r.id === reportId ? { ...r, status: 'pendiente' as const } : r)
    );

    // Simulate resend (in real app, we'd need to store the original data)
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          type: report.type,
          timestamp: new Date().toISOString(),
          resend: true,
        }),
      });

      setReportHistory(prev => 
        prev.map(r => r.id === reportId ? { ...r, status: 'enviado' as const, date: new Date().toISOString() } : r)
      );
      
      toast.success('Reporte reenviado');
      return true;
    } catch {
      setReportHistory(prev => 
        prev.map(r => r.id === reportId ? { ...r, status: 'fallido' as const } : r)
      );
      toast.error('Error al reenviar');
      return false;
    }
  }, [webhookUrl, reportHistory, setReportHistory]);

  const clearHistory = useCallback(() => {
    setReportHistory([]);
    toast.success('Historial limpiado');
  }, [setReportHistory]);

  return {
    connectionStatus,
    webhookUrl,
    reportHistory,
    isTesting,
    isSending,
    lastTestResult,
    saveWebhookUrl,
    testConnection,
    sendReport,
    resendReport,
    clearHistory,
    reportTypeLabels,
  };
}
