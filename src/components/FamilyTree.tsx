'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
  Connection,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PersonNode from './PersonNode';
import MarriageNode from './nodes/MarriageNode';
import PersonDetails from './PersonDetails';
import PersonForm from './PersonForm';
import CoupleEdge, { CoupleEdgeType } from './edges/CoupleEdge';
import FamilyEdge, { FamilyEdgeType } from './edges/FamilyEdge';
import ArcEdge, { ArcEdgeType } from './edges/ArcEdge';
import { buildFamilyLayout } from '@/lib/familyLayout';
import { useAutoLayout } from '@/hooks/useAutoLayout';
import { Person, Relationship, PersonFormData, RelationshipType } from '@/types';

const nodeTypes: NodeTypes = { person: PersonNode, marriage: MarriageNode };
const edgeTypes: EdgeTypes = {
  [CoupleEdgeType]: CoupleEdge,   // 'spouseEdge'
  [FamilyEdgeType]: FamilyEdge,   // 'familyEdge'
  [ArcEdgeType]:    ArcEdge,      // 'arcEdge'
};

const RELATION_OPTIONS: { value: RelationshipType; label: string; desc: string; color: string }[] = [
  { value: 'PARENT_CHILD', label: 'Parent → Child', desc: 'First selected is the parent', color: '#6b7280' },
  { value: 'SPOUSE',       label: 'Spouse',          desc: 'Husband & Wife / Partner',    color: '#f59e0b' },
  { value: 'SIBLING',      label: 'Sibling',          desc: 'Brother / Sister',             color: '#60a5fa' },
];

