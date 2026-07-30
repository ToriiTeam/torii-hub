export type PhaseKey =
  | 'onboarding'
  | 'fundamentos'
  | 'validacion_funnel'
  | 'validacion_ventas'
  | 'optimizacion'
  | 'maximizacion';

export interface DeliveryPhase {
  id: string;
  client_id: string;
  fase: PhaseKey;
  fecha_inicio: string;
  fecha_fin: string | null;
  objetivo_cumplido: boolean;
  tiempo_objetivo_dias: number | null;
  notas: string | null;
  created_at: string;
}

export interface PhaseChecklistItem {
  id: string;
  client_id: string;
  fase: PhaseKey;
  tarea: string;
  completada: boolean;
  fecha_completada: string | null;
  notas: string | null;
  orden: number;
  created_at: string;
}

export const PHASE_ORDER: PhaseKey[] = [
  'onboarding',
  'fundamentos',
  'validacion_funnel',
  'validacion_ventas',
  'optimizacion',
  'maximizacion',
];

export const PHASE_LABELS: Record<PhaseKey, string> = {
  onboarding: 'Onboarding',
  fundamentos: 'Fundamentos',
  validacion_funnel: 'Validación de Funnel',
  validacion_ventas: 'Validación de Ventas',
  optimizacion: 'Optimización',
  maximizacion: 'Maximización',
};

// Placeholder copy confirmed as an acceptable default by the user — edit
// freely, these aren't derived from any external source of truth. Reuses
// the same one-liners written into client_phases.phase_description (the
// Portal-facing journey map) so the two systems describe each phase the
// same way.
export const PHASE_OBJECTIVES: Record<PhaseKey, string> = {
  onboarding: 'Arrancamos: alineamos expectativas y dejamos todo listo para construir.',
  fundamentos: 'Construimos la base estratégica y técnica de tu sistema.',
  validacion_funnel: 'Probamos anuncios y VSL hasta lograr agendas consistentes al costo objetivo.',
  validacion_ventas: 'Mejoramos tu proceso de cierre con cada llamada real que llega.',
  optimizacion: 'Con el sistema validado, buscamos multiplicar tu retorno.',
  maximizacion: 'Maximizamos tus resultados con el sistema funcionando a pleno.',
};

// Default tiempo_objetivo_dias stamped on a phase when it's created —
// placeholder values confirmed as acceptable by the user, editable per
// client afterward via the `notas`/future edit UI, not hardcoded forever.
// Merged phases (onboarding, validacion_funnel, optimizacion) sum the
// days of the old phases they replace.
export const PHASE_DEFAULT_DAYS: Record<PhaseKey, number> = {
  onboarding: 6,
  fundamentos: 7,
  validacion_funnel: 28,
  validacion_ventas: 30,
  optimizacion: 60,
  maximizacion: 30,
};

// Merged phases concatenate the old phases' checklists — no items dropped,
// same reasoning as the delivery_phases/client_phases merge.
export const PHASE_CHECKLISTS: Record<PhaseKey, string[]> = {
  onboarding: [
    'Pago confirmado',
    'Contrato firmado',
    'Acceso a cuentas publicitarias',
    'Llamada de onboarding agendada',
    'Situación actual documentada',
    'Objetivos definidos',
    'Plan de acción acordado',
    'CSB completado',
  ],
  fundamentos: [
    'Arquitectura de campañas definida',
    'Setup de píxel y conversiones',
    'Audiencias configuradas',
    'Creativos iniciales producidos',
    'Primera campaña lanzada',
  ],
  validacion_funnel: [
    'Testeo de ángulos (mínimo 3)',
    'Testeo de hooks',
    'Testeo de anuncios',
    'Testeo de formularios',
    'Testeo de VSL',
    'Ángulo ganador identificado',
    '5 formularios calificados dentro del CPBC objetivo',
    'Proceso de setting optimizado',
    'Tasa de show-up > 60%',
    'Proceso de closing testeado',
    'CPBC objetivo estable por 2 semanas',
  ],
  validacion_ventas: [
    'Primera venta constante',
    'Proceso de cierre documentado',
    'Tasa de calificación > 30%',
    'Tasa de cierre > 15%',
    'Revenue predecible',
  ],
  optimizacion: [
    'Sistema de marketing optimizado',
    'Funnel optimizado',
    'Ventas optimizadas',
    'Operaciones optimizadas',
    'Métricas estables',
    'Rentabilidad confirmada',
    'Escalado frontal iniciado',
    'Escalado vertical iniciado',
    'Duplicación de ganadores',
    'Nuevos creativos producidos',
    'Nuevas audiencias testeadas',
    'Capacidad operativa confirmada',
  ],
  maximizacion: [
    'Resultado final del cliente alcanzado',
    'Objetivo de cliente obtenido',
    'Sistema en modo mantenimiento',
    'Próximo ciclo o renovación planificado',
  ],
};
