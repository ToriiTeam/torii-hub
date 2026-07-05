import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT } from '../components/pdf/PdfPage';

// Captures every [data-pdf-page] div inside `container` (rendered by
// ReportPdfDocument, off-screen at full size — see ReportWizard) and stacks
// them into one multi-page PDF. scale:2 renders at ~2x pixel density before
// downscaling into the page so text doesn't look blurry in the output.
export async function generatePdfFromNode(container: HTMLElement): Promise<Blob> {
  const pages = Array.from(container.querySelectorAll<HTMLElement>('[data-pdf-page]'));
  if (pages.length === 0) {
    throw new Error('No se encontraron páginas para generar el PDF');
  }

  const pdf = new jsPDF({ unit: 'px', format: [PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT], orientation: 'portrait' });

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) pdf.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT], 'portrait');
    pdf.addImage(imgData, 'JPEG', 0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT);
  }

  return pdf.output('blob');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the "data:application/pdf;base64," prefix — the edge function
      // wants raw base64.
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
