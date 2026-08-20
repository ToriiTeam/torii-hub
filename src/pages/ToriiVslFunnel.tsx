import TabVSLFunnel from '@/components/clientes/TabVSLFunnel';

// VSL Funnel propio de Torii — reusa TabVSLFunnel.tsx tal cual (mismo
// componente que monta la ficha de un cliente real, con sus 7
// sub-subsecciones: Funnel, Historial, Hipótesis, Creativos, VSL,
// Calendario, Precall), pero fijado al cliente-casillero interno de Torii
// (clients.es_interno = true) en vez de un client_id de cliente real.
// VslSection (dentro de TabVSLFunnel) exige un client_id real por FK
// (vsl_entries/landing_variants no admiten client_id null), así que a
// diferencia de Social Funnel (que sí tiene un modo "Torii" nativo vía
// client_id null) esta sección necesita el casillero — ver migración
// clients_es_interno_and_torii_casillero. Antes solo mostraba el sub-tab
// "VSL" (VslSection) suelto; esto completa el resto que había quedado a
// medias — ver punto D.
const TORII_CASILLERO_CLIENT_ID = '5de1753a-69bd-45f7-8f0d-e871026446dd';

export default function ToriiVslFunnel() {
  return (
    <div className="space-y-6 animate-fade-in">
      <TabVSLFunnel clientId={TORII_CASILLERO_CLIENT_ID} />
    </div>
  );
}
