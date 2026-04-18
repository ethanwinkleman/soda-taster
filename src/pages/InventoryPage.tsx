import { useState, useMemo } from 'react';
import { Plus, Trash2, Minus, Package, ClipboardList, X, ShoppingCart, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SodaEntry } from '../types/soda';
import type { InventoryEntry } from '../types/inventory';
import { ScoreBadge } from '../components/ScoreBadge';

interface Props {
  items: InventoryEntry[];
  sodas: SodaEntry[];
  loading: boolean;
  onAdd: (sodaName: string, sodaId: string | null) => void;
  onSetQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onLink: (inventoryId: string, sodaId: string) => void;
  onUnlink: (inventoryId: string) => void;
}

export function InventoryPage({
  items, sodas, loading, onAdd, onSetQuantity, onRemove, onLink, onUnlink,
}: Props) {
  const navigate = useNavigate();
  const [inputName, setInputName] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState('');

  function handleAdd() {
    const name = inputName.trim();
    if (!name) return;
    onAdd(name, null);
    setInputName('');
  }

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const inStockCount = items.filter((i) => i.quantity > 0).length;

  // Favorited sodas that are at 0 quantity in inventory — need restocking
  const restockReminders = useMemo(() => {
    return items.filter((item) => {
      if (item.quantity > 0) return false;
      const linked = sodas.find((s) => s.id === item.sodaId);
      return linked?.isFavorite ?? false;
    });
  }, [items, sodas]);

  const filteredSodas = linkSearch.trim().length === 0 ? [] : sodas
    .filter((s) => {
      const q = linkSearch.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q);
    })
    .slice(0, 8);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Inventory</h1>

      {/* Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Items</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">In Stock</p>
            <p className="text-2xl font-bold text-emerald-500">{inStockCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out of Stock</p>
            <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">
              {items.length - inStockCount}
            </p>
          </div>
        </div>
      )}

      {/* Restock reminders */}
      {restockReminders.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={15} className="text-red-500" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Restock Reminders
            </p>
            <span className="ml-auto text-xs text-red-400 dark:text-red-500">
              {restockReminders.length} favorite{restockReminders.length !== 1 ? 's' : ''} at 0
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {restockReminders.map((item) => {
              const soda = sodas.find((s) => s.id === item.sodaId)!;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/soda/${soda.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-red-400 transition-colors shadow-sm"
                >
                  <Heart size={12} className="fill-red-500 text-red-500" />
                  {item.sodaName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add row */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm mb-4 p-4 flex gap-3">
        <input
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Soda name…"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Package size={64} className="text-sky-300/50 mb-4 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No inventory yet</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Type a soda name above to start tracking what's in the house.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Soda</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Rating</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Qty</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {items.map((item) => {
                const linkedSoda = sodas.find((s) => s.id === item.sodaId);
                const isLinking = linkingId === item.id;

                return (
                  <tr key={item.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Name */}
                    <td className="px-4 py-3">
                      {linkedSoda ? (
                        <button type="button" onClick={() => navigate(`/soda/${linkedSoda.id}`)} className="text-left group/link">
                          <p className="font-medium text-gray-900 dark:text-white group-hover/link:text-sky-500 transition-colors">{item.sodaName}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{linkedSoda.brand}</p>
                        </button>
                      ) : (
                        <p className="font-medium text-gray-900 dark:text-white">{item.sodaName}</p>
                      )}
                    </td>

                    {/* Rating / link column */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {linkedSoda ? (
                        <div className="flex items-center gap-2">
                          <ScoreBadge score={linkedSoda.overallScore} size="sm" />
                          <button
                            type="button"
                            onClick={() => onUnlink(item.id)}
                            className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
                            title="Unlink rating"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : isLinking ? (
                        /* Inline rating picker */
                        <div className="relative">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <input
                              autoFocus
                              value={linkSearch}
                              onChange={(e) => setLinkSearch(e.target.value)}
                              placeholder="Search rated sodas…"
                              className="w-44 px-2 py-1 text-xs rounded-lg border border-sky-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
                            />
                            <button type="button" onClick={() => { setLinkingId(null); setLinkSearch(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                              <X size={13} />
                            </button>
                          </div>
                          {linkSearch.trim().length === 0 ? (
                            <div className="absolute z-30 top-full left-0 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg px-3 py-2.5">
                              <p className="text-xs text-gray-400 dark:text-gray-500">Type to search rated sodas…</p>
                            </div>
                          ) : filteredSodas.length > 0 ? (
                            <div className="absolute z-30 top-full left-0 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                              {filteredSodas.map((soda) => (
                                <button
                                  key={soda.id}
                                  type="button"
                                  onClick={() => { onLink(item.id, soda.id); setLinkingId(null); setLinkSearch(''); }}
                                  className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{soda.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{soda.brand}</p>
                                  </div>
                                  <ScoreBadge score={soda.overallScore} size="sm" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="absolute z-30 top-full left-0 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg px-3 py-2.5">
                              <p className="text-xs text-gray-400 dark:text-gray-500">No matches for "{linkSearch}".</p>
                              <button
                                type="button"
                                onClick={() => navigate(`/add?name=${encodeURIComponent(item.sodaName)}&inventoryId=${item.id}`)}
                                className="mt-1 flex items-center gap-1 text-xs text-sky-500 hover:underline"
                              >
                                <ClipboardList size={11} /> Rate "{item.sodaName}"
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setLinkingId(item.id); setLinkSearch(''); }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-sky-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
                        >
                          <ClipboardList size={12} /> Link rating
                        </button>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSetQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 0}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-sky-400 hover:text-sky-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center font-semibold text-gray-900 dark:text-white tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSetQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-sky-400 hover:text-sky-500 transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </td>

                    {/* Delete */}
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
