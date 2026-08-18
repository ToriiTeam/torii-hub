// Semilla de motivos de cuello de botella agrupados por categoría — mismo
// contenido que el mockup aprobado, portado 1:1. Contenido editable a
// futuro (no hace falta una tabla de configuración todavía, según lo
// acordado); vive acá como constante.
export interface MotivoOption {
  key: string;
  label: string;
  planContingencia: string;
}

export interface MotivoGrupo {
  categoria: string;
  color: string;
  items: MotivoOption[];
}

export const MOTIVO_GRUPOS: MotivoGrupo[] = [
  {
    categoria: 'Media Buying / Anuncios',
    color: '#e5182b',
    items: [
      { key: 'volumen', label: 'Volumen bajo — pocas agendas para tener datos', planContingencia: 'Aumentar presupuesto de testeo + activar 2 ángulos nuevos en paralelo' },
      { key: 'angulo', label: 'Ángulo/oferta no conecta', planContingencia: "Aislar variable de oferta — testear 'construir patrimonio' vs 'impuestos'" },
      { key: 'cpm', label: 'CPM alto sostenido', planContingencia: 'Pausar el conjunto y redistribuir presupuesto a los 2 ángulos con mejor CTR' },
      { key: 'fatiga', label: 'Fatiga de ángulo (frecuencia > 3)', planContingencia: 'Refrescar creativo del mismo ángulo o iterar el hook' },
      { key: 'targeting', label: 'Targeting mal configurado', planContingencia: 'Revisar edad/ubicación/audiencia expandida contra el ICP real' },
      { key: 'presupuesto', label: 'Presupuesto insuficiente para testear', planContingencia: 'Escalar a mínimo $50/día en ABO antes de sacar conclusiones' },
    ],
  },
  {
    categoria: 'VSL / Landing',
    color: '#60a5fa',
    items: [
      { key: 'vsl', label: 'VSL no convierte (mucho tráfico, poca agenda)', planContingencia: 'Revisar hook de los primeros 15s + agregar CTA intermedio' },
      { key: 'landing_lenta', label: 'Landing carga lenta', planContingencia: 'Optimizar peso de imágenes/video, revisar hosting' },
      { key: 'form_largo', label: 'Formulario muy largo', planContingencia: 'Reducir a 3 campos esenciales' },
      { key: 'oferta_confusa', label: 'Oferta poco clara en la landing', planContingencia: 'Simplificar el headline al beneficio principal, un solo CTA' },
      { key: 'sin_prueba', label: 'Falta de prueba social', planContingencia: 'Agregar testimonios o casos de éxito arriba del fold' },
    ],
  },
  {
    categoria: 'Agendamiento / Show up',
    color: '#f2c94c',
    items: [
      { key: 'show', label: 'Show rate bajo', planContingencia: 'Activar recordatorio SMS 1h antes + cambiar copy de confirmación' },
      { key: 'sin_recordatorio', label: 'No hay recordatorio automático configurado', planContingencia: 'Configurar workflow de GHL con 2 touchpoints antes de la cita' },
      { key: 'horarios', label: 'Horarios de agenda poco flexibles', planContingencia: 'Ampliar ventana de disponibilidad en el calendario' },
    ],
  },
  {
    categoria: 'Ventas / Cierre',
    color: '#34d399',
    items: [
      { key: 'cierre', label: 'Agenda bien, cierra mal', planContingencia: 'Sesión de roleplay de objeciones + revisar guion de descubrimiento' },
      { key: 'objeciones', label: 'Objeciones recurrentes sin resolver', planContingencia: 'Documentar las 3 objeciones más frecuentes + guion de respuesta' },
      { key: 'guion_viejo', label: 'Falta de guion actualizado', planContingencia: 'Actualizar guion con los últimos casos reales' },
      { key: 'sin_closer', label: 'Closer sin roster asignado', planContingencia: 'Asignar closer disponible en client_closers' },
    ],
  },
  {
    categoria: 'Configuración técnica',
    color: '#a78bfa',
    items: [
      { key: 'pixel', label: 'Pixel de Meta mal configurado', planContingencia: 'Verificar eventos en Events Manager, testear con Pixel Helper' },
      { key: 'cuenta_sin_verificar', label: 'Cuenta de Ads sin verificar / restringida', planContingencia: 'Revisar estado en Business Manager, contactar soporte de Meta' },
      { key: 'calendario_mal', label: 'Calendario de GHL mal conectado', planContingencia: 'Revalidar el webhook, confirmar location_id/calendar_id' },
    ],
  },
  {
    categoria: 'Cliente / Relación',
    color: '#f472b6',
    items: [
      { key: 'sin_respuesta', label: 'Cliente no responde a pedidos de información', planContingencia: 'Escalar por otro canal, ofrecer llamada corta de 5 min' },
      { key: 'sin_contenido', label: 'Cliente no graba el contenido pedido (VSL, testimonios)', planContingencia: 'Ofrecer grabarlo por videollamada con guion asistido' },
      { key: 'aprobaciones', label: 'Retraso en aprobaciones del cliente', planContingencia: 'Fijar SLA de 48hs para aprobar, avisar antes del deadline' },
    ],
  },
];

const MOTIVO_BY_KEY = new Map<string, { grupo: MotivoGrupo; item: MotivoOption }>();
for (const grupo of MOTIVO_GRUPOS) {
  for (const item of grupo.items) {
    MOTIVO_BY_KEY.set(item.key, { grupo, item });
  }
}

export function findMotivo(key: string): { grupo: MotivoGrupo; item: MotivoOption } | undefined {
  return MOTIVO_BY_KEY.get(key);
}
