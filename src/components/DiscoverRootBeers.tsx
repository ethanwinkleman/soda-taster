import { Compass, ExternalLink } from 'lucide-react';
import type { Soda } from '../types/stash';
import { Modal } from './ui';
import { notePreferences } from '../lib/flavorNotes';
import { recommendSodas, RETAILERS, searchQuery } from '../lib/rootBeerCatalog';

interface Props {
  open: boolean;
  onClose: () => void;
  sodas: Soda[];
}

/**
 * What to buy next.
 *
 * Built from *your own* ratings and the notes on them — not the group's. The group's
 * opinion of a soda is not evidence about your palate, and half of it may be sealed
 * from you anyway.
 *
 * Every recommendation shows the notes it matched on, because an unexplained
 * recommendation is indistinguishable from a guess. If the reason looks wrong, it is
 * wrong, and you can see that at a glance.
 */
export function DiscoverRootBeers({ open, onClose, sodas }: Props) {
  const rated = sodas
    .filter((s) => s.myRating !== null)
    .map((s) => ({
      name: s.name,
      brand: s.brand,
      score: s.myRating!.score,
      notes: s.myRating!.notes,
    }));

  const preferences = notePreferences(rated);
  const recommendations = recommendSodas(preferences, sodas, 6);
  const topNotes = preferences.filter((p) => p.avg >= 3.5).slice(0, 3);

  return (
    <Modal open={open} onClose={onClose} title="Find more root beers">
      {rated.length < 2 ? (
        <div className="text-center py-8 px-4">
          <Compass size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-display text-gray-600 dark:text-gray-300 mb-1">Rate a couple more first.</p>
          <p className="font-sans text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            Recommendations come from your own ratings and the notes you leave on them.
            One soda is not a palate.
          </p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-8 px-4">
          <Compass size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-display text-gray-600 dark:text-gray-300 mb-1">Nothing new to suggest.</p>
          <p className="font-sans text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            Either you already have everything on the shelf, or there is not a clear
            enough pattern in what you rate well yet. Leaving tasting notes when you
            rate sharpens this a lot.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {topNotes.length > 0 && (
            <p className="font-sans text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              You score{' '}
              {topNotes.map((n, i) => (
                <span key={n.id}>
                  {i > 0 && (i === topNotes.length - 1 ? ' and ' : ', ')}
                  <span className="font-bold text-gray-700 dark:text-gray-200">{n.label}</span>
                  <span className="tabular-nums text-gray-400 dark:text-gray-500"> {n.avg}</span>
                </span>
              ))}
              . These match.
            </p>
          )}

          {recommendations.map(({ soda, matched }) => (
            <div
              key={`${soda.brand}-${soda.name}`}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5"
            >
              <p className="font-display font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {soda.name}
              </p>
              <p className="font-sans text-xs text-gray-500 dark:text-gray-400 italic mb-2">
                {soda.brand}
              </p>
              <p className="font-sans text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-2.5">
                {soda.blurb}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {matched.map((m) => (
                  <span
                    key={m.id}
                    className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 font-sans text-[11px] text-sky-700 dark:text-sky-300"
                  >
                    {m.label}
                    <span className="ml-1 tabular-nums opacity-60">{m.avg}</span>
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {RETAILERS.map((r) => (
                  <a
                    key={r.name}
                    href={r.search(searchQuery(soda))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-600 font-sans text-[11px] text-gray-600 dark:text-gray-300 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                  >
                    {r.name}
                    <ExternalLink size={9} />
                  </a>
                ))}
              </div>
            </div>
          ))}

          <p className="font-sans text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed pt-1">
            Links run a plain search on each retailer — no prices or stock are checked,
            and nothing here is an affiliate link.
          </p>
        </div>
      )}
    </Modal>
  );
}
