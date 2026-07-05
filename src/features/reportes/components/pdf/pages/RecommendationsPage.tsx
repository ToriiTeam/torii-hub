import { PdfPage } from '../PdfPage';
import { NarrativeBlock } from '../NarrativeBlock';

interface RecommendationsPageProps {
  recomendaciones: string;
  proximosPasos: string;
}

export function RecommendationsPage({ recomendaciones, proximosPasos }: RecommendationsPageProps) {
  return (
    <PdfPage pageNumber={5}>
      <NarrativeBlock title="Recomendaciones" text={recomendaciones} />
      <NarrativeBlock title="Próximos pasos" text={proximosPasos} />
    </PdfPage>
  );
}
