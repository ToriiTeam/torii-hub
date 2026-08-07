import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreativeTree from '@/components/clientes/creative-tree/CreativeTree';
import TabAngulos from '@/components/clientes/TabAngulos';
import TabCreativos from '@/components/clientes/TabCreativos';

// Agrupa los 3 tabs de creativos bajo un único item de primer nivel en
// ClienteDetalle.tsx ("Creativos") — sub-tabs internos, estado local sin
// ruta propia, mismos 3 componentes de siempre sin modificar.
const SUB_TABS = [
  { value: 'arbol', label: 'Árbol de Iteraciones' },
  { value: 'angulos', label: 'Ángulos' },
  { value: 'creativos', label: 'Creativos' },
];

interface Props {
  clientId: string;
}

export default function TabCreativosCliente({ clientId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState('arbol');

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
      <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
        {SUB_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="arbol">
        <CreativeTree clientId={clientId} />
      </TabsContent>
      <TabsContent value="angulos">
        <TabAngulos clientId={clientId} />
      </TabsContent>
      <TabsContent value="creativos">
        <TabCreativos clientId={clientId} />
      </TabsContent>
    </Tabs>
  );
}
