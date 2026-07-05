import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Send, Loader2 } from 'lucide-react';
import { ReportPdfDocument } from '../pdf/ReportPdfDocument';
import { PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT } from '../pdf/PdfPage';
import { generatePdfFromNode, downloadBlob } from '../../lib/generatePdf';
import type { ReportMetrics, ReportNarrativa, TrendPoint } from '../../types';
import { toast } from 'sonner';

const PREVIEW_SCALE = 0.42;

interface Step6Props {
  clientName: string;
  monthLabel: string;
  metrics: ReportMetrics;
  trend: TrendPoint[];
  narrativa: ReportNarrativa;
  canSend: boolean;
  sendDisabledReason?: string;
  onGenerated: (blob: Blob) => Promise<void>;
  onSend: (blob: Blob) => Promise<void>;
}

export function Step6PreviewGenerate({
  clientName,
  monthLabel,
  metrics,
  trend,
  narrativa,
  canSend,
  sendDisabledReason,
  onGenerated,
  onSend,
}: Step6Props) {
  // The hidden node is the actual capture source for html2canvas — rendered
  // at true A4 pixel size, off-screen. The visible preview below is a
  // SEPARATE instance of the same component, only visually scaled down via
  // CSS transform, so the transform can never interfere with what
  // html2canvas measures/captures on the hidden copy.
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleGenerate() {
    if (!hiddenRef.current) return;
    setGenerating(true);
    try {
      const blob = await generatePdfFromNode(hiddenRef.current);
      downloadBlob(blob, `informe-${clientName}-${monthLabel}.pdf`.replace(/\s+/g, '-').toLowerCase());
      await onGenerated(blob);
      toast.success('PDF generado');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!hiddenRef.current) return;
    setSending(true);
    try {
      const blob = await generatePdfFromNode(hiddenRef.current);
      await onSend(blob);
      toast.success('Informe enviado al cliente');
    } catch (err) {
      console.error(err);
      toast.error('Error al enviar el informe');
    } finally {
      setSending(false);
    }
  }

  const pageCount = 5;
  const scaledWidth = PDF_PAGE_WIDTH * PREVIEW_SCALE;
  const scaledHeight = PDF_PAGE_HEIGHT * PREVIEW_SCALE * pageCount;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Preview y generación</CardTitle>
          <CardDescription>Así se ve el informe final — las 5 páginas, en orden.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerate} disabled={generating || sending}>
            {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Generar PDF
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend || generating || sending}
            title={!canSend ? sendDisabledReason : undefined}
            className="bg-primary"
          >
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Enviar al cliente
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!canSend && sendDisabledReason && (
          <p className="text-xs text-warning mb-3">{sendDisabledReason}</p>
        )}

        <div
          className="mx-auto border border-border/50 rounded-md overflow-hidden bg-secondary/20"
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}>
            <ReportPdfDocument
              clientName={clientName || 'Cliente'}
              monthLabel={monthLabel}
              metrics={metrics}
              trend={trend}
              narrativa={narrativa}
            />
          </div>
        </div>
      </CardContent>

      {/* Hidden full-size capture source for html2canvas — never visible,
          not display:none (html2canvas needs real layout), just pushed off
          the visible canvas. */}
      <div style={{ position: 'fixed', top: 0, left: -99999, pointerEvents: 'none' }} aria-hidden="true">
        <div ref={hiddenRef}>
          <ReportPdfDocument
            clientName={clientName || 'Cliente'}
            monthLabel={monthLabel}
            metrics={metrics}
            trend={trend}
            narrativa={narrativa}
          />
        </div>
      </div>
    </Card>
  );
}
