'use client';
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MARRIAGE_W, MARRIAGE_H } from '@/lib/familyLayout';

interface MarriageData extends Record<string, unknown> {
  color: string;
}

function MarriageNode({ data }: NodeProps) {
  const { color } = data as MarriageData;

  return (
    <div
      className="rounded-full"
      style={{
        width:  MARRIAGE_W,
        height: MARRIAGE_H,
        backgroundColor: color,
        boxShadow: `0 0 0 3px white, 0 0 0 4px ${color}`,
      }}
    >
      {/* Receives spouse edges */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-1 !h-1 !bg-transparent !border-0 !-left-0.5"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="!w-1 !h-1 !bg-transparent !border-0 !-right-0.5"
      />
      {/* Sends parent-child edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-1 !h-1 !bg-transparent !border-0"
      />
    </div>
  );
}

export default memo(MarriageNode);
