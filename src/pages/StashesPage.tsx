import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Layers, Users } from 'lucide-react';
import type { Stash } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  stashes: Stash[];
  onCreate: (name: string) => Promise<{ stash: Stash | null; error: string | null }>;
  onJoin: (code: string) => Promise<{ stashId: string | null; error: string | null }>;
}

export function StashesPage({ stashes, onCreate, onJoin }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    const { stash, error: err } = await onCreate(newName.trim());
    setBusy(false);
    if (err) { setError(err); return; }
    setNewName('');
    setCreating(false);
    if (stash) navigate(`/stash/${stash.id}`);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setBusy(true);
    setError(null);
    const { stashId, error: err } = await onJoin(joinCode.trim());
    setBusy(false);
    if (err) { setError(err); return; }
    setJoinCode('');
    setJoining(false);
    if (stashId) navigate(`/stash/${stashId}`);
  }

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Page masthead */}
      <div className="mb-8">
        <div className="border-t-2 border-gray-800 dark:border-gray-200 mb-1" />
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-display text-3xl font-black italic text-gray-900 dark:text-white tracking-tight">
            My Collections
          </h1>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { setJoining(true); setCreating(false); setError(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-700 dark:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <LogIn size={13} />
              Join
            </button>
            <button
              type="button"
              onClick={() => { setCreating(true); setJoining(false); setError(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium uppercase tracking-wider text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
            >
              <Plus size={13} />
              New
            </button>
          </div>
        </div>
        {firstName && (
          <p className="text-xs font-sans text-gray-500 dark:text-gray-400 mt-0.5 italic">
            {firstName}'s soda records
          </p>
        )}
        <div className="border-b border-gray-400 dark:border-gray-600 mt-1.5" />
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-5">
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1">
            — New Collection —
          </p>
          <form onSubmit={handleCreate}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-700 dark:focus:border-gray-300 mb-3 font-sans text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 py-2 font-sans text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !newName.trim()}
                className="flex-1 py-2 font-sans text-xs font-medium uppercase tracking-wider text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-40 transition-colors"
              >
                {busy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join form */}
      {joining && (
        <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-5">
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1">
            — Join a Collection —
          </p>
          <p className="text-xs font-sans text-gray-400 dark:text-gray-500 mb-3 italic">
            Enter the 6-character invite code
          </p>
          <form onSubmit={handleJoin}>
            <input
              autoFocus
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="XXXXXX"
              maxLength={6}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-700 dark:focus:border-gray-300 mb-3 font-mono tracking-[0.4em] text-center text-xl uppercase"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setJoining(false)}
                className="flex-1 py-2 font-sans text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || joinCode.length < 4}
                className="flex-1 py-2 font-sans text-xs font-medium uppercase tracking-wider text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-40 transition-colors"
              >
                {busy ? 'Joining…' : 'Join'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400 font-sans italic">{error}</p>
      )}

      {/* Stash list */}
      {stashes.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-300 dark:border-gray-700">
          <Layers size={40} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
          <p className="font-display italic text-gray-500 dark:text-gray-400">No collections yet</p>
          <p className="text-xs font-sans text-gray-400 dark:text-gray-500 mt-1">Create one to begin tracking sodas</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-b border-gray-300 dark:border-gray-600">
          {stashes.map((stash) => (
            <button
              key={stash.id}
              type="button"
              onClick={() => navigate(`/stash/${stash.id}`)}
              className="w-full text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-4 flex items-center gap-3"
            >
              <span className="w-10 h-10 border-2 border-gray-700 dark:border-gray-300 flex items-center justify-center text-gray-700 dark:text-gray-200 text-base font-black shrink-0 font-display">
                {stash.name[0]?.toUpperCase() ?? '?'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-gray-900 dark:text-white truncate">{stash.name}</p>
                <p className="text-[10px] font-sans text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5 uppercase tracking-wide">
                  <Users size={10} />
                  {stash.ownerId === user?.id ? 'Proprietor' : 'Member'}
                </p>
              </div>
              <span className="text-gray-300 dark:text-gray-600 font-sans">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
