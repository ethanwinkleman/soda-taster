import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, CupSoda, Pencil, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGroupSodas } from '../hooks/useGroupSodas';
import { ScoreBadge } from '../components/ScoreBadge';
import { CategoryRatingRow } from '../components/CategoryRatingRow';
import { getTagLabel, SIZE_LABELS, SUGAR_LABELS, computeOverallScore } from '../utils/labels';
import type { MemberProfile } from '../types/group';
import type { CategoryRatings } from '../types/soda';

const defaultRatings: CategoryRatings = { taste: 3, sweetness: 3, carbonation: 3, aftertaste: 3, packaging: 3 };

function MemberRatingCard({ userId, member, rating, notes }: {
  userId: string;
  member: MemberProfile | undefined;
  rating: number;
  notes: string;
}) {
  const isMe = member?.user_id === userId;
  return (
    <div className="flex items-start gap-3 py-3">
      {member?.avatar_url ? (
        <img src={member.avatar_url} alt={member.display_name ?? ''} className="w-8 h-8 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {(member?.display_name ?? '?')[0].toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {member?.display_name ?? 'Member'}{isMe ? ' (you)' : ''}
          </p>
          <ScoreBadge score={rating} size="sm" />
        </div>
        {notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notes}</p>}
      </div>
    </div>
  );
}

export function GroupSodaDetailPage() {
  const { groupId, sodaId } = useParams<{ groupId: string; sodaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sodas, members, saveRating, toggleFavorite } = useGroupSodas(groupId, user?.id);

  const soda = sodas.find((s) => s.id === sodaId);
  const [editing, setEditing] = useState(false);
  const [ratings, setRatings] = useState<CategoryRatings>(soda?.myRating?.ratings ?? defaultRatings);
  const [notes, setNotes] = useState(soda?.myRating?.notes ?? '');
  const [saving, setSaving] = useState(false);

  if (!soda) return (
    <div className="max-w-2xl mx-auto px-4 py-6 text-center py-20 text-gray-400">Soda not found.</div>
  );

  const isFavoritedByMe = soda.favoritedBy.includes(user?.id ?? '');
  const favMembers = members.filter((m) => soda.favoritedBy.includes(m.user_id));

  async function handleSaveRating() {
    if (!sodaId) return;
    setSaving(true);
    const overall_score = computeOverallScore(ratings);
    await saveRating(sodaId, { ratings, overall_score, notes });
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button type="button" onClick={() => navigate(`/groups/${groupId}`)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>

      {/* Photo */}
      {soda.photo ? (
        <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden mb-5 bg-gray-100 dark:bg-gray-800">
          <img src={soda.photo} alt={soda.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-[3/4] rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900 dark:to-indigo-900 flex items-center justify-center mb-5">
          <CupSoda size={72} className="text-sky-300/50" />
        </div>
      )}

      {/* Title + avg score */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{soda.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">{soda.brand}</p>
          {soda.flavor && <p className="text-sm text-gray-400 mt-0.5">{soda.flavor}</p>}
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          {soda.avgScore !== null ? (
            <>
              <ScoreBadge score={soda.avgScore} size="lg" />
              <span className="text-xs text-gray-400">avg</span>
            </>
          ) : (
            <span className="text-sm text-gray-400">Not rated</span>
          )}
        </div>
      </div>

      {/* Tags + meta */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium">
          {SIZE_LABELS[soda.size as keyof typeof SIZE_LABELS]}
        </span>
        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium">
          {SUGAR_LABELS[soda.sugar_type as keyof typeof SUGAR_LABELS]}
        </span>
        {soda.tags.map((tag) => (
          <span key={tag} className="px-3 py-1 bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-full text-xs font-medium">
            {getTagLabel(tag)}
          </span>
        ))}
      </div>

      {/* Favorited by */}
      <div className="flex items-center gap-2 mb-5">
        <button
          type="button"
          onClick={() => toggleFavorite(soda.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium transition-colors hover:border-red-300"
        >
          <Heart size={15} className={isFavoritedByMe ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
          {isFavoritedByMe ? 'Favorited' : 'Favorite'}
        </button>
        {favMembers.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              {favMembers.map((m) => (
                m.avatar_url
                  ? <img key={m.user_id} src={m.avatar_url} alt={m.display_name ?? ''} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 object-cover" />
                  : <div key={m.user_id} className="w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-gray-900">{(m.display_name ?? '?')[0].toUpperCase()}</div>
              ))}
            </div>
            <span className="text-xs text-gray-400">favorited</span>
          </div>
        )}
      </div>

      {/* Your rating */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {soda.myRating ? 'Your Rating' : 'Rate This Soda'}
          </h2>
          {soda.myRating && !editing && (
            <button type="button" onClick={() => { setEditing(true); setRatings(soda.myRating!.ratings); setNotes(soda.myRating!.notes); }} className="flex items-center gap-1 text-xs text-sky-500 hover:underline">
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>

        {!editing && soda.myRating ? (
          <div>
            {(['taste', 'sweetness', 'carbonation', 'aftertaste', 'packaging'] as const).map((key) => (
              <CategoryRatingRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={soda.myRating!.ratings[key]} readOnly />
            ))}
            {soda.myRating.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">"{soda.myRating.notes}"</p>}
          </div>
        ) : (
          <div>
            {(['taste', 'sweetness', 'carbonation', 'aftertaste', 'packaging'] as const).map((key) => (
              <CategoryRatingRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={ratings[key]} onChange={(v) => setRatings((p) => ({ ...p, [key]: v }))} />
            ))}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notes (optional)…"
              className="w-full mt-3 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
            <div className="flex gap-2 mt-3">
              {editing && <button type="button" onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>}
              <button type="button" onClick={handleSaveRating} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors">
                <Check size={15} /> {saving ? 'Saving…' : 'Save Rating'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* All member ratings */}
      {soda.memberRatings.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            All Ratings ({soda.memberRatings.length})
          </h2>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {soda.memberRatings.map((r) => (
              <MemberRatingCard
                key={r.user_id}
                userId={user?.id ?? ''}
                member={members.find((m) => m.user_id === r.user_id)}
                rating={r.overall_score}
                notes={r.notes}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
