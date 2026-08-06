import { useMemo } from 'react';
import { ReactFlow, Background, MarkerType, type Node, type Edge, type NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LoopNodeCard, type LoopNodeData } from './LoopNodeCard';
import type { RoadmapCycleWithNodes, RoadmapCycleNode } from '@/features/roadmap-cycles/types';

// Same React Flow pattern as the Árbol de Iteraciones (CreativeTree.tsx),
// but these are small fixed illustrative diagrams — not a workspace the
// user rearranges — so dragging/zooming/panning are all disabled and the
// 3 nodes sit in a fixed triangular layout computed here, not persisted.
const NODE_TYPES = { loop: LoopNodeCard };
const PRIMARY = 'hsl(var(--primary))';

// 1 top, 2 bottom-right, 3 bottom-left — loop runs 1→2→3→1 clockwise.
const TRIANGLE_POSITIONS = [
  { x: 200, y: 10 },
  { x: 380, y: 190 },
  { x: 20, y: 190 },
];

interface Props {
  cycle: RoadmapCycleWithNodes;
  onNodeClick: (node: RoadmapCycleNode) => void;
}

export function CycleLoopDiagram({ cycle, onNodeClick }: Props) {
  const nodes: Node<LoopNodeData>[] = useMemo(
    () =>
      cycle.nodes.map((node, i) => ({
        id: node.id,
        type: 'loop',
        position: TRIANGLE_POSITIONS[i] ?? { x: 0, y: 0 },
        data: { node },
        draggable: false,
      })),
    [cycle.nodes],
  );

  const edges: Edge[] = useMemo(() => {
    const ordered = cycle.nodes;
    if (ordered.length < 2) return [];
    return ordered.map((node, i) => {
      const next = ordered[(i + 1) % ordered.length];
      const isClosingEdge = i === ordered.length - 1;
      return {
        id: `${node.id}-${next.id}`,
        source: node.id,
        target: next.id,
        animated: true,
        style: { stroke: PRIMARY, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: PRIMARY, width: 16, height: 16 },
        ...(isClosingEdge
          ? { label: '∞', labelStyle: { fontSize: 22, fill: PRIMARY, fillOpacity: 0.6 }, labelShowBg: false }
          : {}),
      };
    });
  }, [cycle.nodes]);

  const handleNodeClick: NodeMouseHandler = (_event, flowNode) => {
    const found = cycle.nodes.find((n) => n.id === flowNode.id);
    if (found) onNodeClick(found);
  };

  return (
    <div className="h-[320px] rounded-lg border border-border/50 bg-secondary/10 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
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
