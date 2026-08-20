import ContenidoOrganico from '@/pages/ContenidoOrganico';

// Social Funnel propio de Torii — reusa ContenidoOrganico.tsx tal cual, en
// su modo "Torii" nativo (sentinel 'torii' → content_*.client_id IS NULL),
// que ya existía antes de esta tarea para el contenido orgánico propio de
// la agencia. Pasar fixedClientId="torii" reproduce exactamente ese modo
// (oculta el selector interno de cliente, que es el comportamiento pedido:
// ninguna sección debe tener selector de cliente adentro) sin duplicar el
// componente ni requerir el cliente-casillero (a diferencia de VSL Funnel,
// que sí lo necesita — ver ToriiVslFunnel.tsx).
export default function ToriiSocialFunnel() {
  return <ContenidoOrganico fixedClientId="torii" />;
}
