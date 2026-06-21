'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Family } from '@/types';

function LoginModal({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === 'nasab') { onSuccess(); }
    else { setError(true); setPw(''); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-6 shadow-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <h2 className="text-lg font-semibold mb-1">Login</h2>
        <p className="text-sm text-gray-400 mb-5">Enter password to manage families.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input ref={inputRef} type="password" value={pw}
            onChange={e => { setPw(e.target.value); setError(false); }}
            placeholder="Password"
            className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
          />
          {error && <p className="text-xs text-red-500">Incorrect password.</p>}
          <button type="submit"
            className="w-full py-3 border-2 border-gray-900 rounded-full font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition-colors">
            Login
          </button>
          <button type="button" onClick={onCancel}
            className="w-full py-3 border border-gray-200 rounded-full font-semibold text-gray-400 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateFamilyModal({ onSubmit, onCancel }: { onSubmit: (name: string, description: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-6 shadow-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <h2 className="text-lg font-semibold mb-1">New Family</h2>
        <p className="text-sm text-gray-400 mb-5">Create a new family tree.</p>
        <div className="space-y-3 mb-4">
          <input ref={inputRef} type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Family name *"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="space-y-2">
          <button onClick={() => name.trim() && onSubmit(name.trim(), description.trim())} disabled={!name.trim()}
            className="w-full py-3 border-2 border-gray-900 rounded-full font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Create
          </button>
          <button onClick={onCancel}
            className="w-full py-3 border border-gray-200 rounded-full font-semibold text-gray-400 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FamilyList() {
  const router = useRouter();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMenuPopup, setShowMenuPopup] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoggedIn(localStorage.getItem('hana_logged_in') === 'true');
    }
  }, []);

  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const timeout = setTimeout(() => { setLoading(false); setLoadError(true); }, 8000);
    try {
      const res = await fetch('/api/families');
      const data = await res.json();
      setFamilies(Array.isArray(data) ? data : []);
    } catch {
      setLoadError(true);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFamilies(); }, [fetchFamilies]);

  const handleCreate = async (name: string, description: string) => {
    setShowCreateModal(false);
    const res = await fetch('/api/families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) {
      const family = await res.json();
      router.push(`/family/${family.id}`);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    localStorage.setItem('hana_logged_in', 'true');
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('hana_logged_in');
    setShowMenuPopup(false);
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white shadow-sm z-10 flex-shrink-0">
        <div className="w-9 h-9" />
        <h1 className="text-lg font-bold tracking-wide">HANA</h1>
        <div className="relative">
          <button
            onClick={() => {
              if (isLoggedIn) setShowMenuPopup(v => !v);
              else setShowLoginModal(true);
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            {isLoggedIn ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
          {showMenuPopup && isLoggedIn && (
            <div className="absolute right-0 top-11 bg-white border border-gray-200 rounded-2xl shadow-lg py-1 min-w-[140px] z-20">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-400">Logged in</p>
              </div>
              <button onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors rounded-b-2xl">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full overflow-y-auto" onClick={() => setShowMenuPopup(false)}
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <p className="text-sm text-gray-500">Could not connect to server.</p>
            <button onClick={fetchFamilies}
              className="px-5 py-2 border-2 border-gray-900 rounded-full text-sm font-semibold hover:bg-gray-900 hover:text-white transition-colors">
              Retry
            </button>
          </div>
        ) : families.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-300" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-700 mb-1">No families yet</h2>
            <p className="text-sm text-gray-400 mb-4">Create the first family tree.</p>
            {isLoggedIn && (
              <button onClick={() => setShowCreateModal(true)}
                className="px-6 py-2.5 border-2 border-gray-900 rounded-full text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition-colors">
                New Family
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Families</h2>
              {isLoggedIn && (
                <button onClick={() => setShowCreateModal(true)}
                  className="px-4 py-1.5 border-2 border-gray-900 rounded-full text-xs font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition-colors">
                  + New
                </button>
              )}
            </div>
            {families.map(family => (
              <button key={family.id} onClick={() => router.push(`/family/${family.id}`)}
                className="w-full text-left bg-white rounded-2xl border border-gray-200 px-5 py-4 hover:border-gray-400 hover:shadow-sm transition-all active:scale-[0.99]">
                <p className="font-semibold text-gray-900">{family.name}</p>
                {family.description && (
                  <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{family.description}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {showLoginModal && (
        <LoginModal onSuccess={handleLoginSuccess} onCancel={() => setShowLoginModal(false)} />
      )}
      {showCreateModal && (
        <CreateFamilyModal onSubmit={handleCreate} onCancel={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
