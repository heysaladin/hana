'use client';
import { useRef, useState, useCallback, useEffect, memo } from 'react';
import { LayoutNode, LayoutEdge, NODE_W, NODE_H, MARRIAGE_W, MARRIAGE_H } from '@/lib/familyLayout';
import { Person } from '@/types';

interface Props {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  onNodeClick:  (id: string) => void;
  onEdgeClick:  (relId: string) => void;
  onPaneClick:  () => void;
}

interface Transform { x: number; y: number; scale: number }

const ALIVE_COLOR = '#22c55e';
const DEAD_COLOR  = '#9ca3af';

function calcAge(birthDateStr: string | null): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

const PersonCard = memo(function PersonCard({ node }: { node: LayoutNode }) {
  const p          = node.data.person as Person;
  const isDead     = p.is_dead;
  const cardColor  = isDead ? DEAD_COLOR : ALIVE_COLOR;
  const isSelected = node.data.isSelected;
  const isSrc      = node.data.isConnectSource;

  let outlineColor  = isDead ? '#d1d5db' : '#bbf7d0';
  let outlineWidth  = '1px';
  let outlineOffset = '0';
  if (isSrc)           { outlineColor = '#3b82f6'; outlineWidth = '2px'; outlineOffset = '2px'; }
  else if (isSelected) { outlineColor = '#60a5fa'; outlineWidth = '2px'; outlineOffset = '2px'; }

  const age         = p.birth_date ? calcAge(p.birth_date) : p.age ?? null;
  const subParts    = [
    age !== null          ? `${age} yr`    : null,
    p.address_short || null,
  ].filter(Boolean);

  return (
    <div
      className="rounded-2xl shadow-lg overflow-hidden select-none h-full flex flex-col justify-center px-3 py-2 gap-0.5"
      style={{
        backgroundColor: isDead ? '#f3f4f6' : '#ffffff',
        outline:       `${outlineWidth} solid ${outlineColor}`,
        outlineOffset,
      }}
    >
      {/* Honorific — small, grey, above name */}
      {p.honorific && (
        <p className="text-[10px] text-gray-400 text-center leading-none truncate">{p.honorific}</p>
      )}

      {/* Nickname + gender symbol */}
      <div className="flex items-center justify-center gap-1">
        <p className="text-sm font-bold leading-tight text-center truncate"
          style={{ color: isDead ? '#6b7280' : '#111827' }}>
          {p.nickname || p.name}
        </p>
        {p.gender && (
          <span className="text-sm shrink-0" style={{ color: cardColor }}>
            {p.gender === 'MALE' ? '♂' : '♀'}
          </span>
        )}
      </div>

      {/* Age + address — only if at least one exists */}
      {subParts.length > 0 && (
        <p className="text-[10px] text-gray-400 text-center leading-none truncate">
          {subParts.join(', ')}
        </p>
      )}
    </div>
  );
});

