import { NarrativeFieldsCard } from './NarrativeFieldsCard';
import type { ReportNarrativa } from '../../types';

interface Step5Props {
  narrativa: ReportNarrativa;
  onChange: (narrativa: ReportNarrativa) => void;
}

export function Step5Recomendaciones({ narrativa, onChange }: Step5Props) {
  return (
    <NarrativeFieldsCard
      title="Recomendaciones y próximos pasos"
      fields={[
        {
          label: 'Recomendaciones',
          value: narrativa.recomendaciones,
          onChange: (v) => onChange({ ...narrativa, recomendaciones: v }),
          placeholder: 'Qué recomendamos al cliente...',
        },
        {
          label: 'Próximos pasos',
          value: narrativa.proximosPasos,
          onChange: (v) => onChange({ ...narrativa, proximosPasos: v }),
          placeholder: 'Qué sigue, con fechas si aplica...',
        },
      ]}
    />
  );
}
