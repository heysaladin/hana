'use client';
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Person } from '@/types';
import { NODE_W, NODE_H } from '@/lib/familyLayout';

interface PersonNodeData extends Record<string, unknown> {
  person: Person;
  isSelected: boolean;
  isConnectSource: boolean;
  familyColor: string;
}

// Living = green, dead = grey — overrides family color for node visuals.
// Edges keep familyColor for lineage distinction.
const ALIVE_COLOR = '#22c55e';
const DEAD_COLOR  = '#9ca3af';

function PersonNode({ data }: NodeProps) {
  const { person, isSelected, isConnectSource } = data as PersonNodeData;

  const isDead     = person.is_dead;
  const cardColor  = isDead ? DEAD_COLOR : ALIVE_COLOR;

  const borderClass = isConnectSource
    ? 'ring-2 ring-blue-500 ring-offset-2'
    : isSelected
    ? 'ring-2 ring-blue-400 ring-offset-1'
    : isDead
    ? 'ring-1 ring-gray-300'
    : 'ring-1 ring-green-200';

  return (
    <div
      className={`rounded-2xl shadow-lg overflow-hidden select-none cursor-pointer ${borderClass}`}
      style={{
        width: NODE_W,
        backgroundColor: isDead ? '#f3f4f6' : '#ffffff',
      }}
    >
      {/* top — receives parent-child edge from marriage node */}
      <Handle type="target" position={Position.Top}    id="top"    className="!w-2 !h-2 !bg-gray-300 !border-0" />
      {/* left / right — send spouse edges to marriage node */}
      <Handle type="source" position={Position.Left}   id="left"   className="!w-2 !h-2 !bg-gray-300 !border-0" />
      <Handle type="source" position={Position.Right}  id="right"  className="!w-2 !h-2 !bg-gray-300 !border-0" />

      {/* Name + gender */}
      <div className="px-3 py-2 flex items-center justify-center gap-1">
        <p
          className="text-sm font-bold leading-tight text-center"
          style={{ color: isDead ? '#6b7280' : '#111827' }}
        >
          {person.honorific ? `${person.honorific} ${person.name}` : person.name}
        </p>
        {person.gender && (
          <span className="text-base shrink-0" style={{ color: cardColor }}>
            {person.gender === 'MALE' ? '♂' : '♀'}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-gray-300 !border-0" />
    </div>
  );
}

export default memo(PersonNode);
