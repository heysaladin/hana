'use client';
import { useEffect } from 'react';
import { useReactFlow, useNodesInitialized, Node, Edge } from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { NODE_W, NODE_H, MARRIAGE_W, MARRIAGE_H } from '@/lib/familyLayout';
import { Person } from '@/types';

// ── Singleton ELK instance ─────────────────────────────────────────────────
const elk = new ELK();

// ── ELK layout options ─────────────────────────────────────────────────────
const ELK_OPTIONS: Record<string, string> = {
  'elk.algorithm':                                     'layered',
  'elk.direction':                                     'DOWN',
  'elk.spacing.nodeNode':                              '80',
  'elk.layered.spacing.nodeNodeBetweenLayers':         '160',
  'elk.layered.nodePlacement.strategy':                'BRANDES_KOEPF',
  'elk.layered.crossingMinimization.strategy':         'LAYER_SWEEP',
  'elk.edgeRouting':                                   'ORTHOGONAL',
  // Respect the order of nodes/edges we feed in — this is what makes
  // order_index control left-to-right sibling position.
  'elk.layered.considerModelOrder.strategy':           'NODES_AND_EDGES',
};

// Width of a couple unit (person + marriage node + person)
const COUPLE_W = NODE_W * 2 + MARRIAGE_W + 60;

// ── Order-index helpers ────────────────────────────────────────────────────
/**
 * Comparator: higher order_index → earlier (left) in ELK input.
 * birth_date ascending is the tiebreaker (older sibling = left).
 */
function byOrder(a: Person, b: Person): number {
  const ia = a.order_index ?? 0;
  const ib = b.order_index ?? 0;
  if (ia !== ib) return ib - ia;                   // higher index = first
  const da = a.birth_date ?? '';
  const db = b.birth_date ?? '';
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da < db ? -1 : da > db ? 1 : 0;          // older born = first
}

