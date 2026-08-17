import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TabFichaOperativa from '@/components/clientes/TabFichaOperativa';
import TabFichaBasica from '@/components/clientes/TabFichaBasica';
import TabOnboarding from '@/components/clientes/TabOnboarding';
import TabRoadmap from '@/components/clientes/TabRoadmap';
import TabCSB from '@/components/clientes/TabCSB';
import TabCSL from '@/components/clientes/TabCSL';
import type { Client } from '@/pages/ClienteDetalle';

// Agrupa los 6 tabs de estrategia/operación bajo un único item de primer
// nivel en ClienteDetalle.tsx ("Estrategia") — sub-tabs internos, estado
// local sin ruta propia, mismos 6 componentes de siempre sin modificar.
const SUB_TABS = [
  { value: 'ficha', label: 'Ficha Operativa' },
  { value: 'basica', label: 'Ficha Básica' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'csb', label: 'CSB' },
  { value: 'csl', label: 'CSL' },
];

interface Props {
  client: Client;
  onClientUpdate: () => void;
  // Contador bumpeado por el atajo "Editar" del header de ClienteDetalle —
  // fuerza el sub-tab a "basica" (Ficha Básica no es el default) para que
  // el modo edición de TabFichaBasica quede a la vista.
  autoEditTrigger?: number;
}

export default function TabEstrategiaCliente({ client, onClientUpdate, autoEditTrigger }: Props) {
  const [activeSubTab, setActiveSubTab] = useState('ficha');

  useEffect(() => {
    if (autoEditTrigger) setActiveSubTab('basica');
  }, [autoEditTrigger]);

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
      <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
        {SUB_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="ficha">
        <TabFichaOperativa client={client} onClientUpdate={onClientUpdate} />
      </TabsContent>
      <TabsContent value="basica">
        <TabFichaBasica client={client} onClientUpdate={onClientUpdate} autoEditTrigger={autoEditTrigger} />
      </TabsContent>
      <TabsContent value="onboarding">
        <TabOnboarding clientId={client.id} />
      </TabsContent>
      <TabsContent value="roadmap">
        <TabRoadmap clientId={client.id} />
      </TabsContent>
      <TabsContent value="csb">
        <TabCSB clientId={client.id} />
      </TabsContent>
      <TabsContent value="csl">
        <TabCSL clientId={client.id} />
      </TabsContent>
    </Tabs>
  );
}
