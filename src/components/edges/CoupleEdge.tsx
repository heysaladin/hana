'use client';
import { BaseEdge, EdgeProps, getStraightPath } from '@xyflow/react';

export const CoupleEdgeType = 'spouseEdge';

/**
 * SpouseEdge — straight horizontal line from person's left/right handle
 * to the marriage node's matching handle.
 * Because the handles are at identical Y (both vertically centred), the
 * line is always perfectly horizontal with zero extra routing needed.
 */
export default function CoupleEdge({
  id, sourceX, sourceY, targetX, targetY, style,
}: EdgeProps) {
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return <BaseEdge id={id} path={path} style={style} />;
}
