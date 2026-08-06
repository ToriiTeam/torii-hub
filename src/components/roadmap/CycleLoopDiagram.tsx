import { useMemo } from 'react';
import { ReactFlow, Background, MarkerType, type Node, type Edge, type NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LoopNodeCard, type LoopNodeData } from './LoopNodeCard';
import { PulseEdge } from './PulseEdge';
import type { RoadmapProcess } from '@/features/roadmap/types';

// Mismo patrón React Flow que el Árbol de Iteraciones, pero es un diagrama
// fijo e ilustrativo (las etapas de un ciclo no se reordenan a mano) —
// dragging/zoom/pan deshabilitados, layout circular calculado acá mismo.
const NODE_TYPES = { loop: LoopNodeCard };
const EDGE_TYPES = { pulse: PulseEdge };
const PRIMARY = 'hsl(var(--primary))';

function circlePositions(count: number, radius = 130, cx = 200, cy = 150) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2; // arranca arriba
    return { x: cx + radius * Math.cos(angle) - 80, y: cy + radius * Math.sin(angle) - 55 };
  });
}

interface Props {
  stages: RoadmapProcess[];
  onNodeClick: (process: RoadmapProcess) => void;
}

export function CycleLoopDiagram({ stages, onNodeClick }: Props) {
  const ordered = useMemo(() => [...stages].sort((a, b) => a.orden - b.orden), [stages]);
  const positions = useMemo(() => circlePositions(ordered.length), [ordered.length]);

  const nodes: Node<LoopNodeData>[] = useMemo(
    () => ordered.map((process, i) => ({
      id: process.id,
      type: 'loop',
      position: positions[i] ?? { x: 0, y: 0 },
      data: { process },
      draggable: false,
    })),
    [ordered, positions],
  );

  const edges: Edge[] = useMemo(() => {
    if (ordered.length < 2) return [];
    return ordered.map((process, i) => {
      const next = ordered[(i + 1) % ordered.length];
      const isClosingEdge = i === ordered.length - 1;
      return {
        id: `${process.id}-${next.id}`,
        source: process.id,
        target: next.id,
        type: 'pulse',
        markerEnd: { type: MarkerType.ArrowClosed, color: PRIMARY, width: 16, height: 16 },
        ...(isClosingEdge ? { label: '∞' } : {}),
      };
    });
  }, [ordered]);

  const handleNodeClick: NodeMouseHandler = (_event, flowNode) => {
    const found = ordered.find((p) => p.id === flowNode.id);
    if (found) onNodeClick(found);
  };

  return (
    <div className="h-[320px] rounded-lg border border-border/50 bg-secondary/10 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodeClick={handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
