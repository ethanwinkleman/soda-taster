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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stashes</h1>
          {firstName && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{firstName}'s collections</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setJoining(true); setCreating(false); setError(null); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <LogIn size={15} />
            Join
          </button>
          <button
            type="button"
            onClick={() => { setCreating(true); setJoining(false); setError(null); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors"
          >
            <Plus size={15} />
            New Stash
          </button>
        </div>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">New Stash</h2>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Stash name"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400 mb-3"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {joining && (
        <form onSubmit={handleJoin} className="mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Join a Stash</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">Enter the 6-character invite code</p>
          <input
            autoFocus
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="XXXXXX"
            maxLength={6}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400 mb-3 font-mono tracking-widest text-center text-xl uppercase"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setJoining(false)}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || joinCode.length < 4}
              className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {busy ? 'Joining…' : 'Join'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mb-4 text-sm text-red-500 dark:text-red-400">{error}</p>}

      {stashes.length === 0 ? (
        <div className="text-center py-20">
          <Layers size={48} className="mx-auto mb-4 text-gray-200 dark:text-gray-700" />
          <p className="text-gray-500 dark:text-gray-400 mb-1">No stashes yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Create one to start tracking sodas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stashes.map((stash) => (
            <button
              key={stash.id}
              type="button"
              onClick={() => navigate(`/stash/${stash.id}`)}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-base font-bold shrink-0">
                  {stash.name[0]?.toUpperCase() ?? '?'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{stash.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                    <Users size={11} />
                    {stash.ownerId === user?.id ? 'Owner' : 'Member'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
