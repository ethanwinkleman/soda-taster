import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Users, Copy, Check, ChevronRight } from 'lucide-react';
import type { Group } from '../types/group';
import { useGroups } from '../hooks/useGroups';
import { useAuth } from '../contexts/AuthContext';

function JoinCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-mono font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
    >
      {code}
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
    </button>
  );
}

export function GroupsPage() {
  const { user } = useAuth();
  const { groups, loading, createGroup, joinGroup } = useGroups(user?.id);
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newGroup, setNewGroup] = useState<Group | null>(null);

  async function handleCreate() {
    if (!groupName.trim()) return;
    setSaving(true); setError(null);
    const { group, error: err } = await createGroup(groupName.trim());
    setSaving(false);
    if (err) { setError(err); return; }
    setGroupName('');
    setShowCreate(false);
    setNewGroup(group);
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setSaving(true); setError(null);
    const err = await joinGroup(joinCode.trim());
    setSaving(false);
    if (err) { setError(err); return; }
    setJoinCode('');
    setShowJoin(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Groups</h1>
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
            <Plus size={16} /> Create
          </button>
        </div>
      </div>

      {/* Create group form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">New Group</h2>
          <input
            autoFocus
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Group name (e.g. The Fam)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400 mb-3"
          />
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>
            <button type="button" onClick={handleCreate} disabled={saving || !groupName.trim()} className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Join group form */}
      {showJoin && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Join a Group</h2>
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

      {/* New group join code banner */}
      {newGroup && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Group created!</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-500 mb-2">Share this code with others so they can join:</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-bold tracking-widest text-emerald-700 dark:text-emerald-300">{newGroup.join_code}</span>
            <JoinCodeBadge code={newGroup.join_code} />
          </div>
          <button type="button" onClick={() => setNewGroup(null)} className="mt-3 text-xs text-emerald-500 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Groups list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20">
          <Users size={64} className="text-sky-300/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No groups yet</h2>
          <p className="text-gray-500 dark:text-gray-400">Create one or join with a code from a friend.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {group.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{group.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <JoinCodeBadge code={group.join_code} />
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
