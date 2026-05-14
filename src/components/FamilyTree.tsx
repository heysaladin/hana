'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildFamilyLayout } from '@/lib/familyLayout';
import FamilyTreeCanvas from './FamilyTreeCanvas';
import PersonDetails from './PersonDetails';
import PersonForm from './PersonForm';
import { Person, Relationship, PersonFormData, RelationshipType } from '@/types';

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
          {RELATION_OPTIONS.map(opt => (
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

export default function FamilyTree() {
  const [persons,       setPersons]       = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [panel,         setPanel]         = useState<'none' | 'details' | 'form-create' | 'form-edit'>('none');
  const [loading,       setLoading]       = useState(true);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [showSearch,    setShowSearch]    = useState(false);

  // Connect mode
  const [connectMode,     setConnectMode]     = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [connectTargetId, setConnectTargetId] = useState<string | null>(null);
  const [showRelPicker,   setShowRelPicker]   = useState(false);

  // Selected edge (relationship)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const selectedPerson = persons.find(p => p.id === selectedId);
  const connectSrc     = persons.find(p => p.id === connectSourceId);
  const connectTgt     = persons.find(p => p.id === connectTargetId);

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

  const filteredPersons = useMemo(() => {
    if (!searchQuery) return persons;
    const q = searchQuery.toLowerCase();
    return persons.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.nickname?.toLowerCase().includes(q),
    );
  }, [persons, searchQuery]);

  const { nodes, edges } = useMemo(() =>
    buildFamilyLayout(filteredPersons, relationships, selectedId ?? undefined, connectSourceId ?? undefined, selectedEdgeId ?? undefined),
    [filteredPersons, relationships, selectedId, connectSourceId, selectedEdgeId],
  );

  const handleNodeClick = useCallback((id: string) => {
    setSelectedEdgeId(null);
    if (connectMode) {
      if (!connectSourceId || id === connectSourceId) return;
      setConnectTargetId(id);
      setShowRelPicker(true);
      return;
    }
    setSelectedId(prev => prev === id ? null : id);
    setPanel('none');
  }, [connectMode, connectSourceId]);

  const handleEdgeClick = useCallback((relId: string) => {
    setSelectedId(null);
    setPanel('none');
    setSelectedEdgeId(prev => prev === relId ? null : relId);
  }, []);

  const handlePaneClick = useCallback(() => {
    if (connectMode) return;
    setSelectedId(null);
    setSelectedEdgeId(null);
    setPanel('none');
  }, [connectMode]);

  const postRelationship = async (p1: string, p2: string, type: RelationshipType) => {
    await fetch('/api/relationships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person1_id: p1, person2_id: p2, relationship_type: type }),
    });
  };

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

  const confirmConnect = async (type: RelationshipType) => {
    if (!connectSourceId || !connectTargetId) return;
    await postRelationship(connectSourceId, connectTargetId, type);
    cancelConnectMode();
    await fetchData();
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

      <div className="flex-1 relative overflow-hidden">
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
          <FamilyTreeCanvas
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
          />
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
              <button onClick={() => setSelectedEdgeId(null)}
                className="px-4 py-2 border border-gray-200 rounded-full text-sm text-gray-400 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDeleteRelationship(selectedEdgeId)}
                className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-semibold hover:bg-red-600 transition-colors">
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

      {panel === 'details' && selectedPerson && (
        <PersonDetails
          person={selectedPerson}
          persons={persons}
          relationships={relationships.filter(
            r => r.person1_id === selectedPerson.id || r.person2_id === selectedPerson.id,
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
