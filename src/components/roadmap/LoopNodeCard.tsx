import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import type { RoadmapProcess } from '@/features/roadmap/types';

export interface LoopNodeData {
  process: RoadmapProcess;
  [key: string]: unknown;
}

// Registrado una sola vez en el nodeTypes module-scope de
// CycleLoopDiagram.tsx — misma referencia estable que CreativeNodeCard.
export function LoopNodeCard({ data, selected }: NodeProps & { data: LoopNodeData }) {
  const { process } = data;

  return (
    <div className="w-40 flex flex-col items-center text-center cursor-pointer">
      <Handle type="target" position={Position.Top} className="!opacity-0" />

      <div
        className={`h-28 w-28 rounded-full border-2 flex items-center justify-center p-2 bg-card transition-colors ${
          selected ? 'border-primary ring-2 ring-primary/40' : 'border-primary/50'
        }`}
      >
        <span className="font-bold text-sm leading-tight">{process.nombre}</span>
      </div>

      {process.objetivo && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{process.objetivo}</p>
      )}

      {process.done_criteria && (
        <Badge variant="outline" className="mt-1.5 border-primary/40 text-primary text-[10px]">
          {process.done_criteria}
        </Badge>
      )}

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}
