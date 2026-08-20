/* ============================================================
 * DEBUG TEMPORAL — capturar los postMessage del widget de GHL
 * ============================================================
 * Objetivo: ver en crudo, sin filtrar, TODO lo que el iframe del
 * widget de reservas de GHL (api.leadconnectorhq.com/widget/booking/...)
 * manda hacia la ventana padre vía window.postMessage — para confirmar
 * si existe alguna señal de "formulario completado" (calificado o no)
 * que hoy no estamos escuchando (ver diagnóstico: Problema 2, no hay
 * evidencia oficial confiable de GHL sobre esto, solo blogs de
 * terceros — hay que verificarlo empíricamente contra el widget real).
 *
 * CÓMO USAR:
 * 1. Pegar este script de forma PROVISORIA en la landing de Adolfo
 *    Blasco, justo antes de </body> (junto al resto de los scripts).
 * 2. Abrir la landing en una pestaña nueva y abrir la consola del
 *    navegador (F12 → pestaña "Console") ANTES de interactuar con el
 *    formulario.
 * 3. Hacer 2 pruebas reales, completas, una por vez:
 *      a) Completar el formulario de reserva como alguien que SÍ
 *         califica (llegar hasta ver el calendario/confirmar turno).
 *      b) Completar el formulario como alguien que NO califica
 *         (respuestas que deberían cortar el flujo antes del calendario).
 * 4. Para cada prueba, copiar TODO lo que aparece en la consola
 *    (cada línea "[GHL postMessage] ...") y guardarlo aparte —
 *    necesitamos comparar ambos casos para ver si hay alguna
 *    diferencia detectable en los mensajes.
 * 5. Sacar este script de la landing apenas termines de probar — es
 *    solo para diagnóstico, no debe quedar corriendo en producción
 *    (loguea datos crudos en la consola de cualquier visitante).
 * ============================================================ */
window.addEventListener('message', function (event) {
  console.log('[GHL postMessage]', event.origin, event.data);
});
