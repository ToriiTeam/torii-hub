-- "Contenido Orgánico" — 3 capas conectadas: tablero de fase → bitácora de
-- hipótesis por tanda → calendarios de producción por canal, referenciando
-- un catálogo compartido de pilares y mecanismos narrativos. Replica la
-- Bitácora de Contenido (xlsx, 8 hojas) + el Documento Maestro de Pilares.

-- 1) content_pillars — catálogo compartido, no por cliente.
CREATE TABLE content_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  angulo TEXT,
  para_que TEXT,
  prueba_de_que_aplica TEXT,
  error_a_evitar TEXT,
  mejores_mecanismos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for all users" ON content_pillars FOR ALL USING (true) WITH CHECK (true);

-- 2) content_mechanisms — catálogo compartido.
CREATE TABLE content_mechanisms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  que_es TEXT,
  cuando_usarlo TEXT,
  ejemplo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE content_mechanisms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for all users" ON content_mechanisms FOR ALL USING (true) WITH CHECK (true);

-- 3) content_hypotheses — creada antes de content_calendar por el FK
-- hipotesis_id. id es un correlativo tipo 'H-001' generado por secuencia,
-- no por el frontend.
CREATE SEQUENCE content_hypotheses_seq;
CREATE TABLE content_hypotheses (
  id TEXT PRIMARY KEY DEFAULT ('H-' || lpad(nextval('content_hypotheses_seq')::text, 3, '0')),
  client_id UUID REFERENCES clients(id),
  fase TEXT CHECK (fase IN ('Fase 0','Fase 1','Fase 2')),
  semana TEXT,
  channel TEXT CHECK (channel IN ('youtube','instagram','linkedin')),
  pilar_id UUID REFERENCES content_pillars(id),
  mecanismo_id UUID REFERENCES content_mechanisms(id),
  hipotesis_texto TEXT,
  metrica_objetivo TEXT,
  baseline NUMERIC,
  prediccion NUMERIC,
  resultado_real NUMERIC,
  veredicto TEXT CHECK (veredicto IN ('Confirmada','Refutada','Inconcluso')),
  decision TEXT CHECK (decision IN ('Repetir','Escalar','Iterar','Descartar')),
  aprendizaje TEXT,
  piezas_vinculadas TEXT,
  proxima_hipotesis_id TEXT REFERENCES content_hypotheses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE content_hypotheses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for all users" ON content_hypotheses FOR ALL USING (true) WITH CHECK (true);

-- Delta and % de cumplimiento are intentionally NOT columns here — always
-- computed client-side from resultado_real/prediccion so they can never
-- drift out of sync.

-- 4) content_calendar
CREATE TABLE content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  channel TEXT NOT NULL CHECK (channel IN ('youtube','instagram','linkedin')),
  fase TEXT CHECK (fase IN ('Fase 0','Fase 1','Fase 2')),
  semana TEXT,
  pilar_id UUID REFERENCES content_pillars(id),
  mecanismo_id UUID REFERENCES content_mechanisms(id),
  con_ask BOOLEAN NOT NULL DEFAULT true,
  lead_magnet TEXT,
  hipotesis_id TEXT REFERENCES content_hypotheses(id),
  estado TEXT NOT NULL DEFAULT 'Idea' CHECK (estado IN ('Idea','Esperando Grabación','Esperando Edición','Programado','Publicado')),
  fecha_programada DATE,
  titulo TEXT,
  descripcion TEXT,
  -- Channel-specific columns that don't repeat across channels live here:
  -- YouTube (número de video, categoría, formato, guion/recurso/miniatura/
  -- título/referencia/creadores de inspiración), Reels/IG (tipología,
  -- grabación, video editado, notas/hook, creadores de inspiración),
  -- LinkedIn (programado, guión, lead magnet creado, tipo de post, recurso
  -- a enviar, enlace a recurso, cuentas de inspiración).
  channel_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for all users" ON content_calendar FOR ALL USING (true) WITH CHECK (true);

