import { Node, Edge } from '@xyflow/react';
import { Person, Relationship } from '@/types';

// ── Shared constants (exported for useAutoLayout) ─────────────────────────────
export const NODE_W     = 200;
export const NODE_H     = 150;
export const MARRIAGE_W = 14;
export const MARRIAGE_H = 14;

const DEFAULT_COLOR = '#22c55e';
const EDGE_COLORS   = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4',
];

export function mId(a: string, b?: string) {
  return b ? `M_${[a, b].sort().join('_')}` : `M_${a}`;
}

// ── Main export (sync — ELK layout is applied separately by useAutoLayout) ────
export function buildFamilyLayout(
  persons:          Person[],
  relationships:    Relationship[],
  selectedId?:      string,
  connectSourceId?: string,
  selectedEdgeId?:  string,
): { nodes: Node[]; edges: Edge[] } {
  if (persons.length === 0) return { nodes: [], edges: [] };

  // Quick id → Person lookup used for order_index comparisons below
  const personById = new Map(persons.map(p => [p.id, p]));

  const personSet = new Set(persons.map(p => p.id));
  const validRels = relationships.filter(
    r => personSet.has(r.person1_id) && personSet.has(r.person2_id),
  );

  // ── Adjacency maps ────────────────────────────────────────────────────────
  const spouseOf         = new Map<string, string>();
  const childrenOf       = new Map<string, string[]>();
  const parentsOf        = new Map<string, string[]>();
  const personToMarriage = new Map<string, string>();

  for (const r of validRels) {
    if (r.relationship_type === 'SPOUSE') {
      if (!spouseOf.has(r.person1_id)) spouseOf.set(r.person1_id, r.person2_id);
      if (!spouseOf.has(r.person2_id)) spouseOf.set(r.person2_id, r.person1_id);
    } else if (r.relationship_type === 'PARENT_CHILD') {
      const c = childrenOf.get(r.person1_id) ?? [];
      if (!c.includes(r.person2_id)) c.push(r.person2_id);
      childrenOf.set(r.person1_id, c);
      const p = parentsOf.get(r.person2_id) ?? [];
      if (!p.includes(r.person1_id)) p.push(r.person1_id);
      parentsOf.set(r.person2_id, p);
    }
  }

  // ── Marriage nodes ────────────────────────────────────────────────────────
  const marriageSet = new Set<string>();
  for (const r of validRels) {
    if (r.relationship_type !== 'SPOUSE') continue;
    const mid = mId(r.person1_id, r.person2_id);
    marriageSet.add(mid);
    personToMarriage.set(r.person1_id, mid);
    personToMarriage.set(r.person2_id, mid);
  }

  // ── Color by connected component (BFS) ───────────────────────────────────
  const personColor  = new Map<string, string>();
  const marriageColor = new Map<string, string>();
  const visited = new Set<string>();
  let colorIdx = 0;

  function bfs(startId: string, color: string) {
    const queue = [startId];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      personColor.set(id, color);
      const spouse = spouseOf.get(id);
      if (spouse && !visited.has(spouse)) queue.push(spouse);
      (childrenOf.get(id) ?? []).forEach(c => !visited.has(c) && queue.push(c));
      (parentsOf.get(id)  ?? []).forEach(p => !visited.has(p) && queue.push(p));
    }
  }

  for (const p of persons) {
    if (!parentsOf.has(p.id) && !visited.has(p.id))
      bfs(p.id, EDGE_COLORS[colorIdx++ % EDGE_COLORS.length]);
  }
  for (const p of persons) {
    if (!visited.has(p.id))
      bfs(p.id, EDGE_COLORS[colorIdx++ % EDGE_COLORS.length]);
  }

  for (const r of validRels) {
    if (r.relationship_type !== 'SPOUSE') continue;
    const mid = mId(r.person1_id, r.person2_id);
    if (!marriageColor.has(mid))
      marriageColor.set(mid, personColor.get(r.person1_id) ?? DEFAULT_COLOR);
  }

  // ── Flow nodes — positions start at {0,0}; ELK applied by useAutoLayout ──
  const flowNodes: Node[] = [];

  for (const p of persons) {
    flowNodes.push({
      id:   p.id,
      type: 'person',
      position: { x: 0, y: 0 },
      data: {
        person:          p,
        isSelected:      p.id === selectedId,
        isConnectSource: p.id === connectSourceId,
        familyColor:     personColor.get(p.id) ?? DEFAULT_COLOR,
      },
    });
  }

  for (const mid of Array.from(marriageSet)) {
    flowNodes.push({
      id:   mid,
      type: 'marriage',
      position: { x: 0, y: 0 },
      data: { color: marriageColor.get(mid) ?? DEFAULT_COLOR },
      selectable:  false,
      draggable:   false,
      connectable: false,
    } as Node);
  }

  // ── Flow edges ────────────────────────────────────────────────────────────
  const flowEdges: Edge[] = [];
  const isSel = (id: string) => id === selectedEdgeId;

  // SPOUSE — within a couple, the person with the higher order_index goes on
  // the LEFT (sourceHandle 'right' → connects rightward to the marriage node).
  // The _p1 edge is pushed first so useAutoLayout reads persons[0] = left person.
  const spouseDone = new Set<string>();
  for (const r of validRels) {
    if (r.relationship_type !== 'SPOUSE') continue;
    const key = [r.person1_id, r.person2_id].sort().join('|');
    if (spouseDone.has(key)) continue;
    spouseDone.add(key);

    const mid   = mId(r.person1_id, r.person2_id);
    const color = personColor.get(r.person1_id) ?? DEFAULT_COLOR;
    const s     = isSel(r.id);

    // Higher order_index → left side of the couple
    const oi1     = personById.get(r.person1_id)?.order_index ?? 0;
    const oi2     = personById.get(r.person2_id)?.order_index ?? 0;
    const leftId  = oi1 >= oi2 ? r.person1_id : r.person2_id;
    const rightId = oi1 >= oi2 ? r.person2_id : r.person1_id;

    // _p1 = left person (right handle → marriage node to their right)
    flowEdges.push({
      id: `${r.id}_p1`,
      source: leftId, sourceHandle: 'right',
      target: mid,    targetHandle: 'left',
      type: 'spouseEdge',
      style: { stroke: s ? '#ef4444' : color, strokeWidth: s ? 4 : 3 },
      data: { relId: r.id, color },
      zIndex: s ? 10 : 1,
    });
    // _p2 = right person (left handle → marriage node to their left)
    flowEdges.push({
      id: `${r.id}_p2`,
      source: rightId, sourceHandle: 'left',
      target: mid,     targetHandle: 'right',
      type: 'spouseEdge',
      style: { stroke: s ? '#ef4444' : color, strokeWidth: s ? 4 : 3 },
      data: { relId: r.id, color },
      zIndex: s ? 10 : 1,
    });
  }

  // PARENT_CHILD
  for (const r of validRels) {
    if (r.relationship_type !== 'PARENT_CHILD') continue;
    const color = personColor.get(r.person1_id) ?? DEFAULT_COLOR;
    const s     = isSel(r.id);
    const mid   = personToMarriage.get(r.person1_id);

    flowEdges.push({
      id: r.id,
      source:       mid ?? r.person1_id,
      sourceHandle: 'bottom',
      target:       r.person2_id,
      targetHandle: 'top',
      type: 'familyEdge',
      style: { stroke: s ? '#ef4444' : color, strokeWidth: s ? 4 : 2 },
      data: { color },
      zIndex: s ? 10 : 0,
    });
  }

  // SIBLING
  for (const r of validRels) {
    if (r.relationship_type !== 'SIBLING') continue;
    const s = isSel(r.id);
    flowEdges.push({
      id: r.id,
      source: r.person1_id,
      target: r.person2_id,
      type: 'smoothstep',
      style: {
        stroke:          s ? '#ef4444' : '#60a5fa',
        strokeWidth:     s ? 4 : 2,
        strokeDasharray: '6 3',
      },
      zIndex: s ? 10 : 0,
    });
  }

  return { nodes: flowNodes, edges: flowEdges };
}