export default function FamilyTreeCanvas({ nodes, edges, onNodeClick, onEdgeClick, onPaneClick }: Props) {
  const svgRef     = useRef<SVGSVGElement>(null);
  const [tf, setTf] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  // Pan state
  const isPanning   = useRef(false);
  const didPan      = useRef(false);
  const lastPtr     = useRef({ x: 0, y: 0 });

  // Pinch state
  const lastPinch   = useRef(0);
  const pinchMid    = useRef({ x: 0, y: 0 });

  // Auto-fit when node count changes
  const prevCount   = useRef(-1);
  useEffect(() => {
    if (nodes.length === 0 || nodes.length === prevCount.current) return;
    prevCount.current = nodes.length;

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }

    const pad = 60;
    const cw  = maxX - minX + pad * 2;
    const ch  = maxY - minY + pad * 2;
    const sc  = Math.min(rect.width / cw, rect.height / ch, 1.5);
    const x   = (rect.width  - cw * sc) / 2 - (minX - pad) * sc;
    const y   = (rect.height - ch * sc) / 2 - (minY - pad) * sc;

    setTf({ x, y, scale: sc });
  }, [nodes]);

  // ── Mouse wheel zoom ───────────────────────────────────────────────────────
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect  = svg.getBoundingClientRect();
    const mx    = e.clientX - rect.left;
    const my    = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;

    setTf(prev => {
      const sc = Math.max(0.1, Math.min(3, prev.scale * delta));
      const r  = sc / prev.scale;
      return { scale: sc, x: mx - r * (mx - prev.x), y: my - r * (my - prev.y) };
    });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  // ── Pointer pan ────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Always reset didPan so a previous pan doesn't block subsequent node clicks
    didPan.current = false;
    if ((e.target as Element).closest('[data-node]')) return;
    isPanning.current = true;
    lastPtr.current   = { x: e.clientX, y: e.clientY };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPtr.current.x;
    const dy = e.clientY - lastPtr.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) didPan.current = true;
    lastPtr.current = { x: e.clientX, y: e.clientY };
    setTf(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onPointerUp = useCallback(() => { isPanning.current = false; }, []);

  // ── Touch pinch-to-zoom ────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      lastPinch.current = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      pinchMid.current  = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const t0   = e.touches[0], t1 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const delta = lastPinch.current > 0 ? dist / lastPinch.current : 1;
    lastPinch.current = dist;

    const svg  = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx   = pinchMid.current.x - rect.left;
    const my   = pinchMid.current.y - rect.top;

    setTf(prev => {
      const sc = Math.max(0.1, Math.min(3, prev.scale * delta));
      const r  = sc / prev.scale;
      return { scale: sc, x: mx - r * (mx - prev.x), y: my - r * (my - prev.y) };
    });
  }, []);

  // ── Click on canvas background ─────────────────────────────────────────────
  const onSVGClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (didPan.current) return;
    if ((e.target as Element).closest('[data-node]')) return;
    onPaneClick();
  }, [onPaneClick]);

  // ── Zoom buttons ───────────────────────────────────────────────────────────
  const zoom = (factor: number) => {
    setTf(prev => {
      const svg  = svgRef.current;
      const rect = svg?.getBoundingClientRect();
      const mx   = (rect?.width  ?? 0) / 2;
      const my   = (rect?.height ?? 0) / 2;
      const sc   = Math.max(0.1, Math.min(3, prev.scale * factor));
      const r    = sc / prev.scale;
      return { scale: sc, x: mx - r * (mx - prev.x), y: my - r * (my - prev.y) };
    });
  };

  const fitView = () => {
    prevCount.current = -1; // force re-fit
    setTf({ x: 0, y: 0, scale: 1 }); // trigger effect
    // re-trigger auto-fit
    const svg = svgRef.current;
    if (!svg || nodes.length === 0) return;
    const rect = svg.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
    }
    const pad = 60;
    const cw = maxX - minX + pad * 2, ch = maxY - minY + pad * 2;
    const sc = Math.min(rect.width / cw, rect.height / ch, 1.5);
    setTf({ x: (rect.width - cw * sc) / 2 - (minX - pad) * sc, y: (rect.height - ch * sc) / 2 - (minY - pad) * sc, scale: sc });
  };

  const tfStr = `translate(${tf.x},${tf.y}) scale(${tf.scale})`;

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: isPanning.current ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={onSVGClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        {/* Dot grid */}
        <defs>
          <pattern id="ftdots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"
            patternTransform={`translate(${tf.x % 20},${tf.y % 20})`}>
            <circle cx="10" cy="10" r="0.8" fill="#e5e7eb" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ftdots)" />

        <g transform={tfStr}>
          {/* Edges */}
          {edges.map(edge => (
            <path
              key={edge.id}
              d={edge.path}
              fill="none"
              stroke={edge.selected ? '#ef4444' : edge.type === 'sibling' ? '#60a5fa' : edge.color}
              strokeWidth={edge.selected ? 4 : edge.type === 'spouse' ? 3 : 2}
              strokeDasharray={edge.type === 'sibling' ? '6 3' : undefined}
              data-node="edge"
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onEdgeClick(edge.relId); }}
            />
          ))}

          {/* Marriage dots */}
          {nodes.filter(n => n.type === 'marriage').map(n => (
            <circle
              key={n.id}
              cx={n.x + MARRIAGE_W / 2}
              cy={n.y + MARRIAGE_H / 2}
              r={MARRIAGE_W / 2}
              fill={n.data.color as string}
              stroke="white"
              strokeWidth="3"
            />
          ))}

          {/* Person cards */}
          {nodes.filter(n => n.type === 'person').map(n => (
            <foreignObject
              key={n.id}
              x={n.x} y={n.y}
              width={NODE_W} height={NODE_H}
              data-node="person"
              style={{ overflow: 'visible' }}
            >
              <div
                style={{ width: NODE_W, height: NODE_H, cursor: 'pointer' }}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onNodeClick(n.id); }}
              >
                <PersonCard node={n} />
              </div>
            </foreignObject>
          ))}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
        <button onClick={() => zoom(1.2)}
          className="w-9 h-9 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 font-bold text-lg flex items-center justify-center hover:bg-gray-50 active:bg-gray-100">
          +
        </button>
        <button onClick={() => zoom(0.8)}
          className="w-9 h-9 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 font-bold text-lg flex items-center justify-center hover:bg-gray-50 active:bg-gray-100">
          −
        </button>
        <button onClick={fitView}
          className="w-9 h-9 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 active:bg-gray-100"
          title="Fit view">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 8V4h4M16 4h4v4M4 16v4h4M20 16v4h-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