-- 5) content_phase_status — cada canal puede estar en una fase distinta.
CREATE TABLE content_phase_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  channel TEXT NOT NULL CHECK (channel IN ('youtube','instagram','linkedin')),
  current_phase TEXT NOT NULL DEFAULT 'Fase 0' CHECK (current_phase IN ('Fase 0','Fase 1','Fase 2')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, channel)
);
ALTER TABLE content_phase_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for all users" ON content_phase_status FOR ALL USING (true) WITH CHECK (true);

-- 6) content_phase_gates — channel nullable: los gatillos de hoy aplican a
-- nivel Torii/general (channel=NULL), no separados por canal.
CREATE TABLE content_phase_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  channel TEXT CHECK (channel IN ('youtube','instagram','linkedin')),
  from_phase TEXT CHECK (from_phase IN ('Fase 0','Fase 1','Fase 2')),
  to_phase TEXT CHECK (to_phase IN ('Fase 0','Fase 1','Fase 2')),
  metric_name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('>=','<=')),
  threshold_value NUMERIC NOT NULL,
  current_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','cumplido','no_cumplido')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE content_phase_gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for all users" ON content_phase_gates FOR ALL USING (true) WITH CHECK (true);

-- 7) content_metrics_tanda — com_dm_pct/dm_lead_pct/lead_reserva_pct/cpl son
-- derivados, siempre calculados client-side desde las columnas crudas.
CREATE TABLE content_metrics_tanda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  semana TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('youtube','instagram','linkedin')),
  fase TEXT CHECK (fase IN ('Fase 0','Fase 1','Fase 2')),
  piezas_publicadas INT NOT NULL DEFAULT 0,
  alcance INT NOT NULL DEFAULT 0,
  interacciones INT NOT NULL DEFAULT 0,
  comentarios_keyword INT NOT NULL DEFAULT 0,
  dms_iniciados INT NOT NULL DEFAULT 0,
  leads_capturados INT NOT NULL DEFAULT 0,
  reservas INT NOT NULL DEFAULT 0,
  llamadas INT NOT NULL DEFAULT 0,
  cierres INT NOT NULL DEFAULT 0,
  coste NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE content_metrics_tanda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for all users" ON content_metrics_tanda FOR ALL USING (true) WITH CHECK (true);

-- ── Catálogo: pilares ──────────────────────────────────────────────────────
INSERT INTO content_pillars (nombre, angulo, para_que, prueba_de_que_aplica, error_a_evitar, mejores_mecanismos) VALUES
('Adquisición',
 'El techo invisible — mostrarle al asesor un límite estructural de su modelo actual que hoy vive como normal: depender de referidos, creer que "necesita más leads", tener ingresos impredecibles.',
 'Instalar que su problema no es esfuerzo ni talento, sino ausencia de sistema. Es la creencia que hace necesaria la oferta full (USD 3.000).',
 'La pieza nombra un techo o un costo que el asesor no estaba viendo y lo conecta con la idea de previsibilidad. Ruta: oferta full.',
 'Sonar a "contratá una agencia" o vender la solución antes de instalar el problema.',
 '["El costo oculto", "El reencuadre", "El contraste", "El número que no mirás", "El detrás de escena"]'::jsonb),
('Cierre',
 'La reunión que se escapa — mostrarle al asesor que ya tiene reuniones y por qué las pierde en el momento decisivo, y que la causa no es el precio ni el prospecto, sino su proceso.',
 'Instalar que cerrar es una habilidad sistematizable, no carisma. Es el ICP de Caballo de Troya (USD 98), entrada de bajo roce que asciende después a la oferta full.',
 'La pieza parte de "ya tenés la reunión/el interés" y ataca el momento del cierre o el seguimiento. Ruta: Caballo de Troya.',
 'Hablar de conseguir reuniones (eso es Adquisición). Volverse técnica de presión.',
 '["El error invisible", "El costo oculto", "El contraste"]'::jsonb),
