import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CycleLoopDiagram } from './CycleLoopDiagram';
import { CycleDetailPanel } from './CycleDetailPanel';
import type { RoadmapCycleNode, RoadmapCycleWithNodes } from '@/features/roadmap-cycles/types';

interface Props {
  cycles: RoadmapCycleWithNodes[];
  onNodeSaved: () => void;
}

export function CycleTabs({ cycles, onNodeSaved }: Props) {
  const [activeKey, setActiveKey] = useState(cycles[0]?.key);
  const [selectedNode, setSelectedNode] = useState<RoadmapCycleNode | null>(null);

  if (cycles.length === 0) return null;

  // A single cycle (ex: the weekly recurring one) skips the Tabs chrome —
  // no point in a 1-tab TabsList.
  if (cycles.length === 1) {
    const cycle = cycles[0];
    return (
      <div className="space-y-2">
        <CycleHeader cycle={cycle} />
        <CycleLoopDiagram cycle={cycle} onNodeClick={setSelectedNode} />
        <CycleDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} onSaved={() => { onNodeSaved(); setSelectedNode(null); }} />
      </div>
    );
  }

  return (
    <Tabs value={activeKey} onValueChange={setActiveKey}>
      <TabsList className="bg-secondary/50">
        {cycles.map((cycle) => (
          <TabsTrigger key={cycle.key} value={cycle.key} className="text-sm gap-1.5">
            {cycle.nombre}
            {cycle.status === 'en_definicion' && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[10px] px-1.5 py-0">
                En definición
              </Badge>
            )}
            {cycle.cadence && (
              <Badge variant="outline" className="border-primary/40 text-primary text-[10px] px-1.5 py-0">
                {cycle.cadence}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {cycles.map((cycle) => (
        <TabsContent key={cycle.key} value={cycle.key} className="space-y-2 mt-3">
          <CycleHeader cycle={cycle} />
          <CycleLoopDiagram cycle={cycle} onNodeClick={setSelectedNode} />
        </TabsContent>
      ))}
      <CycleDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} onSaved={() => { onNodeSaved(); setSelectedNode(null); }} />
    </Tabs>
  );
}

function CycleHeader({ cycle }: { cycle: RoadmapCycleWithNodes }) {
  if (!cycle.descripcion) return null;
  return <p className="text-xs text-muted-foreground">{cycle.descripcion}</p>;
}
