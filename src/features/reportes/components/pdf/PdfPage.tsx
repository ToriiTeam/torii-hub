import type { ReactNode } from 'react';

// A4 at 96dpi. Every page in the report is exactly this size so
// html2canvas's per-page capture maps 1:1 onto a jsPDF page with no scaling
// surprises between the on-screen preview and the generated file.
export const PDF_PAGE_WIDTH = 794;
export const PDF_PAGE_HEIGHT = 1123;

interface PdfPageProps {
  children: ReactNode;
  pageNumber: number;
  className?: string;
}

export function PdfPage({ children, pageNumber, className }: PdfPageProps) {
  return (
    <div
      data-pdf-page
      className={className}
      style={{
        width: PDF_PAGE_WIDTH,
        height: PDF_PAGE_HEIGHT,
        background: '#ffffff',
        color: '#1a1a1a',
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        boxSizing: 'border-box',
        padding: '56px 64px',
        overflow: 'hidden',
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: 64,
          right: 64,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: '#9a9a9a',
          borderTop: '1px solid #eeeeee',
          paddingTop: 8,
        }}
      >
        <span>Torii — Informe Mensual</span>
        <span>{pageNumber}</span>
      </div>
    </div>
  );
}
