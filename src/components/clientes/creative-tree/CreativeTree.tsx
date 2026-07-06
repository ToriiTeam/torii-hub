import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, MarkerType,
  useNodesState, useEdgesState, type Node, type Edge, type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CreativeNodeCard, type CreativeNodeData } from './CreativeNodeCard';
import { CreativeDetailPanel } from './CreativeDetailPanel';
import { NewChildDialog } from './NewChildDialog';
import { EmptyTreeState } from './EmptyTreeState';
import { fetchNodes, savePosition } from '@/features/creative-tree/lib/creativeNodesRepo';
import { layoutWithDagre, allPositionsDefault } from '@/features/creative-tree/lib/layout';
import { ESTADO_COLORS } from '@/features/creative-tree/types';
import type { CreativeNode } from '@/features/creative-tree/types';

// Module-scope — React Flow requires a stable reference per node type key,
// or it treats every render as a brand-new type and remounts the tree.
const NODE_TYPES = { creative: CreativeNodeCard };

const POSITION_SAVE_DEBOUNCE_MS = 400;

interface Props {
  clientId: string;
}

export default function CreativeTree({ clientId }: Props) {
  const [rawNodes, setRawNodes] = useState<CreativeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<CreativeNode | null>(null);
  // undefined = dialog closed, null = creating a root node, string = creating a child of that parent
  const [newChildParentId, setNewChildParentId] = useState<string | null | undefined>(undefined);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node<CreativeNodeData>>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleAddChild = useCallback((parentId: string) => setNewChildParentId(parentId), []);

  const loadNodes = useCallback(async () => {
    setLoading(true);
    try {
      const nodes = await fetchNodes(clientId);
      setRawNodes(nodes);
    } catch (err) {
      console.error('[CreativeTree] failed to load nodes:', err);
      toast.error('Error al cargar el árbol de creativos');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadNodes(); }, [loadNodes]);

  // Rebuild the React Flow graph whenever the underlying data changes.
  useEffect(() => {
    if (rawNodes.length === 0) {
      setFlowNodes([]);
      setFlowEdges([]);
      return;
    }

    let positioned: Node<CreativeNodeData>[] = rawNodes.map((node) => ({
      id: node.id,
      type: 'creative',
      position: { x: node.position_x, y: node.position_y },
      data: { node, onAddChild: handleAddChild },
    }));

    const edges: Edge[] = rawNodes
      .filter((node) => node.parent_id)
      .map((node) => ({
        id: `${node.parent_id}-${node.id}`,
        source: node.parent_id as string,
        target: node.id,
        animated: true,
        style: { stroke: ESTADO_COLORS[node.estado] },
        markerEnd: { type: MarkerType.ArrowClosed, color: ESTADO_COLORS[node.estado] },
      }));

    if (allPositionsDefault(rawNodes)) {
      positioned = layoutWithDagre(positioned, edges) as Node<CreativeNodeData>[];
      // Persist the computed layout once so it doesn't get recomputed (and
      // silently drift) on every future load — fire-and-forget, no toast.
      for (const node of positioned) {
        savePosition(node.id, node.position.x, node.position.y).catch((err) =>
          console.error('[CreativeTree] failed to persist auto-layout position:', err),
        );
      }
    }

    setFlowNodes(positioned);
    setFlowEdges(edges);
  }, [rawNodes, handleAddChild, setFlowNodes, setFlowEdges]);

  // Keeps the open detail panel in sync with fresh data after a save
  // (instead of just closing it) — and closes it if the node got deleted.
  useEffect(() => {
    setSelectedNode((prev) => (prev ? rawNodes.find((n) => n.id === prev.id) ?? null : prev));
  }, [rawNodes]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const found = rawNodes.find((n) => n.id === node.id) ?? null;
    setSelectedNode(found);
  }, [rawNodes]);

  const handleNodeDragStop: NodeMouseHandler = useCallback((_event, node) => {
    const existing = saveTimers.current.get(node.id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      savePosition(node.id, node.position.x, node.position.y).catch((err) =>
        console.error('[CreativeTree] failed to save node position:', err),
      );
      saveTimers.current.delete(node.id);
    }, POSITION_SAVE_DEBOUNCE_MS);
    saveTimers.current.set(node.id, timer);
  }, []);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => { for (const t of timers.values()) clearTimeout(t); };
  }, []);

  const hasNodes = rawNodes.length > 0;

  const dialogOpen = newChildParentId !== undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Árbol de iteraciones creativas
        </h3>
        <Button size="sm" onClick={() => setNewChildParentId(null)} className="bg-primary">
          <Plus className="h-4 w-4 mr-1.5" />Nuevo ángulo base
        </Button>
      </div>

      <div className="h-[650px] rounded-lg border border-border/50 bg-secondary/10 overflow-hidden">
        {!hasNodes ? (
          <EmptyTreeState onCreate={() => setNewChildParentId(null)} />
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onNodeDragStop={handleNodeDragStop}
            nodeTypes={NODE_TYPES}
            fitView
            colorMode="dark"
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable className="!bg-card" />
          </ReactFlow>
        )}
      </div>

      <CreativeDetailPanel
        clientId={clientId}
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onSaved={async () => {
          await loadNodes();
        }}
        onDeleted={async () => {
          setSelectedNode(null);
          await loadNodes();
        }}
      />

      {dialogOpen && (
        <NewChildDialog
          clientId={clientId}
          parentId={newChildParentId ?? null}
          onClose={() => setNewChildParentId(undefined)}
          onCreated={async () => {
            setNewChildParentId(undefined);
            await loadNodes();
          }}
        />
      )}
    </div>
  );
}
