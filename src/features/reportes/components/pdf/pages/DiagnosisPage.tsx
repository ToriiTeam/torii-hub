import { PdfPage } from '../PdfPage';
import { NarrativeBlock } from '../NarrativeBlock';

interface DiagnosisPageProps {
  diagnostico: string;
  planAccion: string;
}

export function DiagnosisPage({ diagnostico, planAccion }: DiagnosisPageProps) {
  return (
    <PdfPage pageNumber={4}>
      <NarrativeBlock title="Diagnóstico" text={diagnostico} />
      <NarrativeBlock title="Plan de acción" text={planAccion} />
    </PdfPage>
  );
}
