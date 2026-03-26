'use client';
import { BaseEdge, EdgeProps, getSmoothStepPath, Position, useNodes } from '@xyflow/react';
import { NODE_W, NODE_H } from '@/lib/familyLayout';

export const ArcEdgeType = 'arcEdge';

/**
 * ArcEdge — used when two spouses live in different subtrees and can't be
 * placed adjacent.  The edge exits each person's top-centre, arcs above
 * the generation row, and never crosses same-level nodes.
 */
export default function ArcEdge({ id, source, target, style }: EdgeProps) {
  const nodes = useNodes();
  const srcNode = nodes.find(n => n.id === source);
  const tgtNode = nodes.find(n => n.id === target);
  if (!srcNode || !tgtNode) return null;

  const sw = srcNode.measured?.width  ?? NODE_W;
  const sh = srcNode.measured?.height ?? NODE_H;
  const tw = tgtNode.measured?.width  ?? NODE_W;

  const sx = srcNode.position.x + sw / 2;
  const sy = srcNode.position.y;
  const tx = tgtNode.position.x + tw / 2;
  const ty = tgtNode.position.y;

  const LIFT = Math.max(sh * 0.45, 70);

  const [path] = getSmoothStepPath({
    sourceX: sx, sourceY: sy, sourcePosition: Position.Top,
    targetX: tx, targetY: ty, targetPosition: Position.Top,
    offset: LIFT,
    borderRadius: 20,
  });

  return <BaseEdge id={id} path={path} style={style} />;
}
