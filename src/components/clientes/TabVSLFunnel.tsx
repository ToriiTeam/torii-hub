import { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useRegisterSubsection, useRegisterSubsubsection } from '@/contexts/HeaderNavContext';
import TabCreativos from '@/components/clientes/TabCreativos';
import { HipotesisSection } from '@/features/vsl-funnel/components/HipotesisSection';
import { HistorialIteraciones } from '@/features/vsl-funnel/components/HistorialIteraciones';
import { VslSection } from '@/features/vsl-funnel/components/VslSection';
import { CalendarioVslFunnel } from '@/features/vsl-funnel/components/CalendarioVslFunnel';
import { FunnelSection } from '@/features/vsl-funnel/components/FunnelSection';

// Reemplaza a TabCreativosCliente.tsx (Árbol de Iteraciones/Ángulos/
// Creativos) dentro de Delivery OS > VSL Funnel. "Creativos" es el mismo
// componente de siempre, sin tocar. Historial e Hipótesis se construyeron
// en las pasadas 2 y 3 (src/features/vsl-funnel/). "VSL" fusiona los
// antiguos sub-tabs separados VSL+Landing (vsl_entries + landing_variants,
// con landings sueltas asociables a varios VSL). "Calendario" reusa
// CalendarioSection.tsx de Delivery OS. Precall queda como placeholder.
// "Funnel" es nuevo (métricas agregadas de vsl_events por cliente, ver
// FunnelSection.tsx) — vive primero porque es la vista de resumen. Este
// componente se usa tanto para un cliente real (TabDeliveryOS.tsx) como
// para el VSL Funnel de Torii (ToriiVslFunnel.tsx, fijado al
// cliente-casillero interno) — mismo componente, sin duplicar.
const SUB_TABS = [
  { value: 'funnel', label: 'Funnel' },
  { value: 'historial', label: 'Historial' },
  { value: 'hipotesis', label: 'Hipótesis' },
  { value: 'creativos', label: 'Creativos' },
  { value: 'vsl', label: 'VSL' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'precall', label: 'Precall' },
];

interface Props {
  clientId: string;
  // "Ver métricas completas" dentro de Funnel — ver FunnelSection.tsx.
  vslTrackingHref?: string;
  // Punto B del rediseño de header: para un cliente real, este componente
  // vive anidado bajo Delivery OS ("VSL Funnel" es una subsección de
  // Delivery OS), así que sus 7 tabs son una SUB-subsección (segunda fila
  // del header). Para el VSL Funnel de Torii (ToriiVslFunnel.tsx) no hay
  // wrapper de Delivery OS — es directamente un ítem de sidebar de primer
  // nivel — así que ahí sus tabs pasan a ser la subsección (primera fila).
  // Default 'subsubsection' porque el caso cliente es el más común.
  headerLevel?: 'subsection' | 'subsubsection';
}

export default function TabVSLFunnel({ clientId, vslTrackingHref, headerLevel = 'subsubsection' }: Props) {
  const [activeSubTab, setActiveSubTab] = useState('funnel');

  // Both hooks are always called (rules-of-hooks) — only the one matching
  // headerLevel actually registers a row, the other gets null and is a
  // no-op.
  const row = { items: SUB_TABS, activeValue: activeSubTab, onChange: setActiveSubTab };
  useRegisterSubsection(headerLevel === 'subsection' ? row : null);
  useRegisterSubsubsection(headerLevel === 'subsubsection' ? row : null);

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
      <TabsContent value="funnel">
        <FunnelSection clientId={clientId} moreHref={vslTrackingHref} />
      </TabsContent>
      <TabsContent value="historial">
        <HistorialIteraciones clientId={clientId} />
      </TabsContent>
      <TabsContent value="hipotesis">
        <HipotesisSection clientId={clientId} />
      </TabsContent>
      <TabsContent value="creativos">
        <TabCreativos clientId={clientId} />
      </TabsContent>
      <TabsContent value="vsl">
        <VslSection clientId={clientId} />
      </TabsContent>
      <TabsContent value="calendario">
        <CalendarioVslFunnel clientId={clientId} />
      </TabsContent>
      <TabsContent value="precall">
        <Proximamente label="Precall" />
      </TabsContent>
    </Tabs>
  );
}

function Proximamente({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/50 p-12 text-center text-muted-foreground">
      {label} — próximamente.
    </div>
  );
}
