import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, ChevronRight, Lock, Users } from 'lucide-react';
import type { Group } from '../types/group';
import { useGroups } from '../hooks/useGroups';
import { useAuth } from '../contexts/AuthContext';
import { useSodas } from '../hooks/useSodas';

export function GroupsPage() {
  const { user } = useAuth();
  const { groups, loading, createGroup, joinGroup } = useGroups(user?.id);
  const { sodas } = useSodas(user?.id);
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin,   setShowJoin]   = useState(false);
  const [stashName,  setStashName]  = useState('');
  const [joinCode,   setJoinCode]   = useState('');
  const [error,      setError]      = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [newGroup,   setNewGroup]   = useState<Group | null>(null);

  async function handleCreate() {
    if (!stashName.trim()) return;
    setSaving(true); setError(null);
    const { group, error: err } = await createGroup(stashName.trim());
    setSaving(false);
    if (err) { setError(err); return; }
    setStashName('');
    setShowCreate(false);
    setNewGroup(group);
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setSaving(true); setError(null);
    const { groupId, error: err } = await joinGroup(joinCode.trim());
    setSaving(false);
    if (err) { setError(err); return; }
    setJoinCode('');
    setShowJoin(false);
    if (groupId) navigate(`/groups/${groupId}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stashes</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowJoin(true); setShowCreate(false); setError(null); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <LogIn size={16} /> Join
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(true); setShowJoin(false); setError(null); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> New Stash
          </button>
        </div>
      </div>

      {/* Create stash form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">New Shared Stash</h2>
          <input
            autoFocus
            value={stashName}
            onChange={(e) => setStashName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Stash name (e.g. The Fam)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400 mb-3"
          />
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>
            <button type="button" onClick={handleCreate} disabled={saving || !stashName.trim()} className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Join stash form */}
      {showJoin && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Join a Stash</h2>
          <input
            autoFocus
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="Enter 6-character code"
            maxLength={6}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-base text-center font-mono tracking-widest text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400 mb-3"
          />
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowJoin(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>
            <button type="button" onClick={handleJoin} disabled={saving || joinCode.length !== 6} className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
              {saving ? 'Joining…' : 'Join'}
            </button>
          </div>
        </div>
      )}

      {/* New stash invite code banner */}
      {newGroup && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Stash created!</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-500 mb-2">Share this code so others can join:</p>
          <p className="text-2xl font-mono font-bold tracking-widest text-emerald-700 dark:text-emerald-300">{newGroup.join_code}</p>
          <button type="button" onClick={() => setNewGroup(null)} className="mt-3 text-xs text-emerald-500 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Unified stash list */}
      <div className="space-y-3">

        {/* My Stash — always at top */}
        <StashCard
          icon={<Lock size={18} className="text-white" />}
          avatarClass="bg-gradient-to-br from-gray-400 to-gray-600"
          title="My Stash"
          meta={`${sodas.length} ${sodas.length === 1 ? 'soda' : 'sodas'} · Private`}
          badge={<span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400"><Lock size={10} /> Private</span>}
          onClick={() => navigate('/sodas')}
        />

        {/* Shared stashes */}
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-10">
            <Users size={40} className="text-sky-300/50 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No shared stashes yet.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Create one or join with a friend's code.</p>
          </div>
        ) : (
          groups.map((group) => (
            <StashCard
              key={group.id}
              icon={<span className="text-white font-bold text-lg">{group.name[0].toUpperCase()}</span>}
              avatarClass="bg-gradient-to-br from-sky-400 to-indigo-500"
              title={group.name}
              meta="Shared stash"
              badge={<span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/30 text-xs text-sky-600 dark:text-sky-400"><Users size={10} /> Shared</span>}
              onClick={() => navigate(`/groups/${group.id}`)}
            />
          ))
        )}
      </div>

      {/* Add stash CTA when list is empty */}
      {!loading && groups.length === 0 && (
        <button
          type="button"
          onClick={() => { setShowCreate(true); setShowJoin(false); setError(null); }}
          className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-sky-200 dark:border-sky-800 text-sky-500 dark:text-sky-400 font-medium text-sm hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
        >
          <Plus size={16} /> Create a shared stash
        </button>
      )}
    </div>
  );
}

// ── Shared card component ────────────────────────────────────────────────────
function StashCard({
  icon,
  avatarClass,
  title,
  meta,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  avatarClass: string;
  title: string;
  meta: string;
  badge: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${avatarClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {badge}
          <span className="text-xs text-gray-400 dark:text-gray-500">{meta}</span>
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-400 shrink-0" />
    </div>
  );
}

