import { useNavigate } from 'react-router-dom';
import { CupSoda, Heart } from 'lucide-react';
import type { GroupSodaWithData, MemberProfile } from '../types/group';
import { ScoreBadge } from './ScoreBadge';
import { getTagLabel, SIZE_LABELS, SUGAR_LABELS } from '../utils/labels';

interface Props {
  soda: GroupSodaWithData;
  members: MemberProfile[];
  userId: string;
  groupId: string;
  onToggleFavorite: (sodaId: string) => void;
}

function MemberAvatar({ member, size = 6 }: { member: MemberProfile; size?: number }) {
  const initials = (member.display_name ?? '?')[0].toUpperCase();
  const px = `w-${size} h-${size}`;
  return member.avatar_url ? (
    <img src={member.avatar_url} alt={member.display_name ?? ''} className={`${px} rounded-full object-cover border-2 border-white dark:border-gray-800`} />
  ) : (
    <div className={`${px} rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-gray-800`}>
      {initials}
    </div>
  );
}

export function GroupSodaCard({ soda, members, userId, groupId, onToggleFavorite }: Props) {
  const navigate = useNavigate();
  const isFavoritedByMe = soda.favoritedBy.includes(userId);
  const favMembers = members.filter((m) => soda.favoritedBy.includes(m.user_id));
  const ratingCount = soda.memberRatings.length;

  const image = soda.photo ? (
    <img src={soda.photo} alt={soda.name} className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900 dark:to-indigo-900 flex items-center justify-center">
      <CupSoda size={36} className="text-sky-300/60" />
    </div>
  );

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-row sm:flex-col"
      onClick={() => navigate(`/groups/${groupId}/soda/${soda.id}`)}
    >
      {/* Content */}
      <div className="flex-1 p-4 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate text-base">{soda.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{soda.brand}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(soda.id); }}
                className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                aria-label={isFavoritedByMe ? 'Unfavorite' : 'Favorite'}
              >
                <Heart size={18} className={isFavoritedByMe ? 'fill-red-500 text-red-500' : ''} />
              </button>
              {soda.avgScore !== null
                ? <ScoreBadge score={soda.avgScore} size="sm" />
                : <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Not rated</span>
              }
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {soda.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs rounded-full font-medium">
                {getTagLabel(tag)}
              </span>
            ))}
            <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full">
              {SIZE_LABELS[soda.size as keyof typeof SIZE_LABELS]}
            </span>
            <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full">
              {SUGAR_LABELS[soda.sugar_type as keyof typeof SUGAR_LABELS]}
            </span>
          </div>
        </div>

        {/* Footer: ratings count + favorites */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {ratingCount === 0 ? 'No ratings yet' : `${ratingCount} rating${ratingCount !== 1 ? 's' : ''}`}
          </span>
          {favMembers.length > 0 && (
            <div className="flex -space-x-1.5">
              {favMembers.slice(0, 3).map((m) => (
                <MemberAvatar key={m.user_id} member={m} size={5} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image */}
      <div className="w-28 shrink-0 sm:w-full sm:aspect-[3/4] sm:order-first overflow-hidden">
        {image}
      </div>
    </div>
  );
}
