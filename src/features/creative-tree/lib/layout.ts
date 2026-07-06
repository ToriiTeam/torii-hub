import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';

const NODE_WIDTH = 260;
const NODE_HEIGHT = 160;

// Runs once per client, only when every node still has the DB default
// position (0, 0) — i.e. nobody has dragged anything yet. Positions the
// tree top-to-bottom by parent/child edges and writes the result back onto
// each node's `position`; the caller is responsible for persisting these
// via savePosition() if it wants the layout to stick.
export function layoutWithDagre(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const { x, y } = g.node(node.id);
    return {
      ...node,
      // dagre gives the node's center; React Flow positions by top-left.
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    };
  });
}

export function allPositionsDefault(nodes: { position_x: number; position_y: number }[]): boolean {
  return nodes.every((n) => n.position_x === 0 && n.position_y === 0);
}
