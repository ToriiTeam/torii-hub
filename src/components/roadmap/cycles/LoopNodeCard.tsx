import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import type { RoadmapCycleNode } from '@/features/roadmap-cycles/types';

export interface LoopNodeData {
  node: RoadmapCycleNode;
  [key: string]: unknown;
}

// Registered once in CycleLoopDiagram.tsx's module-scope `nodeTypes` map —
// same stable-reference requirement as CreativeNodeCard.
export function LoopNodeCard({ data, selected }: NodeProps & { data: LoopNodeData }) {
  const { node } = data;

  return (
    <div className="w-40 flex flex-col items-center text-center cursor-pointer">
      <Handle type="target" position={Position.Top} className="!opacity-0" />

      <div
        className={`h-28 w-28 rounded-full border-2 flex items-center justify-center p-2 bg-card transition-colors ${
          selected ? 'border-primary ring-2 ring-primary/40' : 'border-primary/50'
        }`}
      >
        <span className="font-bold text-sm leading-tight">{node.nombre}</span>
      </div>

      {node.descripcion && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{node.descripcion}</p>
      )}

      {node.output && (
        <Badge variant="outline" className="mt-1.5 border-primary/40 text-primary text-[10px]">
          {node.output}
        </Badge>
      )}

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}