function RelPickerModal({
  title, subtitle, onConfirm, onCancel,
}: {
  title: string; subtitle: string;
  onConfirm: (t: RelationshipType) => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <p className="text-sm text-gray-400 mb-5">{subtitle}</p>
        <div className="space-y-2 mb-4">
          {RELATION_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => onConfirm(opt.value)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors text-left">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={onCancel}
          className="w-full py-3 border border-gray-200 rounded-full text-sm font-semibold text-gray-400 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function FamilyTreeInner() {
  const { screenToFlowPosition } = useReactFlow();

  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'none' | 'details' | 'form-create' | 'form-edit'>('none');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Button connect mode
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [connectTargetId, setConnectTargetId] = useState<string | null>(null);
  const [showRelPicker, setShowRelPicker] = useState(false);

  // Selected edge (connection line)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);



  // Drag handle → existing node
  const [pendingEdge, setPendingEdge] = useState<{ p1: string; p2: string } | null>(null);

  // Drag handle → empty space → create person
  const [pendingDrop, setPendingDrop] = useState<{
    sourceId: string;
    position: { x: number; y: number };
    relType: RelationshipType | null;
  } | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useAutoLayout(nodes, edges);

  const selectedPerson    = persons.find(p => p.id === selectedId);
  const connectSrc        = persons.find(p => p.id === connectSourceId);
  const connectTgt        = persons.find(p => p.id === connectTargetId);
  const pendingEdgeP1     = persons.find(p => p.id === pendingEdge?.p1);
  const pendingEdgeP2     = persons.find(p => p.id === pendingEdge?.p2);
  const pendingDropSrc    = persons.find(p => p.id === pendingDrop?.sourceId);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, rRes] = await Promise.all([fetch('/api/persons'), fetch('/api/relationships')]);
      const [pData, rData] = await Promise.all([pRes.json(), rRes.json()]);
      setPersons(Array.isArray(pData) ? pData : []);
      setRelationships(Array.isArray(rData) ? rData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const filtered = searchQuery
      ? persons.filter(p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
      : persons;

    const { nodes: n, edges: e } = buildFamilyLayout(
      filtered, relationships,
      selectedId ?? undefined,
      connectSourceId ?? undefined,
      selectedEdgeId ?? undefined,
    );
    setNodes(n);
    setEdges(e);
  }, [persons, relationships, selectedId, connectSourceId, searchQuery, selectedEdgeId, setNodes, setEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'marriage') return;   // marriage nodes are not interactive
    setSelectedEdgeId(null);
    if (connectMode) {
      if (!connectSourceId || node.id === connectSourceId) return;
      setConnectTargetId(node.id);
      setShowRelPicker(true);
      return;
    }
    setSelectedId(prev => prev === node.id ? null : node.id);
    setPanel('none');
  }, [connectMode, connectSourceId]);

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    // Spouse edges come in pairs (_p1 / _p2); strip suffix to get the real rel id
    const relId = edge.id.replace(/_p[12]$/, '');
    setSelectedId(null);
    setPanel('none');
    setSelectedEdgeId(prev => prev === relId ? null : relId);
  }, []);

  const handlePaneClick = useCallback(() => {
    if (connectMode || pendingEdge || pendingDrop) return;
    setSelectedId(null);
    setSelectedEdgeId(null);
    setPanel('none');
  }, [connectMode, pendingEdge, pendingDrop]);

  const onConnect = useCallback((connection: Connection) => {
    const src = connection.source ?? '';
    const tgt = connection.target ?? '';
    if (src.startsWith('M_') || tgt.startsWith('M_')) return;
    if (src && tgt && src !== tgt) setPendingEdge({ p1: src, p2: tgt });
  }, []);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, connectionState: any) => {
    if (connectionState?.fromNode?.type === 'marriage') return;
    if (connectionState?.isValid === false && connectionState?.fromNode) {
      const { clientX, clientY } = 'changedTouches' in event
        ? (event as TouchEvent).changedTouches[0]
        : (event as MouseEvent);
      const position = screenToFlowPosition({ x: clientX, y: clientY });
      setPendingDrop({ sourceId: connectionState.fromNode.id, position, relType: null });
    }
  }, [screenToFlowPosition]);

  const enterConnectMode = () => {
    if (!selectedId) return;
    setConnectSourceId(selectedId);
    setSelectedId(null);
    setPanel('none');
    setConnectMode(true);
  };

  const cancelConnectMode = () => {
    setConnectMode(false);
    setConnectSourceId(null);
    setConnectTargetId(null);
    setShowRelPicker(false);
  };

  const postRelationship = async (p1: string, p2: string, type: RelationshipType) => {
    await fetch('/api/relationships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person1_id: p1, person2_id: p2, relationship_type: type }),
    });
  };

  const confirmConnect = async (type: RelationshipType) => {
    if (!connectSourceId || !connectTargetId) return;
    await postRelationship(connectSourceId, connectTargetId, type);
    cancelConnectMode();
    await fetchData();
  };

  const handlePendingEdgeConfirm = async (type: RelationshipType) => {
    if (!pendingEdge) return;
    await postRelationship(pendingEdge.p1, pendingEdge.p2, type);
    setPendingEdge(null);
    await fetchData();
  };

  const handleDropRelType = (type: RelationshipType) => {
    setPendingDrop(prev => prev ? { ...prev, relType: type } : null);
  };

  const handleCreateFromDrop = async (data: PersonFormData) => {
    if (!pendingDrop?.relType) return;
    const res = await fetch('/api/persons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const newPerson = await res.json();
      await postRelationship(pendingDrop.sourceId, newPerson.id, pendingDrop.relType);
      setPendingDrop(null);
      await fetchData();
    }
  };

  const handleDeleteRelationship = async (id: string) => {
    await fetch(`/api/relationships/${id}`, { method: 'DELETE' });
    setSelectedEdgeId(null);
    await fetchData();
  };

  const handleCreate = async (data: PersonFormData) => {
    const res = await fetch('/api/persons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) { await fetchData(); setPanel('none'); }
  };

  const handleUpdate = async (data: PersonFormData) => {
    if (!selectedId) return;
    const res = await fetch(`/api/persons/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) { await fetchData(); setPanel('none'); }
  };

  const handleDelete = async () => {
    if (!selectedId || !confirm('Delete this person and all their relationships?')) return;
    await fetch(`/api/persons/${selectedId}`, { method: 'DELETE' });
    setSelectedId(null);
    setPanel('none');
    await fetchData();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading family tree...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white shadow-sm z-10 flex-shrink-0">
        <button onClick={() => setShowSearch(v => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-wide">HANA</h1>
        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {showSearch && (
        <div className="px-4 py-2 bg-white border-b border-gray-100 z-10">
          <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
      )}

      {connectMode && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-600 text-white z-10 flex-shrink-0">
          <span className="text-sm font-medium">
            Tap a person to connect with <strong>{connectSrc?.name}</strong>
          </span>
          <button onClick={cancelConnectMode} className="text-white/80 hover:text-white text-sm underline">
            Cancel
          </button>
        </div>
      )}

      <div className="flex-1 relative">
        {persons.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-gray-300" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Start your family tree</h2>
            <p className="text-sm text-gray-400 mb-6">Add the first person to begin.</p>
            <button onClick={() => setPanel('form-create')}
              className="px-6 py-3 border-2 border-gray-900 rounded-full font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition-colors">
              Add First Person
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onEdgeClick={handleEdgeClick}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            minZoom={0.1}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={true}
            connectOnClick={false}
            elementsSelectable={true}
            elevateEdgesOnSelect={true}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
            <Controls showInteractive={false} className="!shadow-none !border !border-gray-200 !rounded-xl overflow-hidden" />
            <MiniMap
              nodeColor={(node: any) => node.data?.familyColor ?? '#6b7280'}
              nodeStrokeWidth={2}
              pannable
              zoomable
              className="!rounded-xl !shadow-sm !border !border-gray-200"
            />
          </ReactFlow>
        )}
      </div>

      {/* Edge selected — delete bar */}
      {selectedEdgeId && !connectMode && (
        <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 z-10">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 rounded-full bg-red-400" />
              <span className="text-sm text-gray-600 font-medium">Connection selected</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedEdgeId(null)}
                className="px-4 py-2 border border-gray-200 rounded-full text-sm text-gray-400 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRelationship(selectedEdgeId)}
                className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {persons.length > 0 && !connectMode && !selectedEdgeId && (
        <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 z-10">
          <div className="flex flex-col gap-2 max-w-sm mx-auto">
            <div className="flex gap-2">
              <button onClick={() => selectedPerson && setPanel('details')} disabled={!selectedId}
                className="flex-1 py-2.5 border-2 border-gray-900 rounded-full text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Details
              </button>
              <button onClick={() => setPanel('form-create')}
                className="flex-1 py-2.5 border-2 border-gray-900 rounded-full text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                Add
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={enterConnectMode} disabled={!selectedId}
                className="flex-1 py-2.5 border-2 border-blue-500 rounded-full text-sm font-semibold text-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Connect
              </button>
              <button onClick={() => selectedPerson && setPanel('form-edit')} disabled={!selectedId}
                className="flex-1 py-2.5 border border-gray-300 rounded-full text-sm font-semibold text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Edit
              </button>
              <button onClick={handleDelete} disabled={!selectedId}
                className="flex-1 py-2.5 border border-gray-300 rounded-full text-sm font-semibold text-gray-400 hover:bg-red-50 hover:text-red-400 hover:border-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showRelPicker && connectSrc && connectTgt && (
        <RelPickerModal title="Set Relationship"
          subtitle={`${connectSrc.name}  &  ${connectTgt.name}`}
          onConfirm={confirmConnect} onCancel={cancelConnectMode} />
      )}

      {pendingEdge && pendingEdgeP1 && pendingEdgeP2 && (
        <RelPickerModal title="Set Relationship"
          subtitle={`${pendingEdgeP1.name}  &  ${pendingEdgeP2.name}`}
          onConfirm={handlePendingEdgeConfirm} onCancel={() => setPendingEdge(null)} />
      )}

      {pendingDrop && !pendingDrop.relType && pendingDropSrc && (
        <RelPickerModal title="Add New Person"
          subtitle={`Connected from ${pendingDropSrc.name} — choose relationship`}
          onConfirm={handleDropRelType} onCancel={() => setPendingDrop(null)} />
      )}

      {pendingDrop?.relType && (
        <PersonForm mode="create" onSubmit={handleCreateFromDrop}
          onCancel={() => setPendingDrop(null)} />
      )}

      {panel === 'details' && selectedPerson && (
        <PersonDetails
          person={selectedPerson}
          persons={persons}
          relationships={relationships.filter(
            r => r.person1_id === selectedPerson.id || r.person2_id === selectedPerson.id
          )}
          onClose={() => setPanel('none')}
          onEdit={() => setPanel('form-edit')}
          onDelete={handleDelete}
          onDeleteRelationship={handleDeleteRelationship}
        />
      )}

      {panel === 'form-create' && (
        <PersonForm mode="create" persons={persons} onSubmit={handleCreate} onCancel={() => setPanel('none')} />
      )}

      {panel === 'form-edit' && selectedPerson && (
        <PersonForm mode="edit" person={selectedPerson} onSubmit={handleUpdate} onCancel={() => setPanel('none')} />
      )}
    </div>
  );
}

export default function FamilyTree() {
  return (
    <ReactFlowProvider>
      <FamilyTreeInner />
    </ReactFlowProvider>
  );
}
