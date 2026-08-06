import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

// Pulso real en CSS (@keyframes roadmap-edge-pulse en index.css, opacity +
// drop-shadow) — deliberadamente NO usa el animated:true de React Flow,
// que anima el dash-offset del trazo ("hormigas marchando"), un efecto
// distinto al pulso sutil pedido.
export function PulseEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className="roadmap-pulse-edge"
        style={{ stroke: 'hsl(var(--primary))', strokeWidth: 1.5 }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 22,
              color: 'hsl(var(--primary))',
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
