import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ESTADO_BADGE_CLASS, ESTADO_LABELS, TIPO_ICONS } from '@/features/creative-tree/types';
import type { CreativeNode } from '@/features/creative-tree/types';
import { isImageUrl } from '@/features/creative-tree/lib/media';

export interface CreativeNodeData {
  node: CreativeNode;
  onAddChild: (parentId: string) => void;
  [key: string]: unknown;
}

// Registered once in CreativeTree.tsx's module-scope `nodeTypes` map — React
// Flow requires a stable component reference per node type, or it treats
// every render as a new type and remounts the whole tree (same rule as any
// other component-declared-in-render-body anti-pattern in this codebase).
export function CreativeNodeCard({ data, selected }: NodeProps & { data: CreativeNodeData }) {
  const { node, onAddChild } = data;
  const hasThumb = isImageUrl(node.media_url);

  return (
    <div
      className={cn(
        'w-[240px] rounded-lg border bg-card p-3 shadow-sm transition-colors',
        selected ? 'border-primary ring-1 ring-primary' : 'border-border/50',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />

      <div className="flex items-start gap-2 mb-1.5">
        {hasThumb && (
          <img
            src={node.media_url!}
            alt=""
            className="w-10 h-10 rounded object-cover border border-border/50 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
          <p className="font-bold text-sm leading-tight break-words">{node.nombre}</p>
          <span className="text-lg shrink-0" title={node.tipo}>{TIPO_ICONS[node.tipo]}</span>
        </div>
      </div>

      <Badge className={cn('border-0 text-[10px] mb-2', ESTADO_BADGE_CLASS[node.estado])}>
        {ESTADO_LABELS[node.estado]}
      </Badge>

      {node.angulo && (
        <p className="text-xs text-muted-foreground mb-1 truncate" title={node.angulo}>
          {node.angulo}
        </p>
      )}

      {node.hipotesis && (
        <p className="text-xs text-muted-foreground line-clamp-2">{node.hipotesis}</p>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2 h-6 text-xs"
        onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
      >
        <Plus className="h-3 w-3 mr-1" />Iteración
      </Button>

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
}
