import { NarrativeFieldsCard } from './NarrativeFieldsCard';
import type { ReportNarrativa } from '../../types';

interface Step3Props {
  narrativa: ReportNarrativa;
  onChange: (narrativa: ReportNarrativa) => void;
}

export function Step3Narrativa({ narrativa, onChange }: Step3Props) {
  return (
    <NarrativeFieldsCard
      title="Resumen ejecutivo y aprendizajes"
      fields={[
        {
          label: 'Resumen ejecutivo',
          value: narrativa.resumenEjecutivo,
          onChange: (v) => onChange({ ...narrativa, resumenEjecutivo: v }),
          placeholder: 'Qué pasó este mes, en 3-4 líneas...',
        },
        {
          label: 'Aprendizajes del período',
          value: narrativa.aprendizajes,
          onChange: (v) => onChange({ ...narrativa, aprendizajes: v }),
          placeholder: 'Qué aprendimos de las campañas, audiencias, creativos...',
        },
      ]}
    />
  );
}
