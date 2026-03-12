'use client';
import { BaseEdge, EdgeProps } from '@xyflow/react';

export const FamilyEdgeType = 'familyEdge';

/**
 * FamilyEdge — orthogonal path:
 *   source (marriage / person bottom handle)
 *     ↓  vertical to horizontal bar
 *     →  horizontal bar at midpoint between source and target
 *     ↓  vertical to child top
 *
 * barY = midpoint of the vertical gap, so the bar always lands
 * clearly between the parent-generation cards and the child cards,
 * never clipping through a node.
 */
export default function FamilyEdge({
  id, sourceX, sourceY, targetX, targetY, style,
}: EdgeProps) {
  const barY = (sourceY + targetY) / 2;
  const d = `M ${sourceX},${sourceY} L ${sourceX},${barY} L ${targetX},${barY} L ${targetX},${targetY}`;
  return <BaseEdge id={id} path={d} style={style} />;
}
