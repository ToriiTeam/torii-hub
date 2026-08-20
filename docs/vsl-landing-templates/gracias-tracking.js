/* ============================================================
 * VSL — script de tracking para la PÁGINA DE GRACIAS (post-formulario)
 * ============================================================
 * IMPORTANTE — a diferencia de landing-tracking.js, esta plantilla NO
 * está basada en un script real existente: hoy no encontramos ninguna
 * página de gracias guardada en el Hub (ni en el repo ni en la base de
 * datos) — probablemente vive pegada directo en GHL, fuera de este
 * sistema. Es una plantilla de referencia a validar/ajustar contra la
 * página de gracias real de cada cliente antes de pegarla.
 *
 * Pegar dentro de la página de gracias en GHL, justo antes de </body>.
 * Reemplazar los valores marcados con "REEMPLAZAR POR CLIENTE".
 *
 * FIX landing_id (Parte A del diagnóstico): en vez de tener el
 * landing_id de origen hardcodeado a un slug genérico fijo, esta
 * versión lo lee de localStorage (clave 'vsl_landing_id', que
 * landing-tracking.js ya deja guardada al cargar la landing principal).
 * Si no hay nada guardado (ej. alguien abre esta página directo, en
 * otra pestaña/navegador, o sin haber pasado antes por la landing en
 * el mismo dominio), cae al slug genérico de siempre — nunca se pierde
 * el evento, solo se pierde la atribución fina en ese caso puntual.
 *
 * OJO — misma condición que en landing-tracking.js: esto solo funciona
 * si la landing y esta página de gracias viven bajo el MISMO dominio
 * exacto. Si están en dominios distintos, localStorage.getItem() va a
 * devolver siempre null y esta página va a caer siempre al fallback
 * genérico (no es un error, pero hay que saberlo antes de asumir que
 * el fix está funcionando).
 * ============================================================ */
(function () {
  var SUPABASE_URL = 'https://ugzeetniwimqnpzgvbrc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnemVldG5pd2ltcW5wemd2YnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTM5MTcsImV4cCI6MjA4MTU2OTkxN30.IzpHVAXhUafmqmK0EF6UM3CiQrnyr0kzgVDKpOMzDIE';

  // REEMPLAZAR POR CLIENTE — UUID real del cliente en la tabla clients
  // (el mismo CLIENT_ID que usa landing-tracking.js para este cliente).
  var CLIENT_ID = 'REEMPLAZAR-uuid-del-cliente';

  // REEMPLAZAR POR CLIENTE — slug genérico de fallback (el que se usa
  // hoy hardcodeado; queda como piso para no perder el evento si no
  // hay landing_id guardado en localStorage).
  var FALLBACK_LANDING_ID = 'REEMPLAZAR-slug-generico-actual';

  // REEMPLAZAR POR CLIENTE — mismo PREFIX que usa landing-tracking.js
  // para este cliente (ej. 'ab', 'rg') — se usa para reusar el mismo
  // session_id de la sesión de la landing, si está disponible.
  var PREFIX = 'xx';

  // ---- FIX landing_id: leer de localStorage en vez de tener el
  // landing_id hardcodeado. ----
  var LANDING_ID;
  try {
    LANDING_ID = localStorage.getItem('vsl_landing_id') || FALLBACK_LANDING_ID;
  } catch (e) {
    LANDING_ID = FALLBACK_LANDING_ID;
  }

  var sessionId = (function () {
    try {
      var existing = localStorage.getItem(PREFIX + '_session');
      if (existing) return existing;
      // No debería pasar casi nunca (la landing ya crea la sesión), pero
      // por las dudas generamos una acá también para no perder el evento.
      var id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
      localStorage.setItem(PREFIX + '_session', id);
      return id;
    } catch (e) {
      return String(Date.now()) + Math.random().toString(16).slice(2);
    }
  })();

  var utmParams = (function () {
    try {
      var qs = new URLSearchParams(window.location.search);
      return {
        utm_source: qs.get('utm_source') || null,
        utm_medium: qs.get('utm_medium') || null,
        utm_campaign: qs.get('utm_campaign') || null,
        utm_content: qs.get('utm_content') || null
      };
    } catch (e) {
      return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null };
    }
  })();

  function sendEvent(eventName, params) {
    params = params || {};
    fetch(SUPABASE_URL + '/rest/v1/vsl_events', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        event_name: eventName,
        percent: (typeof params.percent === 'number' ? params.percent : null),
        session_id: sessionId,
        page_url: window.location.href,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        utm_content: utmParams.utm_content,
        client_id: CLIENT_ID,
        landing_id: LANDING_ID
      })
    }).catch(function () {});
  }

  // Este es el evento que hoy ya cuenta VslTracking.tsx como
  // "Calificaron y agendaron" (KPI existente en el Hub, ver
  // src/pages/VslTracking.tsx). Si esta página de gracias solo la ven
  // los leads que SÍ calificaron y llegaron a agendar, este evento
  // sigue significando lo mismo que hoy — el fix de esta plantilla
  // únicamente corrige DE QUÉ landing viene, no agrega ni cambia el
  // significado del evento en sí.
  sendEvent('VSL_Form_Submit', {});
})();
