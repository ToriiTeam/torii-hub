import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Download, Send, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { listReports, markReportSent } from '../lib/reportsRepo';
import type { ReportWithClient } from '../types';

interface ReportsListViewProps {
  onNewReport: () => void;
  refreshKey: number;
}

export function ReportsListView({ onNewReport, refreshKey }: ReportsListViewProps) {
  const [reports, setReports] = useState<ReportWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await listReports());
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar los informes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports, refreshKey]);

  async function handleResend(report: ReportWithClient) {
    if (!report.pdf_url) {
      toast.error('Este informe todavía no tiene un PDF generado');
      return;
    }
    if (!report.clientEmail) {
      toast.error('Este cliente no tiene email cargado');
      return;
    }
    setSendingId(report.id);
    try {
      const pdfRes = await fetch(report.pdf_url);
      const blob = await pdfRes.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const monthLabel = format(parseISO(report.mes), 'MMMM yyyy', { locale: es });
      const { error } = await supabase.functions.invoke('send-report-email', {
        body: { to: report.clientEmail, clientName: report.clientName, monthLabel, pdfBase64: base64 },
      });
      if (error) throw error;
      await markReportSent(report.id);
      toast.success('Informe enviado');
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error('Error al enviar el informe');
    } finally {
      setSendingId(null);
    }
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Informes generados</CardTitle>
        <Button onClick={onNewReport} className="bg-primary">
          <Plus className="h-4 w-4 mr-1" />Nuevo informe
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Mes</TableHead>
              <TableHead>Generado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando…</TableCell></TableRow>
            )}
            {!loading && reports.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Todavía no se generó ningún informe.</TableCell></TableRow>
            )}
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.clientName}</TableCell>
                <TableCell className="capitalize">{format(parseISO(r.mes), 'MMMM yyyy', { locale: es })}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(parseISO(r.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                <TableCell>
                  {r.enviado ? (
                    <Badge className="bg-success/20 text-success border-0">Enviado</Badge>
                  ) : r.pdf_url ? (
                    <Badge className="bg-info/20 text-info border-0">Generado</Badge>
                  ) : (
                    <Badge className="bg-secondary text-muted-foreground border-0">Borrador</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" disabled={!r.pdf_url} asChild={!!r.pdf_url}>
                    {r.pdf_url ? (
                      <a href={r.pdf_url} target="_blank" rel="noreferrer" download>
                        <Download className="h-4 w-4 mr-1" />Descargar
                      </a>
                    ) : (
                      <span><Download className="h-4 w-4 mr-1" />Descargar</span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!r.pdf_url || !r.clientEmail || sendingId === r.id}
                    onClick={() => handleResend(r)}
                  >
                    {sendingId === r.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                    Enviar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
