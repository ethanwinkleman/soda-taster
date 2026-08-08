import { useState } from 'react';
import { ShoppingCart, Copy, Check, Refrigerator, Plus, Minus, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { Soda } from '../types/stash';
import { Modal, Button } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  stashName: string;
  sodas: Soda[];
}

// Scores come in 0.5 steps, so a half rating gets its own glyph and the row
// always occupies five positions.
function stars(score: number) {
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}

function csvCell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fileStem(stashName: string) {
  return stashName.replace(/[^a-z0-9]/gi, '_');
}

/**
 * Out of stock, or down to the last one. A soda can sit in the fridge at quantity 0
 * (SodaDetailPage lets you decrement to zero without clearing the in-fridge flag),
 * which counts as out rather than low.
 */
function stockState(s: Soda): 'out' | 'low' | 'stocked' {
  if (!s.inFridge || s.quantity === 0) return 'out';
  if (s.quantity <= LOW_STOCK) return 'low';
  return 'stocked';
}

const LOW_STOCK = 1;

export function ShoppingListModal({ open, onClose, stashName, sodas }: Props) {
  const [copied, setCopied] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Worth buying (rated 4+) and either gone or down to the last bottle.
  const items = sodas
    .filter((s) => (s.myRating?.score ?? 0) >= 4 && stockState(s) !== 'stocked')
    .sort((a, b) => (b.myRating?.score ?? 0) - (a.myRating?.score ?? 0));

  const lowCount = items.filter((s) => stockState(s) === 'low').length;

  const qtyOf = (id: string) => quantities[id] ?? 1;
  const totalUnits = items.reduce((sum, s) => sum + qtyOf(s.id), 0);

  function bump(id: string, delta: number) {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.min(99, Math.max(1, (prev[id] ?? 1) + delta)),
    }));
  }

  function label(soda: Soda) {
    return soda.brand ? `${soda.name} (${soda.brand})` : soda.name;
  }

  function buildText() {
    const date = new Date().toLocaleDateString(undefined, {
      month: 'long', day: 'numeric', year: 'numeric',
    });
    const rows = items.map((s) => {
      const qty = qtyOf(s.id);
      // Only annotate the running-low ones; "gone" is the default assumption for a shopping list.
      const low = stockState(s) === 'low' ? '  (1 left)' : '';
      return `${stars(s.myRating!.score)}  ${label(s)}${low}${qty > 1 ? `  ×${qty}` : ''}`;
    });
    return [
      `Shopping List — ${stashName}`,
      date,
      '',
      ...rows,
      '',
      `${items.length} item${items.length !== 1 ? 's' : ''}` +
        (totalUnits !== items.length ? ` · ${totalUnits} units` : '') +
        ' · Soda Taster',
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

  function handleDownloadCsv() {
    const header = ['Name', 'Brand', 'My Rating', 'Stock', 'Quantity'];
    const rows = items.map((s) => [
      csvCell(s.name),
      csvCell(s.brand),
      csvCell(s.myRating!.score),
      csvCell(stockState(s) === 'low' ? '1 left' : 'Out of stock'),
      csvCell(qtyOf(s.id)),
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileStem(stashName)}_shopping_list.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded.');
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
              {lowCount > 0 ? ` · ${lowCount} running low` : ''}
              {totalUnits !== items.length ? ` · ${totalUnits} units` : ''}
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
                  <span className="flex items-center gap-2 mt-0.5">
                    <span
                      className="font-sans text-sm text-amber-400 tracking-tight"
                      aria-label={`${soda.myRating!.score} out of 5 stars`}
                    >
                      {stars(soda.myRating!.score)}
                    </span>
                    <span
                      className={`font-sans text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                        stockState(soda) === 'low'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      {stockState(soda) === 'low' ? '1 left' : 'Out'}
                    </span>
                  </span>
                </div>

                {/* Quantity to buy */}
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => bump(soda.id, -1)}
                    disabled={qtyOf(soda.id) <= 1}
                    aria-label={`Buy one fewer ${soda.name}`}
                    className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center font-sans text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                    {qtyOf(soda.id)}
                  </span>
                  <button
                    type="button"
                    onClick={() => bump(soda.id, 1)}
                    aria-label={`Buy one more ${soda.name}`}
                    className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 pt-3 pb-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <Button size="md" onClick={handleCopy} className="w-full">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
            <Button variant="secondary" size="md" onClick={handleDownloadCsv} className="w-full">
              <Download size={14} />
              Download as CSV
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
