import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TabCreativos from '@/components/clientes/TabCreativos';

// Reemplaza a TabCreativosCliente.tsx (Árbol de Iteraciones/Ángulos/
// Creativos) dentro de Delivery OS > VSL Funnel. "Creativos" es el mismo
// componente de siempre, sin tocar. Historial e Hipótesis se construyen en
// las pasadas 2 y 3 — acá quedan como placeholder. VSL/Landing/Precall son
// secciones nuevas todavía sin funcionalidad definida, mismo criterio.
const SUB_TABS = [
  { value: 'historial', label: 'Historial' },
  { value: 'hipotesis', label: 'Hipótesis' },
  { value: 'creativos', label: 'Creativos' },
  { value: 'vsl', label: 'VSL' },
  { value: 'landing', label: 'Landing' },
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
        <Proximamente label="Historial" />
      </TabsContent>
      <TabsContent value="hipotesis">
        <Proximamente label="Hipótesis" />
      </TabsContent>
      <TabsContent value="creativos">
        <TabCreativos clientId={clientId} />
      </TabsContent>
      <TabsContent value="vsl">
        <Proximamente label="VSL" />
      </TabsContent>
      <TabsContent value="landing">
        <Proximamente label="Landing" />
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
