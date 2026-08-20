/* ============================================================
 * VSL — script de tracking para la LANDING PRINCIPAL
 * ============================================================
 * Plantilla basada en el script real de Adolfo Blasco (landing_variants,
 * id 1a991b39-..., la única landing con codigo_pegado real que tenemos
 * guardada en el Hub hoy — no la de Raúl, que no está en la base).
 *
 * Pegar dentro de la landing en GHL, justo antes de </body>, junto al
 * resto del HTML/CSS de la página. Reemplazar los valores marcados con
 * "REEMPLAZAR POR CLIENTE" antes de publicar.
 *
 * FIX landing_id (Parte A del diagnóstico): además de guardar el
 * session_id y el max_percent en localStorage (como ya hacía), esta
 * versión también guarda el LANDING_ID real en localStorage bajo la
 * clave fija 'vsl_landing_id' — así la página de gracias puede leerlo
 * en vez de tener un landing_id hardcodeado genérico.
 *
 * OJO — condición para que esto funcione: la landing y la página de
 * gracias tienen que vivir bajo el MISMO dominio exacto (protocolo +
 * dominio + puerto). localStorage no se comparte entre orígenes
 * distintos. Si en algún cliente landing y gracias están en dominios
 * distintos, este mecanismo no sirve y hay que pasar el landing_id por
 * querystring en el redirect en su lugar (no cubierto por esta plantilla).
 * ============================================================ */
(function () {
  var player = null;
  var progressInterval = null;
  var firedMilestones = {};
  var maxPercentReached = 0;
  var videoDuration = 0;

  // REEMPLAZAR POR CLIENTE — id del elemento que contiene la barra de
  // progreso visual (si la landing tiene una; si no, se puede sacar
  // este elemento y las llamadas a updateProgressBar/fillEl).
  var fillEl = document.getElementById('vsl-progress-fill');

  // Estos 2 valores son siempre los mismos, no cambian por cliente.
  var SUPABASE_URL = 'https://ugzeetniwimqnpzgvbrc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnemVldG5pd2ltcW5wemd2YnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTM5MTcsImV4cCI6MjA4MTU2OTkxN30.IzpHVAXhUafmqmK0EF6UM3CiQrnyr0kzgVDKpOMzDIE';

  // REEMPLAZAR POR CLIENTE — slug real de ESTA landing (tiene que
  // coincidir exactamente con tracked_landings.landing_id en el Hub).
  var LANDING_ID = 'REEMPLAZAR-slug-de-esta-landing';
  // REEMPLAZAR POR CLIENTE — UUID real del cliente en la tabla clients.
  var CLIENT_ID = 'REEMPLAZAR-uuid-del-cliente';

  // REEMPLAZAR POR CLIENTE — prefijo corto para las claves de
  // localStorage de sesión (ej. 'ab' para Adolfo Blasco, 'rg' para
  // Raúl Galindo). Solo afecta session_id/max_percent/test_mode, NO
  // a 'vsl_landing_id' (esa clave es fija e igual para todos los
  // clientes, ver más abajo).
  var PREFIX = 'xx';

  var sessionId = (function () {
    try {
      var existing = localStorage.getItem(PREFIX + '_session');
      if (existing) return existing;
      var id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
      localStorage.setItem(PREFIX + '_session', id);
      return id;
    } catch (e) {
      return String(Date.now()) + Math.random().toString(16).slice(2);
    }
  })();

  // ---- FIX landing_id: guardar el LANDING_ID real de esta landing en
  // localStorage bajo una clave fija, para que la página de gracias lo
  // pueda leer en vez de tener uno hardcodeado. ----
  try {
    localStorage.setItem('vsl_landing_id', LANDING_ID);
  } catch (e) {}

  // Modo test — corta el envío a Meta Pixel sin tocar Supabase.
  // Activar:   localStorage.setItem(PREFIX + '_test_mode', '1');
  // Desactivar: localStorage.removeItem(PREFIX + '_test_mode');
  function isTestMode() {
    try { return localStorage.getItem(PREFIX + '_test_mode') === '1'; } catch (e) { return false; }
  }

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

    if (typeof fbq === 'function' && !isTestMode()) {
      fbq('trackCustom', eventName, params);
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: eventName }, params));

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

  // REEMPLAZAR POR CLIENTE — id del <iframe> de YouTube embebido en la
  // landing (si el VSL es un video de YouTube; si es otro reproductor,
  // hay que adaptar onPlayerReady/onPlayerStateChange).
  var YT_IFRAME_ID = 'vsl-yt-iframe';

  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player(YT_IFRAME_ID, {
      events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
    });
  };

  function onPlayerReady() { videoDuration = player.getDuration(); }

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      sendEvent('VSL_Play', { percent: Math.round(maxPercentReached) });
      startProgressTracking();
    } else if (event.data === YT.PlayerState.PAUSED) {
      sendEvent('VSL_Pause', { percent: Math.round(maxPercentReached) });
      stopProgressTracking();
    } else if (event.data === YT.PlayerState.ENDED) {
      updateProgressBar(100);
      checkMilestones(100);
      sendEvent('VSL_Complete', { percent: 100 });
      stopProgressTracking();
    }
  }

  function startProgressTracking() {
    stopProgressTracking();
    progressInterval = setInterval(function () {
      if (!player || typeof player.getCurrentTime !== 'function') return;
      var current = player.getCurrentTime();
      var duration = player.getDuration() || videoDuration;
      if (!duration) return;
      var percent = (current / duration) * 100;
      updateProgressBar(percent);
      checkMilestones(percent);
    }, 250);
  }

  function stopProgressTracking() {
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
  }

  function updateProgressBar(percent) {
    if (fillEl) fillEl.style.width = Math.min(percent, 100) + '%';
    if (percent > maxPercentReached) {
      maxPercentReached = percent;
      try { localStorage.setItem(PREFIX + '_max_percent', String(Math.round(maxPercentReached))); } catch (e) {}
    }
  }

  function checkMilestones(percent) {
    [25, 50, 75, 100].forEach(function (m) {
      if (percent >= m && !firedMilestones[m]) {
        firedMilestones[m] = true;
        sendEvent('VSL_Progress_' + m, { percent: m });
      }
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && maxPercentReached > 0) {
      sendEvent('VSL_Abandon', { percent: Math.round(maxPercentReached) });
    }
  });

  // REEMPLAZAR POR CLIENTE si los botones de CTA no usan la clase
  // '.btn' (ajustar el selector al que use la landing real).
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sendEvent('VSL_CTA_Click', { percent: Math.round(maxPercentReached) });
    });
  });
})();
