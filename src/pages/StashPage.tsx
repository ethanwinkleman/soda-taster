import { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import {
  Plus, Settings, Copy, Check, Trash2, UserMinus, LogOut,
  ChevronLeft, Search, CupSoda, X,
} from 'lucide-react';
import type { Stash, StashMember, SortOption } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';
import { useStashSodas } from '../hooks/useStashSodas';
import { SodaCard } from '../components/SodaCard';

interface Props {
  stashes: Stash[];
  onRename: (id: string, name: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onLeave: (id: string) => void;
  getMembers: (stashId: string) => Promise<StashMember[]>;
  removeMember: (stashId: string, userId: string) => Promise<void>;
}

export function StashPage({ stashes, onRename, onDelete, onLeave, getMembers, removeMember }: Props) {
  const { id: stashId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const stash = stashes.find((s) => s.id === stashId);
  const isOwner = stash?.ownerId === user?.id;

  const { sodas, loading } = useStashSodas(stashId, user?.id);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [members, setMembers] = useState<StashMember[]>([]);
  const [renameVal, setRenameVal] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    if (stash) setRenameVal(stash.name);
  }, [stash?.name]);

  useEffect(() => {
    if (settingsOpen && stashId) {
      getMembers(stashId).then(setMembers);
    }
  }, [settingsOpen, stashId]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!stashId || !renameVal.trim()) return;
    setRenaming(true);
    const err = await onRename(stashId, renameVal.trim());
    setRenaming(false);
    if (err) setSettingsError(err);
  }

  async function handleDelete() {
    if (!stashId || !confirm(`Delete "${stash?.name}"? This cannot be undone.`)) return;
    const err = await onDelete(stashId);
    if (err) { setSettingsError(err); return; }
    navigate('/', { replace: true });
  }

  function handleLeave() {
    if (!stashId || !confirm(`Leave "${stash?.name}"?`)) return;
    onLeave(stashId);
    navigate('/', { replace: true });
  }

  async function handleRemoveMember(memberId: string) {
    if (!stashId || !confirm('Remove this member from the stash?')) return;
    await removeMember(stashId, memberId);
    setMembers((prev) => prev.filter((m) => m.userId !== memberId));
  }

  function copyCode() {
    if (!stash) return;
    navigator.clipboard.writeText(stash.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyLink() {
    if (!stash) return;
    navigator.clipboard.writeText(`${window.location.origin}/join/${stash.joinCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const filtered = sodas.filter((s) =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.brand.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'highest') return (b.avgScore ?? -1) - (a.avgScore ?? -1);
    if (sort === 'lowest') return (a.avgScore ?? 999) - (b.avgScore ?? 999);
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (!stash) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400 dark:text-gray-500">Stash not found.</p>
        <NavLink to="/" className="mt-4 inline-block text-sky-500 text-sm">← Back to stashes</NavLink>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-white truncate">{stash.name}</h1>
        <button
          type="button"
          onClick={() => navigate(`/stash/${stashId}/add`)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors shrink-0"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Add Soda</span>
        </button>
        <button
          type="button"
          onClick={() => { setSettingsOpen(true); setSettingsError(null); }}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          aria-label="Stash settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Search + sort */}
      <div className="flex gap-2 mb-5">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sodas…"
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest rated</option>
          <option value="lowest">Lowest rated</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* Soda list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <CupSoda size={48} className="mx-auto mb-4 text-gray-200 dark:text-gray-700" />
          {search ? (
            <p className="text-gray-500 dark:text-gray-400">No sodas match "{search}"</p>
          ) : (
            <>
              <p className="text-gray-500 dark:text-gray-400 mb-2">No sodas yet</p>
              <button
                type="button"
                onClick={() => navigate(`/stash/${stashId}/add`)}
                className="mt-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Add the first soda
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((soda) => (
            <SodaCard key={soda.id} soda={soda} stashId={stashId!} />
          ))}
        </div>
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={() => setSettingsOpen(false)}
        >
          <div className="flex min-h-full items-center justify-center p-6">
            <div
              className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-bold text-gray-900 dark:text-white">Stash Settings</h2>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-5 space-y-5">
                {/* Rename — owner only (STH-03) */}
                {isOwner && (
                  <form onSubmit={handleRename}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                    <div className="flex gap-2">
                      <input
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                      <button
                        type="submit"
                        disabled={renaming || !renameVal.trim()}
                        className="px-3 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        {renaming ? '…' : 'Save'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Invite code (SHR-01) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Invite Code</label>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5">
                    <span className="flex-1 font-mono text-xl tracking-widest text-gray-900 dark:text-gray-100">
                      {stash.joinCode}
                    </span>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="text-sky-500 hover:text-sky-600 transition-colors"
                      title="Copy code"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="mt-1.5 text-xs text-sky-500 hover:text-sky-600 transition-colors"
                  >
                    Copy invite link
                  </button>
                </div>

                {/* Members (SHR-05) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Members</label>
                  <div className="space-y-1">
                    {members.map((m) => (
                      <div key={m.userId} className="flex items-center gap-2 py-1.5">
                        <div className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {(m.displayName ?? '?')[0].toUpperCase()}
                        </div>
                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 truncate">
                          {m.displayName ?? 'Unknown'}
                          {m.userId === stash.ownerId && (
                            <span className="ml-1.5 text-xs text-gray-400">owner</span>
                          )}
                        </span>
                        {isOwner && m.userId !== user?.id && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.userId)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Remove member"
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    {members.length === 0 && (
                      <p className="text-sm text-gray-400 dark:text-gray-500">Loading members…</p>
                    )}
                  </div>
                </div>

                {settingsError && <p className="text-sm text-red-500">{settingsError}</p>}

                {/* Danger zone */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 size={15} />
                      Delete Stash
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLeave}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                      <LogOut size={15} />
                      Leave Stash
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
