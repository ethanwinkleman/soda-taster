import { useState } from 'react';
import { ShoppingCart, Copy, Check, Refrigerator } from 'lucide-react';
import { toast } from 'sonner';
import type { Soda } from '../types/stash';
import { Modal, Button } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  stashName: string;
  sodas: Soda[];
}

function stars(score: number) {
  return '★'.repeat(score) + '☆'.repeat(5 - score);
}

export function ShoppingListModal({ open, onClose, stashName, sodas }: Props) {
  const [copied, setCopied] = useState(false);

  const items = sodas
    .filter((s) => !s.inFridge && (s.myRating?.score ?? 0) >= 4)
    .sort((a, b) => (b.myRating?.score ?? 0) - (a.myRating?.score ?? 0));

  function buildText() {
    const date = new Date().toLocaleDateString(undefined, {
      month: 'long', day: 'numeric', year: 'numeric',
    });
    const rows = items.map((s) => {
      const label = s.brand ? `${s.name} (${s.brand})` : s.name;
      return `${stars(s.myRating!.score)}  ${label}`;
    });
    return [
      `Shopping List — ${stashName}`,
      date,
      '',
      ...rows,
      '',
      `${items.length} item${items.length !== 1 ? 's' : ''} · Soda Taster`,
    ].join('\n');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true);
      toast.success('Shopping list copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="sheet"
      title={
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-sky-500 dark:text-sky-400" />
          <h2 className="font-display font-bold text-gray-900 dark:text-white">Shopping List</h2>
          {items.length > 0 && (
            <span className="font-sans text-xs text-gray-400 dark:text-gray-500">
              {items.length} {items.length === 1 ? 'item' : 'items'} to buy
            </span>
          )}
        </div>
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <Refrigerator size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="font-display font-bold text-gray-800 dark:text-gray-200 mb-1">
            Fridge fully stocked!
          </p>
          <p className="font-sans text-sm text-gray-400 dark:text-gray-500">
            You have all your favorite sodas on hand.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {items.map((soda) => (
              <div key={soda.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {soda.name}
                  </p>
                  {soda.brand && (
                    <p className="font-sans text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {soda.brand}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 text-sm text-amber-400 tracking-tight"
                  aria-label={`${soda.myRating!.score} out of 5 stars`}
                >
                  {stars(soda.myRating!.score)}
                </span>
              </div>
            ))}
          </div>

          <div className="px-4 pt-3 pb-2 border-t border-gray-200 dark:border-gray-700">
            <Button size="md" onClick={handleCopy} className="w-full">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
