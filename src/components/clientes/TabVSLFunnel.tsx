import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TabCreativos from '@/components/clientes/TabCreativos';
import { HipotesisSection } from '@/features/vsl-funnel/components/HipotesisSection';
import { HistorialIteraciones } from '@/features/vsl-funnel/components/HistorialIteraciones';
import { VslSection } from '@/features/vsl-funnel/components/VslSection';
import { CalendarioVslFunnel } from '@/features/vsl-funnel/components/CalendarioVslFunnel';

// Reemplaza a TabCreativosCliente.tsx (Árbol de Iteraciones/Ángulos/
// Creativos) dentro de Delivery OS > VSL Funnel. "Creativos" es el mismo
// componente de siempre, sin tocar. Historial e Hipótesis se construyeron
// en las pasadas 2 y 3 (src/features/vsl-funnel/). "VSL" fusiona los
// antiguos sub-tabs separados VSL+Landing (vsl_entries + landing_variants,
// con landings sueltas asociables a varios VSL). "Calendario" reusa
// CalendarioSection.tsx de Delivery OS. Precall queda como placeholder.
const SUB_TABS = [
  { value: 'historial', label: 'Historial' },
  { value: 'hipotesis', label: 'Hipótesis' },
  { value: 'creativos', label: 'Creativos' },
  { value: 'vsl', label: 'VSL' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'precall', label: 'Precall' },
];

interface Props {
  clientId: string;
}

export default function TabVSLFunnel({ clientId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState('historial');

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
      <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
        {SUB_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

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
