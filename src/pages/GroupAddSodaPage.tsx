import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Upload, X, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGroupSodas } from '../hooks/useGroupSodas';
import { TAG_LABELS, SUGAR_LABELS, SIZE_LABELS, computeOverallScore } from '../utils/labels';
import { CategoryRatingRow } from '../components/CategoryRatingRow';
import type { SugarType, SodaSize, FlavorTag, CategoryRatings } from '../types/soda';

const ALL_TAGS = Object.keys(TAG_LABELS) as FlavorTag[];
const defaultRatings: CategoryRatings = { taste: 3, sweetness: 3, carbonation: 3, aftertaste: 3, packaging: 3 };

export function GroupAddSodaPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSoda } = useGroupSodas(groupId, user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [flavor, setFlavor] = useState('');
  const [sugarType, setSugarType] = useState<SugarType>('sugar');
  const [size, setSize] = useState<SodaSize>('can');
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [ratings, setRatings] = useState<CategoryRatings>(defaultRatings);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function addCustomTag() {
    const val = customTagInput.trim();
    if (!val || tags.includes(val)) return;
    setTags((prev) => [...prev, val]);
    setCustomTagInput('');
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Soda name is required';
    if (!brand.trim()) errs.brand = 'Brand is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    await addSoda(
      { name: name.trim(), brand: brand.trim(), flavor: flavor.trim(), sugar_type: sugarType, size, tags, photo },
      { ratings, overall_score: computeOverallScore(ratings), notes: notes.trim() }
    );
    setSaving(false);
    navigate(`/groups/${groupId}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button type="button" onClick={() => navigate(`/groups/${groupId}`)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors">
        <ChevronLeft size={16} /> Stash
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add to Stash</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <div className="flex flex-col items-center">
          {photo ? (
            <div className="relative w-1/2 aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img src={photo} alt="Soda" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setPhoto(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"><X size={16} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-1/2 aspect-[3/4] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-sky-400 hover:text-sky-400 transition-colors">
              <Upload size={24} /><span className="text-sm font-medium">Upload photo</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
        </div>

        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soda Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coca-Cola Classic"
              className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'} bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400`} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand *</label>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Coca-Cola"
              className={`w-full px-4 py-3 rounded-xl border ${errors.brand ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'} bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400`} />
            {errors.brand && <p className="text-xs text-red-500 mt-1">{errors.brand}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flavor / Variant</label>
            <input value={flavor} onChange={(e) => setFlavor(e.target.value)} placeholder="e.g. Cherry, Vanilla"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
        </div>

        {/* Sugar + size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sugar Type</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SUGAR_LABELS) as SugarType[]).map((key) => (
                <button key={key} type="button" onClick={() => setSugarType(key)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${sugarType === key ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-sky-400'}`}>
                  {SUGAR_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Size</label>
            <div className="flex gap-2">
              {(Object.keys(SIZE_LABELS) as SodaSize[]).map((key) => (
                <button key={key} type="button" onClick={() => setSize(key)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${size === key ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-sky-400'}`}>
                  {SIZE_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Flavor Tags</label>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${tags.includes(tag) ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-sky-400'}`}>
                {TAG_LABELS[tag]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input value={customTagInput} onChange={(e) => setCustomTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }} placeholder="Add custom tag..."
              className="flex-1 px-4 py-2.5 rounded-full border border-dashed border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:border-sky-400" />
            <button type="button" onClick={addCustomTag} disabled={!customTagInput.trim()} className="flex items-center gap-1 px-3 py-2.5 rounded-full text-xs font-medium border border-sky-400 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 disabled:opacity-40 transition-colors">
              <Plus size={12} /> Add
            </button>
          </div>
        </div>

        {/* Ratings */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-1">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Your Rating</h2>
          {(['taste', 'sweetness', 'carbonation', 'aftertaste', 'packaging'] as const).map((key) => (
            <CategoryRatingRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={ratings[key]} onChange={(v) => setRatings((p) => ({ ...p, [key]: v }))} />
          ))}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Score</span>
            <span className="text-lg font-bold text-sky-500">{computeOverallScore(ratings).toFixed(1)}/5</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any additional thoughts..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
        </div>

        <button type="submit" disabled={saving} className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors shadow-sm">
          {saving ? 'Saving…' : 'Add to Group'}
        </button>
      </form>
    </div>
  );
}
