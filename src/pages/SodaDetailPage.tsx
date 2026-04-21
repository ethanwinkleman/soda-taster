import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Refrigerator, Minus, Plus, Trash2, Check, X, Pencil, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStashSodas } from '../hooks/useStashSodas';
import { StarRating } from '../components/StarRating';
import { ScoreBadge } from '../components/ScoreBadge';

export function SodaDetailPage() {
  const { id: stashId, sodaId } = useParams<{ id: string; sodaId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { sodas, loading, editSoda, removeSoda, setFridgeStatus, updateSodaImage, saveRating, deleteRating } =
    useStashSodas(stashId, user?.id);

  const soda = sodas.find((s) => s.id === sodaId);

  const imgInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [ratingVal, setRatingVal] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [savingRating, setSavingRating] = useState(false);

  const displayName = (user?.user_metadata?.full_name ?? user?.email ?? 'Unknown') as string;

  // Sync ratingVal from loaded soda (once)
  useEffect(() => {
    if (!loading && soda && !initialized) {
      setRatingVal(soda.myRating?.score ?? 0);
      setInitialized(true);
    }
  }, [loading, soda, initialized]);

  function startEditing() {
    if (!soda) return;
    setEditName(soda.name);
    setEditBrand(soda.brand);
    setEditing(true);
  }

  async function handleEditSave() {
    if (!soda) return;
    await editSoda(soda.id, {
      name: editName.trim() || soda.name,
      brand: editBrand.trim(),
    });
    setEditing(false);
  }

  async function handleSaveRating() {
    if (!soda || !ratingVal) return;
    setSavingRating(true);
    await saveRating(soda.id, ratingVal, displayName);
    setSavingRating(false);
  }

  async function handleDeleteRating() {
    if (!soda?.myRating) return;
    await deleteRating(soda.myRating.id);
    setRatingVal(0);
  }

  async function handleFridgeToggle() {
    if (!soda) return;
    const newInFridge = !soda.inFridge;
    await setFridgeStatus(soda.id, newInFridge, newInFridge ? Math.max(soda.quantity, 1) : 0);
  }

  async function handleQtyChange(delta: number) {
    if (!soda) return;
    const newQty = Math.max(0, soda.quantity + delta);
    await setFridgeStatus(soda.id, soda.inFridge, newQty);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !soda) return;
    await updateSodaImage(soda.id, file);
  }

  async function handleDelete() {
    if (!soda || !confirm(`Remove "${soda.name}" from this stash?`)) return;
    await removeSoda(soda.id);
    navigate(`/stash/${stashId}`);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!soda) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-gray-400 dark:text-gray-500">Soda not found.</p>
        <button
          type="button"
          onClick={() => navigate(`/stash/${stashId}`)}
          className="mt-4 text-sky-500 text-sm"
        >
          ← Back
        </button>
      </div>
    );
  }

  const ratingChanged = ratingVal !== (soda.myRating?.score ?? 0);

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Header with inline edit */}
      <div className="flex items-start gap-2 mb-6">
        <button
          type="button"
          onClick={() => navigate(`/stash/${stashId}`)}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 mt-0.5"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Soda name"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-sky-400 rounded-xl text-lg font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <input
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
                placeholder="Brand (optional)"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{soda.name}</h1>
              {soda.brand && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{soda.brand}</p>
              )}
            </>
          )}
        </div>

        {editing ? (
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} />
            </button>
            <button
              type="button"
              onClick={handleEditSave}
              className="p-2 rounded-xl text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
            >
              <Check size={18} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            aria-label="Edit soda"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>

      {/* Photo */}
      <div className="mb-5">
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleImageChange}
        />
        {soda.imageUrl ? (
          <div className="relative rounded-2xl overflow-hidden">
            <img
              src={soda.imageUrl}
              alt={soda.name}
              className="w-full h-52 object-cover"
            />
            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              className="absolute bottom-2 right-2 p-2 bg-black/50 backdrop-blur-sm rounded-xl text-white hover:bg-black/70 transition-colors"
              aria-label="Change photo"
            >
              <Camera size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imgInputRef.current?.click()}
            className="w-full h-28 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-sky-400 hover:text-sky-400 dark:hover:border-sky-500 dark:hover:text-sky-400 transition-colors"
          >
            <Camera size={20} />
            <span className="text-sm font-medium">Add photo</span>
          </button>
        )}
      </div>

      {/* Average score (RTG-01) */}
      {soda.avgScore !== null && (
        <div className="flex items-center gap-4 mb-5 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <ScoreBadge score={soda.avgScore} size="lg" />
          <div>
            <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
              {soda.avgScore.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {soda.ratings.length} rating{soda.ratings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* My Rating (RTG-02) */}
      <div className="mb-5 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">My Rating</h2>
        <StarRating value={ratingVal} onChange={setRatingVal} size="lg" />
        <div className="flex gap-2 mt-3">
          {ratingChanged && ratingVal > 0 && (
            <button
              type="button"
              onClick={handleSaveRating}
              disabled={savingRating}
              className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {savingRating ? 'Saving…' : soda.myRating ? 'Update Rating' : 'Save Rating'}
            </button>
          )}
          {soda.myRating && (
            <button
              type="button"
              onClick={handleDeleteRating}
              className="py-2.5 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              Remove
            </button>
          )}
        </div>
        {!soda.myRating && ratingVal === 0 && (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Tap a star to rate</p>
        )}
      </div>

      {/* Rating breakdown — shown only when >1 member has rated (RTG-03, RTG-04) */}
      {soda.ratings.length > 1 && (
        <div className="mb-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-4 pt-4 pb-2">Ratings</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  Member
                </th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody>
              {soda.ratings.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100">{r.displayName}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100">
                    <span className="text-amber-400 mr-1">★</span>
                    {r.score.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fridge (SOD-04, SOD-05) */}
      <div className="mb-5 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Refrigerator size={18} className={soda.inFridge ? 'text-sky-500' : 'text-gray-400'} />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">In Fridge</span>
          </div>
          <button
            type="button"
            onClick={handleFridgeToggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${soda.inFridge ? 'bg-sky-500' : 'bg-gray-200 dark:bg-gray-700'}`}
            aria-label="Toggle in fridge"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${soda.inFridge ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>

        {soda.inFridge && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQtyChange(-1)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {soda.quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQtyChange(1)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Remove soda (SOD-03) */}
      <button
        type="button"
        onClick={handleDelete}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
      >
        <Trash2 size={15} />
        Remove from Stash
      </button>
    </div>
  );
}
