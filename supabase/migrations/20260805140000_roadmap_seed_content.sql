-- ═══════════════════════════════════════════════════════════════════════
-- Contenido real del roadmap, extraído de "Torii - Mapa delivery Extenso":
-- objetivo/triggers de las fases posteriores a Fundamentos, y los 11
-- procesos operativos documentados dentro de Fundamentos. onboarding y
-- fundamentos (a nivel de fase) quedan sin objetivo_fase/triggers — el
-- documento no las desglosó a ese nivel; no se inventa contenido.
-- ═══════════════════════════════════════════════════════════════════════

UPDATE public.roadmap_phases SET
  objetivo_fase = 'Llegar a un funnel (anuncio + VSL + booking) que agenda de forma consistente y predecible al costo objetivo de esta etapa.',
  trigger_salida = 'El sistema junta 5 agendas calificadas y efectivas al costo objetivo de esta etapa, de forma repetida, del mismo ángulo — con el objetivo de dejar todo preparado para entrar a Optimización y avanzar hacia el ROI 2x objetivo.'
WHERE phase_key = 'validacion_funnel';

UPDATE public.roadmap_phases SET
  objetivo_fase = 'Mejorar la tasa de cierre de las agendas que va produciendo el funnel — convertir oportunidades en clientes de forma repetible.',
  trigger_salida = 'No hay todavía un número (tasa de cierre objetivo) que marque el pase a Optimización — pendiente de definir.'
WHERE phase_key = 'validacion_ventas';

UPDATE public.roadmap_phases SET
  objetivo_fase = 'Lograr un ROI mínimo de 2x sobre la inversión total del cliente.',
  trigger_entrada = 'Funnel validado (fase Validación de Funnel completa) + Validación de Ventas con tasa de cierre objetivo alcanzada.'
WHERE phase_key = 'optimizacion';

UPDATE public.roadmap_phases SET
  objetivo_fase = 'Maximizar el resultado final del cliente, con un piso de ROI 2x.',
  trigger_entrada = '~20 pólizas vendidas a un promedio de USD 500 por póliza (equivalente a ROI 2x).'
WHERE phase_key = 'maximizacion';

INSERT INTO public.roadmap_processes (phase_key, nombre, orden, objetivo, cuando, como_construirlo, depende_de, condiciona_a, responsable) VALUES
('fundamentos', 'Formularios a la cartera del asesor', 1,
  'Recolectar objeciones y patrones reales de los clientes-finales del asesor para construir el CSB Master.',
  NULL, NULL,
  'Acceso a la cartera del asesor — el asesor debe distribuirlo a sus clientes.',
  'Es el input del CSB Master. No condiciona el Kickoff.',
  'Torii + Cliente'),

('fundamentos', 'CSL Master', 2,
  'Documento de fundamentos de marketing que ordena ICP, dolores, objeciones, oferta, ángulos, nivel de consciencia, mensaje central y segmentación. Base para copies y segmentación de Meta Ads.',
  'Disponible al día 5', NULL,
  'Formularios de onboarding + CSB del asesor + transcripción de onboarding.',
  'Es el input central de casi todo: Kickoff (es lo que se presenta), one-pagers, guiones de anuncios, landings y segmentación.',
  'Torii'),

('fundamentos', 'CSB Master', 3,
  'Refinar el CSL con la voz real de la cartera (objeciones/patrones verificados), no hipótesis.',
  NULL, NULL,
  'Formulario a la cartera (proceso 1).',
  'Refina el CSL Master. No bloquea Kickoff ni construcción: si llega listo antes del día 7 se compara y refina el CSL; si no, el Kickoff avanza con el CSL como hipótesis y el CSB Master entra después como ajuste.',
  'Torii'),

('fundamentos', 'One-pagers', 4,
  'Bajar el CSL a piezas operativas de una página que el equipo usa para ejecutar.',
  NULL, NULL,
  'CSL Master (proceso 2).',
  'Guiones de anuncios (el one-pager de Ads alimenta los ángulos) y el contenido orgánico.',
  'Torii'),

('fundamentos', 'Arquitectura de embudos', 5,
  'Dejar definida la arquitectura de embudos y la lógica de ofertas complementarias antes de construir.',
  NULL, NULL,
  'CSL Master (oferta y segmentación).',
  'La construcción de landings y de precall/postcall (la arquitectura define qué se construye).',
  'Torii'),

('fundamentos', 'Kickoff', 6,
  'Que cliente y equipo salgan con la MISMA visión antes de construir. 100% alineación estratégica; sin configuración técnica ni ejecución.',
  NULL, NULL,
  'CSL Master listo (proceso 2).',
  'GATE de alineación — la corrección/aprobación del CSL habilita la construcción de B3. Además fija el deadline de Formación en Ventas del cliente.',
  'Torii + Cliente'),

('fundamentos', 'Guiones VSL/TKP', 7,
  'Los guiones del video de ventas (VSL) y del video de la thank-you/precall (TKP).',
  NULL, 'Torii escribe el guión → el cliente graba.',
  'CSL + one-pager de Ads (ángulos).',
  'La grabación de videos del cliente y las landings.',
  'Torii + Cliente'),

('fundamentos', 'Landings', 8,
  'Las páginas donde aterriza el tráfico: Landing VSL (oferta + VSL + booking) y Landing TKP (thank-you/precall).',
  NULL, NULL,
  'Guiones (proceso 7), CSL/oferta, Pixel/CAPI configurados, y la arquitectura de funnel (proceso 5).',
  'Prelanzamiento y Lanzamiento.',
  'Torii'),

('fundamentos', 'Precall', 9,
  'Maximizar el show rate — todo lo que ocurre entre que agendan y la llamada.',
  NULL, NULL,
  'WhatsApp / Email / CAPI / GHL configurados y el calendario conectado.',
  'Prelanzamiento y Lanzamiento; impacta directamente el show rate (métrica clave del Contador B).',
  'Torii'),

('fundamentos', 'Postcall', 10,
  'Seguimiento después de la llamada, incluida la recuperación de no-shows.',
  NULL, NULL,
  'Los mismos accesos que precall (proceso 9).',
  'Prelanzamiento y Lanzamiento; recupera no-shows, por lo que impacta el CPBC final (garantía).',
  'Torii'),

('fundamentos', 'Grabación de videos del cliente', 11,
  'Material crudo para el VSL, el TKP y el video de presentación de la landing.',
  NULL, 'Cuello de botella típico: el perfeccionismo del cliente puede frenar la grabación (riesgo registrado en el CSB).',
  'Guiones (proceso 7).',
  'La edición de videos y, por lo tanto, las landings y los anuncios.',
  'Cliente');
