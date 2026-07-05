import { PdfPage } from '../PdfPage';
import { NarrativeBlock } from '../NarrativeBlock';

interface NarrativePageProps {
  resumenEjecutivo: string;
  aprendizajes: string;
}

export function NarrativePage({ resumenEjecutivo, aprendizajes }: NarrativePageProps) {
  return (
    <PdfPage pageNumber={3}>
      <NarrativeBlock title="Resumen ejecutivo" text={resumenEjecutivo} />
      <NarrativeBlock title="Aprendizajes del período" text={aprendizajes} />
    </PdfPage>
  );
}
