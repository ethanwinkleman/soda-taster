import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, Trash2, Pencil, ChevronLeft, Calendar, Beaker, CupSoda, Copy, Check, X } from 'lucide-react';
import type { SodaEntry } from '../types/soda';
import { ScoreBadge } from '../components/ScoreBadge';
import { SodaRadarChart } from '../components/SodaRadarChart';
import { CategoryRatingRow } from '../components/CategoryRatingRow';
import { getTagLabel, SUGAR_LABELS, SIZE_LABELS } from '../utils/labels';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../hooks/useGroups';
import { supabase } from '../lib/supabase';

interface Props {
  sodas: SodaEntry[];
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SodaDetailPage({ sodas, onToggleFavorite, onDelete }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const soda = sodas.find((s) => s.id === id);

  const { user } = useAuth();
  const { groups, loading: groupsLoading } = useGroups(user?.id);
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [copying, setCopying] = useState<string | null>(null); // groupId being copied to
  const [copied, setCopied] = useState<string | null>(null);   // groupId just copied to

  if (!soda) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Soda not found.</p>
        <button
          type="button"
          onClick={() => navigate('/sodas')}
          className="mt-4 text-sky-500 hover:underline text-sm"
        >
          Go back home
        </button>
      </div>
    );
  }

  function handleDelete() {
    if (confirm(`Delete "${soda!.name}"? This can't be undone.`)) {
      onDelete(soda!.id);
      navigate('/sodas');
    }
  }

  async function handleCopyToGroup(groupId: string) {
    if (!soda || !user || copying) return;
    setCopying(groupId);

    const { data: sodaRow } = await supabase
      .from('group_sodas')
      .insert({
        group_id: groupId,
        created_by: user.id,
        name: soda.name,
        brand: soda.brand,
        flavor: soda.flavor,
        sugar_type: soda.sugarType,
        size: soda.size,
        tags: soda.tags,
        photo: soda.photo,
      })
      .select()
      .single();

    if (sodaRow) {
      await supabase.from('group_soda_ratings').insert({
        group_soda_id: sodaRow.id,
        user_id: user.id,
        ratings: soda.ratings,
        overall_score: soda.overallScore,
        notes: soda.notes,
      });
    }

    setCopying(null);
    setCopied(groupId);
    setTimeout(() => {
      setCopied(null);
      setShowCopyPicker(false);
      navigate(`/groups/${groupId}`);
    }, 800);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCopyPicker((v) => !v)}
            className={`p-2 rounded-lg transition-colors ${
              showCopyPicker
                ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500'
            }`}
            aria-label="Copy to group"
            title="Copy to group"
          >
            <Copy size={18} />
          </button>
          <button
            type="button"
            onClick={() => onToggleFavorite(soda.id)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={soda.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              size={20}
              className={soda.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
            />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/edit/${soda.id}`)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            aria-label="Edit"
          >
            <Pencil size={18} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-500 dark:text-gray-400 hover:text-red-500"
            aria-label="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Copy to group picker */}
      {showCopyPicker && (
        <div className="mb-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Copy to Group</p>
            <button type="button" onClick={() => setShowCopyPicker(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <X size={16} />
            </button>
          </div>
          {groupsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              Loading groups…
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">You haven't joined any groups yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const isCopying = copying === g.id;
                const isCopied = copied === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleCopyToGroup(g.id)}
                    disabled={!!copying}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-60 ${
                      isCopied
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-sky-400 hover:text-sky-500'
                    }`}
                  >
                    {isCopied ? <Check size={13} /> : isCopying ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    {g.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Hero image / placeholder */}
      {soda.photo ? (
        <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden mb-5 bg-gray-100 dark:bg-gray-800">
          <img src={soda.photo} alt={soda.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-[3/4] rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900 dark:to-indigo-900 flex items-center justify-center mb-5">
          <CupSoda size={72} className="text-sky-300/50" />
        </div>
      )}

      {/* Title + score */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{soda.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">{soda.brand}</p>
          {soda.flavor && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{soda.flavor}</p>
          )}
        </div>
        <ScoreBadge score={soda.overallScore} size="lg" />
      </div>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium flex items-center gap-1">
          <Beaker size={12} /> {SIZE_LABELS[soda.size]}
        </span>
        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium">
          {SUGAR_LABELS[soda.sugarType]}
        </span>
        {soda.tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-full text-xs font-medium"
          >
            {getTagLabel(tag)}
          </span>
        ))}
        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs flex items-center gap-1">
          <Calendar size={12} /> {new Date(soda.dateRated).toLocaleDateString()}
        </span>
      </div>

      {/* Ratings breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Ratings Breakdown
        </h2>
        <CategoryRatingRow label="Taste" value={soda.ratings.taste} readOnly />
        <CategoryRatingRow label="Sweetness" value={soda.ratings.sweetness} readOnly />
        <CategoryRatingRow label="Carbonation" value={soda.ratings.carbonation} readOnly />
        <CategoryRatingRow label="Aftertaste" value={soda.ratings.aftertaste} readOnly />
        <CategoryRatingRow label="Packaging" value={soda.ratings.packaging} readOnly />
      </div>

      {/* Radar chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Flavor Profile
        </h2>
        <SodaRadarChart ratings={soda.ratings} />
      </div>

      {/* Notes */}
      {soda.notes && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{soda.notes}</p>
        </div>
      )}
    </div>
  );
}
