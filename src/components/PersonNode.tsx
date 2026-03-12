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
        minHeight: NODE_H,
        backgroundColor: isDead ? '#f3f4f6' : '#ffffff',
      }}
    >
      {/* top — receives parent-child edge from marriage node */}
      <Handle type="target" position={Position.Top}    id="top"    className="!w-2 !h-2 !bg-gray-300 !border-0" />
      {/* left / right — send spouse edges to marriage node */}
      <Handle type="source" position={Position.Left}   id="left"   className="!w-2 !h-2 !bg-gray-300 !border-0" />
      <Handle type="source" position={Position.Right}  id="right"  className="!w-2 !h-2 !bg-gray-300 !border-0" />

      {/* Title strip — green (alive) or grey (dead) */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: cardColor }}
      >
        <span className="text-white text-xs font-medium truncate flex-1">
          {person.honorific || '\u00A0'}
        </span>
        {person.gender && (
          <span className="text-white text-xs ml-1">
            {person.gender === 'MALE' ? '♂' : '♀'}
          </span>
        )}
      </div>

      {/* Photo */}
      <div className="flex justify-center pt-3 pb-1">
        <div
          className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center"
          style={{ backgroundColor: isDead ? '#e5e7eb' : '#f0fdf4' }}
        >
          {person.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photo_url}
              alt={person.name}
              className={`w-full h-full object-cover ${isDead ? 'grayscale' : ''}`}
            />
          ) : (
            <svg viewBox="0 0 24 24" className="w-9 h-9" fill={cardColor} opacity={0.5}>
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="text-center px-3 pb-3">
        <p
          className="text-sm font-bold leading-tight"
          style={{ color: isDead ? '#6b7280' : '#111827' }}
        >
          {person.name}
          {isDead && <span className="ml-1 text-gray-400">†</span>}
        </p>
        {person.nickname && (
          <p className="text-xs text-gray-400 mt-0.5">"{person.nickname}"</p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-gray-300 !border-0" />
    </div>
  );
}

export default memo(PersonNode);
