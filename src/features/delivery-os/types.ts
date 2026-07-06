export type PhaseKey =
  | 'onboarding'
  | 'llamada_onboarding'
  | 'fundamentos'
  | 'testeo_mercado'
  | 'testeo_funnel'
  | 'validacion_ventas'
  | 'optimizacion_sistema'
  | 'escalado'
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
  'llamada_onboarding',
  'fundamentos',
  'testeo_mercado',
  'testeo_funnel',
  'validacion_ventas',
  'optimizacion_sistema',
  'escalado',
  'maximizacion',
];

export const PHASE_LABELS: Record<PhaseKey, string> = {
  onboarding: 'Onboarding',
  llamada_onboarding: 'Llamada de Onboarding',
  fundamentos: 'Fundamentos',
  testeo_mercado: 'Testeo de Mercado',
  testeo_funnel: 'Testeo de Funnel',
  validacion_ventas: 'Validación de Ventas',
  optimizacion_sistema: 'Optimización del Sistema',
  escalado: 'Escalado',
  maximizacion: 'Maximización',
};

// Placeholder copy confirmed as an acceptable default by the user — edit
// freely, these aren't derived from any external source of truth.
export const PHASE_OBJECTIVES: Record<PhaseKey, string> = {
  onboarding: 'Confirmar pago, contrato y accesos para arrancar sin fricciones.',
  llamada_onboarding: 'Documentar la situación actual del cliente y acordar un plan de acción claro.',
  fundamentos: 'Lanzar la arquitectura base de campañas, tracking y los primeros creativos.',
  testeo_mercado: 'Encontrar el ángulo ganador probando mensajes, hooks, formularios y VSL.',
  testeo_funnel: 'Estabilizar el CPBC objetivo y el proceso de setting/closing.',
  validacion_ventas: 'Confirmar que el negocio cierra ventas de forma constante y predecible.',
  optimizacion_sistema: 'Optimizar marketing, funnel, ventas y operaciones para sostener la rentabilidad.',
  escalado: 'Escalar presupuesto y capacidad operativa duplicando lo que funciona.',
  maximizacion: 'Consolidar el resultado final del cliente y planificar el próximo ciclo.',
};

// Default tiempo_objetivo_dias stamped on a phase when it's created —
// placeholder values confirmed as acceptable by the user, editable per
// client afterward via the `notas`/future edit UI, not hardcoded forever.
export const PHASE_DEFAULT_DAYS: Record<PhaseKey, number> = {
  onboarding: 3,
  llamada_onboarding: 3,
  fundamentos: 7,
  testeo_mercado: 14,
  testeo_funnel: 14,
  validacion_ventas: 30,
  optimizacion_sistema: 30,
  escalado: 30,
  maximizacion: 30,
};

export const PHASE_CHECKLISTS: Record<PhaseKey, string[]> = {
  onboarding: [
    'Pago confirmado',
    'Contrato firmado',
    'Acceso a cuentas publicitarias',
    'Llamada de onboarding agendada',
  ],
  llamada_onboarding: [
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
  testeo_mercado: [
    'Testeo de ángulos (mínimo 3)',
    'Testeo de hooks',
    'Testeo de anuncios',
    'Testeo de formularios',
    'Testeo de VSL',
    'Ángulo ganador identificado',
  ],
  testeo_funnel: [
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
  optimizacion_sistema: [
    'Sistema de marketing optimizado',
    'Funnel optimizado',
    'Ventas optimizadas',
    'Operaciones optimizadas',
    'Métricas estables',
    'Rentabilidad confirmada',
  ],
  escalado: [
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
