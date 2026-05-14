import dagre from 'dagre';
import { Person, Relationship } from '@/types';

export const NODE_W     = 200;
export const NODE_H     = 96;
export const MARRIAGE_W = 14;
export const MARRIAGE_H = 14;

// Width of a rendered couple (left person + gap + marriage dot + gap + right person)
const COUPLE_W = NODE_W * 2 + MARRIAGE_W + 50;

const DEFAULT_COLOR = '#22c55e';
const EDGE_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4',
];

export function mId(a: string, b?: string) {
  return b ? `M_${[a, b].sort().join('_')}` : `M_${a}`;
}

export interface LayoutNode {
  id: string;
  type: 'person' | 'marriage';
  x: number;
  y: number;
  width: number;
  height: number;
  data: {
    person?: Person;
    color?: string;
    isSelected?: boolean;
    isConnectSource?: boolean;
    familyColor?: string;
  };
}

export interface LayoutEdge {
  id: string;
  relId: string;
  type: 'spouse' | 'parent_child' | 'sibling';
  path: string;
  color: string;
  selected: boolean;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

function byOrder(a: Person, b: Person): number {
  const ia = a.order_index ?? 0;
  const ib = b.order_index ?? 0;
  if (ia !== ib) return ib - ia;
  const da = a.birth_date ?? '';
  const db = b.birth_date ?? '';
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da < db ? -1 : da > db ? 1 : 0;
}

export function buildFamilyLayout(
  persons:          Person[],
  relationships:    Relationship[],
  selectedId?:      string,
  connectSourceId?: string,
  selectedEdgeId?:  string,
): LayoutResult {
  if (persons.length === 0) return { nodes: [], edges: [] };

  const personById = new Map(persons.map(p => [p.id, p]));
  const personSet  = new Set(persons.map(p => p.id));
  const validRels  = relationships.filter(
    r => personSet.has(r.person1_id) && personSet.has(r.person2_id),
  );

  // ── Adjacency maps ─────────────────────────────────────────────────────────
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

  // ── Marriage node IDs ──────────────────────────────────────────────────────
  const marriageSet = new Set<string>();
  for (const r of validRels) {
    if (r.relationship_type !== 'SPOUSE') continue;
    const mid = mId(r.person1_id, r.person2_id);
    marriageSet.add(mid);
    personToMarriage.set(r.person1_id, mid);
    personToMarriage.set(r.person2_id, mid);
  }

  // ── Color by connected component (BFS) ────────────────────────────────────
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

  // ── Detect couple units ────────────────────────────────────────────────────
  type CoupleUnit = { unitId: string; p1: string; p2: string };
  const coupleUnits: CoupleUnit[] = [];
  const personInCouple = new Set<string>();
  const spouseDone = new Set<string>();

  for (const r of validRels) {
    if (r.relationship_type !== 'SPOUSE') continue;
    const key = [r.person1_id, r.person2_id].sort().join('|');
    if (spouseDone.has(key)) continue;
    spouseDone.add(key);

    const mid = mId(r.person1_id, r.person2_id);
    const oi1 = personById.get(r.person1_id)?.order_index ?? 0;
    const oi2 = personById.get(r.person2_id)?.order_index ?? 0;
    // Higher order_index → left (p1)
    const p1 = oi1 >= oi2 ? r.person1_id : r.person2_id;
    const p2 = oi1 >= oi2 ? r.person2_id : r.person1_id;

    coupleUnits.push({ unitId: mid, p1, p2 });
    personInCouple.add(r.person1_id);
    personInCouple.add(r.person2_id);
  }

  // ── Dagre graph ────────────────────────────────────────────────────────────
  const g = new dagre.graphlib.Graph();
  // nodesep: horizontal gap between sibling nodes/units
  // ranksep: vertical gap between generations
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 120, acyclicer: 'greedy', ranker: 'tight-tree' });
  g.setDefaultEdgeLabel(() => ({}));

  // Couple units as single wide nodes (with extra margin for breathing room)
  for (const cu of coupleUnits) {
    g.setNode(cu.unitId, { width: COUPLE_W + 20, height: NODE_H });
  }

  // Solo persons
  const soloPersons = persons
    .filter(p => !personInCouple.has(p.id))
    .sort(byOrder);
  for (const p of soloPersons) {
    g.setNode(p.id, { width: NODE_W + 20, height: NODE_H });
  }

  // Parent→child edges (mapped to couple units).
  // KEY FIX: each child node gets at most ONE incoming dagre edge.
  // Multiple parents (e.g. child of two different families) would pull
  // the node in two directions and cause dagre to produce overlapping layouts.
  const dagreEdgeSeen = new Set<string>();
  const tgtHasParent  = new Set<string>(); // each target gets one layout parent
  const rawEdges: { srcId: string; tgtId: string; childOrder: number }[] = [];

  for (const r of validRels) {
    if (r.relationship_type !== 'PARENT_CHILD') continue;

    let srcId = r.person1_id;
    let tgtId = r.person2_id;

    const srcCu = coupleUnits.find(c => c.p1 === srcId || c.p2 === srcId);
    if (srcCu) srcId = srcCu.unitId;

    const tgtCu = coupleUnits.find(c => c.p1 === tgtId || c.p2 === tgtId);
    if (tgtCu) tgtId = tgtCu.unitId;

    if (srcId === tgtId) continue;
    // Skip if this target already has a layout parent (prevents multi-parent overlap)
    if (tgtHasParent.has(tgtId)) continue;
    const key = `${srcId}→${tgtId}`;
    if (dagreEdgeSeen.has(key)) continue;
    dagreEdgeSeen.add(key);
    tgtHasParent.add(tgtId);

    const tgtPerson = personById.get(r.person2_id);
    rawEdges.push({ srcId, tgtId, childOrder: tgtPerson?.order_index ?? 0 });
  }

  // Sort edges: within same parent, higher order_index child goes first (left)
  rawEdges.sort((a, b) => {
    if (a.srcId !== b.srcId) return 0;
    return b.childOrder - a.childOrder;
  });

  for (const { srcId, tgtId } of rawEdges) {
    g.setEdge(srcId, tgtId);
  }

  // ── Run dagre layout ───────────────────────────────────────────────────────
  dagre.layout(g);

  // ── Map positions back to individual nodes ────────────────────────────────
  // Dagre returns CENTER coordinates; we store top-left.
  const posMap = new Map<string, { x: number; y: number }>();

  for (const nodeId of g.nodes()) {
    const nd = g.node(nodeId);
    if (!nd) continue;
    const { x: cx, y: cy } = nd;

    const cu = coupleUnits.find(c => c.unitId === nodeId);
    if (cu) {
      // Dagre node is COUPLE_W+20 wide; center the actual couple within it
      posMap.set(cu.p1,     { x: cx - COUPLE_W / 2,              y: cy - NODE_H / 2 });
      posMap.set(cu.p2,     { x: cx + COUPLE_W / 2 - NODE_W,     y: cy - NODE_H / 2 });
      posMap.set(cu.unitId, { x: cx - MARRIAGE_W / 2,             y: cy - MARRIAGE_H / 2 });
    } else {
      // Dagre node is NODE_W+20 wide; center the actual card within it
      posMap.set(nodeId, { x: cx - NODE_W / 2, y: cy - NODE_H / 2 });
    }
  }

  // ── Build layout nodes ─────────────────────────────────────────────────────
  const layoutNodes: LayoutNode[] = [];

  for (const p of persons) {
    const pos = posMap.get(p.id) ?? { x: 0, y: 0 };
    layoutNodes.push({
      id: p.id, type: 'person',
      x: pos.x, y: pos.y,
      width: NODE_W, height: NODE_H,
      data: {
        person:          p,
        isSelected:      p.id === selectedId,
        isConnectSource: p.id === connectSourceId,
        familyColor:     personColor.get(p.id) ?? DEFAULT_COLOR,
      },
    });
  }

  for (const mid of Array.from(marriageSet)) {
    const pos = posMap.get(mid) ?? { x: 0, y: 0 };
    layoutNodes.push({
      id: mid, type: 'marriage',
      x: pos.x, y: pos.y,
      width: MARRIAGE_W, height: MARRIAGE_H,
      data: { color: marriageColor.get(mid) ?? DEFAULT_COLOR },
    });
  }

  // ── Build SVG edge paths ───────────────────────────────────────────────────
  const layoutEdges: LayoutEdge[] = [];
  const isSel = (id: string) => id === selectedEdgeId;

  // SPOUSE edges
  const spouseEdgeDone = new Set<string>();
  for (const r of validRels) {
    if (r.relationship_type !== 'SPOUSE') continue;
    const key = [r.person1_id, r.person2_id].sort().join('|');
    if (spouseEdgeDone.has(key)) continue;
    spouseEdgeDone.add(key);

    const mid = mId(r.person1_id, r.person2_id);
    const cu  = coupleUnits.find(c => c.unitId === mid);
    if (!cu) continue;

    const p1Pos = posMap.get(cu.p1);
    const p2Pos = posMap.get(cu.p2);
    const mPos  = posMap.get(mid);
    if (!p1Pos || !p2Pos || !mPos) continue;

    const color = personColor.get(r.person1_id) ?? DEFAULT_COLOR;
    const cy    = p1Pos.y + NODE_H / 2;
    const mCy   = mPos.y + MARRIAGE_H / 2;

    // p1 right → marriage left, marriage right → p2 left
    const path = [
      `M ${p1Pos.x + NODE_W} ${cy} L ${mPos.x} ${mCy}`,
      `M ${mPos.x + MARRIAGE_W} ${mCy} L ${p2Pos.x} ${cy}`,
    ].join(' ');

    layoutEdges.push({ id: r.id, relId: r.id, type: 'spouse', path, color, selected: isSel(r.id) });
  }

  // PARENT_CHILD edges
  for (const r of validRels) {
    if (r.relationship_type !== 'PARENT_CHILD') continue;

    const color = personColor.get(r.person1_id) ?? DEFAULT_COLOR;
    const mid   = personToMarriage.get(r.person1_id);

    let sx: number, sy: number;
    if (mid) {
      const mPos = posMap.get(mid);
      if (!mPos) continue;
      sx = mPos.x + MARRIAGE_W / 2;
      sy = mPos.y + MARRIAGE_H;
    } else {
      const pPos = posMap.get(r.person1_id);
      if (!pPos) continue;
      sx = pPos.x + NODE_W / 2;
      sy = pPos.y + NODE_H;
    }

    const tgtPos = posMap.get(r.person2_id);
    if (!tgtPos) continue;

    const tx  = tgtPos.x + NODE_W / 2;
    const ty  = tgtPos.y;
    const midY = (sy + ty) / 2;

    // Orthogonal: down → horizontal → down
    const path = `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;

    layoutEdges.push({ id: r.id, relId: r.id, type: 'parent_child', path, color, selected: isSel(r.id) });
  }

  // SIBLING edges
  for (const r of validRels) {
    if (r.relationship_type !== 'SIBLING') continue;

    const p1Pos = posMap.get(r.person1_id);
    const p2Pos = posMap.get(r.person2_id);
    if (!p1Pos || !p2Pos) continue;

    const x1 = p1Pos.x + NODE_W / 2;
    const y1 = p1Pos.y + NODE_H / 2;
    const x2 = p2Pos.x + NODE_W / 2;
    const y2 = p2Pos.y + NODE_H / 2;
    const cx = (x1 + x2) / 2;
    const cy = Math.min(y1, y2) - 40;

    layoutEdges.push({
      id: r.id, relId: r.id, type: 'sibling',
      path: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
      color: '#60a5fa',
      selected: isSel(r.id),
    });
  }

  return { nodes: layoutNodes, edges: layoutEdges };
}