// ── Core ELK layout function ───────────────────────────────────────────────
async function runELKLayout(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  if (nodes.length === 0) return nodes;

  // ── Person metadata map (id → Person) ────────────────────────────────────
  const personData = new Map<string, Person>();
  for (const node of nodes) {
    if (node.type === 'person' && node.data?.person) {
      personData.set(node.id, node.data.person as Person);
    }
  }

  // ── Detect couple units from spouseEdge connections ───────────────────────
  // spouseEdge: source = person, target = marriage node ('M_…')
  // _p1 edge is pushed before _p2 in buildFamilyLayout, so
  // persons[0] = person1 (left side) and persons[1] = person2 (right side).
  const marriageToPersons = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type === 'spouseEdge' && edge.target.startsWith('M_')) {
      const list = marriageToPersons.get(edge.target) ?? [];
      list.push(edge.source);
      marriageToPersons.set(edge.target, list);
    }
  }

  type CoupleUnit = { unitId: string; p1: string; p2: string; order: number };
  const coupleUnits: CoupleUnit[] = [];
  const personInCouple = new Set<string>();

  marriageToPersons.forEach((persons, mid) => {
    if (persons.length === 2) {
      const [p1, p2] = persons;
      const o1 = personData.get(p1)?.order_index ?? 0;
      const o2 = personData.get(p2)?.order_index ?? 0;
      coupleUnits.push({ unitId: mid, p1, p2, order: Math.max(o1, o2) });
      personInCouple.add(p1);
      personInCouple.add(p2);
    }
  });

  // ── Helper: order value for any ELK node id ───────────────────────────────
  function elkNodeOrder(id: string): number {
    const cu = coupleUnits.find(c => c.unitId === id);
    if (cu) return cu.order;
    return personData.get(id)?.order_index ?? 0;
  }

  // ── ELK nodes — sorted so higher order_index nodes come first (leftmost) ──
  const soloPersons = nodes.filter(
    n => n.type === 'person' && !personInCouple.has(n.id),
  );

  const elkCoupleChildren = coupleUnits
    .slice()
    .sort((a, b) => {
      const pa = personData.get(a.p1) ?? personData.get(a.p2) ?? {} as Person;
      const pb = personData.get(b.p1) ?? personData.get(b.p2) ?? {} as Person;
      return byOrder(pa, pb);
    })
    .map(cu => ({ id: cu.unitId, width: COUPLE_W, height: NODE_H }));

  const elkSoloChildren = soloPersons
    .slice()
    .sort((a, b) => {
      const pa = personData.get(a.id) ?? {} as Person;
      const pb = personData.get(b.id) ?? {} as Person;
      return byOrder(pa, pb);
    })
    .map(n => ({ id: n.id, width: NODE_W, height: NODE_H }));

  const elkChildren = [...elkCoupleChildren, ...elkSoloChildren];
  if (elkChildren.length === 0) return nodes;

  // ── ELK edges — only familyEdge (parent→child) drives the hierarchy ───────
  // spouseEdge and smoothstep (sibling) are excluded.
  // Edges for children of the same parent are sorted by child order_index so
  // ELK places higher-index children leftmost.
  const rawEdges: { srcId: string; tgtId: string; origTgtOrder: number }[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    if (edge.type === 'spouseEdge') continue;
    if (edge.type === 'smoothstep')  continue;
    if (edge.target.startsWith('M_')) continue;

    let srcId = edge.source;
    let tgtId = edge.target;

    if (!srcId.startsWith('M_')) {
      const cu = coupleUnits.find(c => c.p1 === srcId || c.p2 === srcId);
      if (cu) srcId = cu.unitId;
    }
    const cuTgt = coupleUnits.find(c => c.p1 === tgtId || c.p2 === tgtId);
    if (cuTgt) tgtId = cuTgt.unitId;

    if (srcId === tgtId) continue;
    const key = `${srcId}→${tgtId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rawEdges.push({ srcId, tgtId, origTgtOrder: elkNodeOrder(tgtId) });
  }

  // Sort: group by parent, then by child order_index descending (higher = left)
  rawEdges.sort((a, b) => {
    if (a.srcId !== b.srcId) return 0; // different parents — preserve relative order
    return b.origTgtOrder - a.origTgtOrder;
  });

  const elkEdges = rawEdges.map(({ srcId, tgtId }) => ({
    id:      `e_${srcId}→${tgtId}`,
    sources: [srcId],
    targets: [tgtId],
  }));

  // ── Run ELK ───────────────────────────────────────────────────────────────
  try {
    const graph = await elk.layout({
      id: 'root',
      layoutOptions: ELK_OPTIONS,
      children: elkChildren,
      edges:    elkEdges,
    });

    // ── Map ELK positions back to individual React Flow nodes ───────────────
    const posMap = new Map<string, { x: number; y: number }>();

    for (const elkNode of graph.children ?? []) {
      const nx = elkNode.x ?? 0;
      const ny = elkNode.y ?? 0;
      const nw = elkNode.width ?? NODE_W;

      const cu = coupleUnits.find(c => c.unitId === elkNode.id);
      if (cu) {
        posMap.set(cu.p1,     { x: nx,                        y: ny });
        posMap.set(cu.p2,     { x: nx + nw - NODE_W,          y: ny });
        posMap.set(cu.unitId, {
          x: nx + nw / 2 - MARRIAGE_W / 2,
          y: ny + (NODE_H - MARRIAGE_H) / 2,
        });
      } else {
        posMap.set(elkNode.id, { x: nx, y: ny });
      }
    }

    return nodes.map(node => ({
      ...node,
      position: posMap.get(node.id) ?? node.position,
    }));
  } catch (err) {
    console.error('[useAutoLayout] ELK layout failed:', err);
    return nodes;
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────
/**
 * Automatically lays out the family-tree graph using ELK whenever the
 * node/edge structure changes, then fits the viewport.
 *
 * Child order is controlled by each Person's order_index field
 * (higher = leftmost). birth_date is the tiebreaker.
 */
export function useAutoLayout(nodes: Node[], edges: Edge[]) {
  const { setNodes, fitView } = useReactFlow();
  const nodesInitialized      = useNodesInitialized();

  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;

    runELKLayout(nodes, edges).then(layoutedNodes => {
      setNodes(layoutedNodes);
      requestAnimationFrame(() => {
        fitView({ duration: 400, padding: 0.25 });
      });
    });
  // Re-run only when structure changes (count), not on every position update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesInitialized, nodes.length, edges.length, setNodes, fitView]);

  return () => requestAnimationFrame(() => fitView({ duration: 400, padding: 0.25 }));
}