('Autoridad',
 'La postura que fija criterio — afirmar una postura clara sobre una creencia discutida del nicho, sin pedir nada, para posicionar a Torii como criterio y no como proveedor.',
 'Construir la confianza y el alcance que hacen aterrizar las piezas de captura. Es el tercio sin ask.',
 'La pieza toma posición sobre algo que divide opiniones en el nicho y no lleva CTA.',
 'Opinión genérica o motivacional sin filo; meter ask; postura tan extrema que aliena al ICP.',
 '["La postura incómoda", "El detrás de escena", "El contraste", "El costo oculto"]'::jsonb);

-- ── Catálogo: mecanismos narrativos ────────────────────────────────────────
INSERT INTO content_mechanisms (nombre, que_es, cuando_usarlo, ejemplo) VALUES
('El costo oculto', 'Nombrar un costo que el asesor paga y vive como normal, hasta hacerlo visible.', 'Cuando querés que sienta un problema que no estaba mirando.', 'El referido es el cliente más caro que vas a conseguir. Solo que el costo no aparece en la factura.'),
('El reencuadre', 'Cambiar la definición del problema: "no es X, es Y".', 'Cuando el asesor cree que su problema es uno y en realidad es otro.', '"Necesito más leads" casi nunca es el problema real. Casi siempre es esto.'),
('El error invisible', 'Señalar un error que casi todos cometen sin darse cuenta.', 'Ideal para cierre y para la prueba operativa de ads.', 'La mayoría rompe su campaña en las primeras 48 horas sin darse cuenta.'),
('El contraste', 'Antes/después, o dos caminos frente al mismo problema.', 'Para casos y para mostrar el efecto de tener (o no) sistema.', 'Pasó de no saber de dónde salía el cliente del mes a agenda con 3 semanas de anticipación.'),
('El número que no mirás', 'Un dato o métrica que cambia la decisión al verlo.', 'Sobre todo en la prueba de Benjamin (métricas, ads).', '3 números deciden si tus ads son inversión o fuga. Casi todos miran el que no es.'),
('La postura incómoda', 'Afirmar algo que va contra la creencia común del nicho.', 'El molde nativo del pilar de Autoridad.', 'Depender de referidos no es la estrategia conservadora. Es la más riesgosa que existe.'),
('El detrás de escena', 'Mostrar el sistema o el proceso real por dentro.', 'Formato canvas/Miro de Benjamin; prueba y autoridad.', 'Así se ve, en una sola pizarra, el recorrido de un lead desde el primer clic hasta la reunión.');

-- ── Estado inicial de fase (Torii, 3 canales, Fase 0) ──────────────────────
INSERT INTO content_phase_status (client_id, channel, current_phase) VALUES
(NULL, 'youtube', 'Fase 0'),
(NULL, 'instagram', 'Fase 0'),
(NULL, 'linkedin', 'Fase 0');

-- ── Gatillos de fase (a nivel Torii/general, channel=NULL) ────────────────
INSERT INTO content_phase_gates (client_id, channel, from_phase, to_phase, metric_name, direction, threshold_value, note) VALUES
(NULL, NULL, 'Fase 0', 'Fase 1', 'Leads calificados / mes', '>=', 30, 'Sostenidos varios meses'),
(NULL, NULL, 'Fase 0', 'Fase 1', 'Meses sostenidos en meta', '>=', 3, 'Consistencia, no un pico'),
(NULL, NULL, 'Fase 0', 'Fase 1', 'CPL (costo por lead)', '<=', 15, 'Del modelo financiero'),
(NULL, NULL, 'Fase 0', 'Fase 1', 'Close rate llamada (%)', '>=', 0.20, 'Formato %'),
(NULL, NULL, 'Fase 0', 'Fase 1', 'CAC', '<=', 250, 'Debe soportarlo el modelo'),
(NULL, NULL, 'Fase 1', 'Fase 2', 'Leads calificados / mes', '>=', 80, 'Escala validada'),
(NULL, NULL, 'Fase 1', 'Fase 2', 'Facturación mensual sostenida', '>=', 25000, 'Ajustar a tu realidad'),
(NULL, NULL, 'Fase 1', 'Fase 2', 'Margen para reinvertir (%)', '>=', 0.20, 'Formato %'),
(NULL, NULL, 'Fase 1', 'Fase 2', 'CAC estable', '<=', 250, 'No se rompe al escalar');
