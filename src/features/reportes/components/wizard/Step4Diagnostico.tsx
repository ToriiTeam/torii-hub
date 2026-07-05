import { NarrativeFieldsCard } from './NarrativeFieldsCard';
import type { ReportNarrativa } from '../../types';

interface Step4Props {
  narrativa: ReportNarrativa;
  onChange: (narrativa: ReportNarrativa) => void;
}

export function Step4Diagnostico({ narrativa, onChange }: Step4Props) {
  return (
    <NarrativeFieldsCard
      title="Diagnóstico y plan de acción"
      fields={[
        {
          label: 'Diagnóstico',
          value: narrativa.diagnostico,
          onChange: (v) => onChange({ ...narrativa, diagnostico: v }),
          placeholder: 'Qué está funcionando, qué no, y por qué...',
        },
        {
          label: 'Plan de acción',
          value: narrativa.planAccion,
          onChange: (v) => onChange({ ...narrativa, planAccion: v }),
          placeholder: 'Qué se va a hacer distinto el próximo mes...',
        },
      ]}
    />
  );
}
