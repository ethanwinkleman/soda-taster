import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Copy, Check, Users, Package, CupSoda, Minus, Trash2, Link } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../hooks/useGroups';
import { useGroupSodas } from '../hooks/useGroupSodas';
import { useGroupInventory } from '../hooks/useGroupInventory';
import { GroupSodaCard } from '../components/GroupSodaCard';
import type { MemberProfile } from '../types/group';

function MemberAvatar({ member }: { member: MemberProfile }) {
  return member.avatar_url ? (
    <img src={member.avatar_url} alt={member.display_name ?? ''} className="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-gray-900" title={member.display_name ?? ''} />
  ) : (
    <div className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-gray-900" title={member.display_name ?? ''}>
      {(member.display_name ?? '?')[0].toUpperCase()}
    </div>
  );
}

export function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups } = useGroups(user?.id);
  const { sodas, members, loading: sodasLoading, toggleFavorite } = useGroupSodas(id, user?.id);
  const { items, loading: invLoading, addItem, setQuantity, removeItem } = useGroupInventory(id, user?.id);

  const [tab, setTab] = useState<'sodas' | 'inventory'>('sodas');
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [invInput, setInvInput] = useState('');

  const group = groups.find((g) => g.id === id);
  if (!group && !sodasLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-6 text-center py-20 text-gray-400">Group not found.</div>
  );

  function copyCode() {
    if (group) { navigator.clipboard.writeText(group.join_code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }
  }

  function copyLink() {
    if (group) {
      navigator.clipboard.writeText(`${window.location.origin}/join/${group.join_code}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  function handleInvAdd() {
    const name = invInput.trim();
    if (!name) return;
    addItem(name);
    setInvInput('');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <button type="button" onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors">
        <ChevronLeft size={16} /> Home
      </button>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{group?.name}</h1>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <button type="button" onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title="Copy join code">
            {group?.join_code}
            {codeCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
          <button type="button" onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors" title="Copy invite link">
            {linkCopied ? <Check size={12} className="text-emerald-500" /> : <Link size={12} />}
            {linkCopied ? 'Copied!' : 'Invite'}
          </button>
        </div>
      </div>

      {/* Members */}
      {members.length > 0 && (
        <div className="flex items-center gap-1.5 mb-5">
          <div className="flex -space-x-1.5">
            {members.slice(0, 6).map((m) => <MemberAvatar key={m.user_id} member={m} />)}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5">
        {(['sodas', 'inventory'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t === 'sodas' ? <CupSoda size={15} /> : <Package size={15} />}
            {t === 'sodas' ? 'Sodas' : 'Fridge'}
          </button>
        ))}
      </div>

      {/* Sodas tab */}
      {tab === 'sodas' && (
        <>
          <button
            type="button"
            onClick={() => navigate(`/groups/${id}/add`)}
            className="w-full flex items-center justify-center gap-2 py-3 mb-5 rounded-xl border-2 border-dashed border-sky-300 dark:border-sky-700 text-sky-500 dark:text-sky-400 font-medium text-sm hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
          >
            <Plus size={18} /> Add a Soda
          </button>

          {sodasLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
          ) : sodas.length === 0 ? (
            <div className="text-center py-16">
              <CupSoda size={48} className="text-sky-300/50 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No sodas yet — add the first one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sodas.map((soda) => (
                <GroupSodaCard
                  key={soda.id}
                  soda={soda}
                  members={members}
                  userId={user?.id ?? ''}
                  groupId={id ?? ''}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Inventory tab */}
      {tab === 'inventory' && (
        <>
          <div className="flex gap-3 mb-4">
            <input
              value={invInput}
              onChange={(e) => setInvInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvAdd()}
              placeholder="Soda name…"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              type="button"
              onClick={handleInvAdd}
              disabled={!invInput.trim()}
              className="px-5 py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors shrink-0"
            >
              <Plus size={18} />
            </button>
          </div>

          {invLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Package size={48} className="text-sky-300/50 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No inventory yet.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              {items.map((item, idx) => (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx < items.length - 1 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate text-sm">{item.soda_name}</p>
                    {item.last_changed_by && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Last by {item.last_changed_by}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 0} className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:border-sky-400 hover:text-sky-500 disabled:opacity-30 transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-semibold text-gray-900 dark:text-white tabular-nums">{item.quantity}</span>
                    <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:border-sky-400 hover:text-sky-500 transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Who's doing what note */}
          {items.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
              <Users size={11} className="inline mr-1" />
              Changes are tracked per member
            </p>
          )}
        </>
      )}
    </div>
  );
}
