import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, X, ChevronLeft, Plus, Lock } from 'lucide-react';
import type { SodaEntry, SugarType, SodaSize, FlavorTag, CategoryRatings } from '../types/soda';
import { StarRating } from '../components/StarRating';
import { TAG_LABELS, SUGAR_LABELS, SIZE_LABELS, computeOverallScore } from '../utils/labels';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../hooks/useGroups';
import { supabase } from '../lib/supabase';

interface Props {
  onAdd: (soda: SodaEntry) => void;
  existingSoda?: SodaEntry;
  onUpdate?: (soda: SodaEntry) => void;
  onLink?: (inventoryId: string, sodaId: string) => void;
}

const ALL_TAGS = Object.keys(TAG_LABELS) as FlavorTag[];

const defaultRatings: CategoryRatings = {
  taste: 3,
  sweetness: 3,
  carbonation: 3,
  aftertaste: 3,
  packaging: 3,
};

export function AddSodaPage({ onAdd, existingSoda, onUpdate, onLink }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!existingSoda;

  const { user } = useAuth();
  const { groups } = useGroups(user?.id);
  // 'personal' = My Sodas; any other string = groupId
  const [destination, setDestination] = useState<'personal' | string>('personal');
  const [saving, setSaving] = useState(false);

  const prefillName = searchParams.get('name') ?? '';
  const inventoryId = searchParams.get('inventoryId');

  const [name, setName] = useState(existingSoda?.name ?? prefillName);
  const [brand, setBrand] = useState(existingSoda?.brand ?? '');
  const [flavor, setFlavor] = useState(existingSoda?.flavor ?? '');
  const [sugarType, setSugarType] = useState<SugarType>(existingSoda?.sugarType ?? 'sugar');
  const [size, setSize] = useState<SodaSize>(existingSoda?.size ?? 'can');
  const [notes, setNotes] = useState(existingSoda?.notes ?? '');
  const [photo, setPhoto] = useState<string | null>(existingSoda?.photo ?? null);
  const [ratings, setRatings] = useState<CategoryRatings>(existingSoda?.ratings ?? defaultRatings);
  const [tags, setTags] = useState<string[]>(existingSoda?.tags ?? []);
  const [customTagInput, setCustomTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setRating(key: keyof CategoryRatings, val: number) {
    setRatings((prev) => ({ ...prev, [key]: val }));
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Soda name is required';
    if (!brand.trim()) errs.brand = 'Brand is required';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const overallScore = computeOverallScore(ratings);
    setSaving(true);

    // ── Edit mode ──────────────────────────────────────────────
    if (isEdit && existingSoda && onUpdate) {
      onUpdate({
        ...existingSoda,
        name: name.trim(),
        brand: brand.trim(),
        flavor: flavor.trim(),
        sugarType,
        size,
        notes: notes.trim(),
        photo,
        ratings,
        overallScore,
        tags,
      });
      setSaving(false);
      navigate(-1);
      return;
    }

    // ── Add to a shared group ──────────────────────────────────
    if (destination !== 'personal' && user) {
      const { data: sodaRow } = await supabase
        .from('group_sodas')
        .insert({
          group_id: destination,
          created_by: user.id,
          name: name.trim(),
          brand: brand.trim(),
          flavor: flavor.trim(),
          sugar_type: sugarType,
          size,
          tags,
          photo,
        })
        .select()
        .single();

      if (sodaRow) {
        await supabase.from('group_soda_ratings').insert({
          group_soda_id: sodaRow.id,
          user_id: user.id,
          ratings,
          overall_score: overallScore,
          notes: notes.trim(),
        });
      }
      setSaving(false);
      navigate(`/groups/${destination}`);
      return;
    }

    // ── Add to My Sodas (personal) ─────────────────────────────
    const newId = crypto.randomUUID();
    onAdd({
      id: newId,
      name: name.trim(),
      brand: brand.trim(),
      flavor: flavor.trim(),
      sugarType,
      size,
      notes: notes.trim(),
      photo,
      ratings,
      overallScore,
      tags,
      isFavorite: false,
      dateRated: new Date().toISOString(),
    });
    if (inventoryId && onLink) onLink(inventoryId, newId);
    setSaving(false);
    navigate(inventoryId ? '/inventory' : '/sodas');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
      >
        <ChevronLeft size={16} /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {isEdit ? 'Edit Soda' : 'Rate a New Soda'}
      </h1>

      {/* Destination picker — only shown when adding */}
      {!isEdit && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Save to</p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setDestination('personal')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                destination === 'personal'
                  ? 'bg-gray-700 text-white border-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:border-gray-200'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400'
              }`}
            >
              <Lock size={13} />
              My Sodas
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setDestination(g.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  destination === g.id
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-sky-400'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo upload */}
        <div className="flex flex-col items-center">
          {photo ? (
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img src={photo} alt="Soda" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[3/4] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-sky-400 hover:text-sky-400 transition-colors"
            >
              <Upload size={24} />
              <span className="text-sm font-medium">Upload photo</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Soda Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coca-Cola Classic"
              className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-sky-400`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Brand *
            </label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Coca-Cola"
              className={`w-full px-4 py-3 rounded-xl border ${errors.brand ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-sky-400`}
            />
            {errors.brand && <p className="text-xs text-red-500 mt-1">{errors.brand}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Flavor / Variant
            </label>
            <input
              value={flavor}
              onChange={(e) => setFlavor(e.target.value)}
              placeholder="e.g. Cherry, Vanilla, Classic"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </div>

        {/* Sugar type and size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sugar Type
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SUGAR_LABELS) as SugarType[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSugarType(key)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    sugarType === key
                      ? 'bg-sky-500 text-white border-sky-500'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-sky-400'
                  }`}
                >
                  {SUGAR_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Size Tested
            </label>
            <div className="flex gap-2">
              {(Object.keys(SIZE_LABELS) as SodaSize[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSize(key)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    size === key
                      ? 'bg-sky-500 text-white border-sky-500'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-sky-400'
                  }`}
                >
                  {SIZE_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Flavor Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  tags.includes(tag)
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-sky-400'
                }`}
              >
                {TAG_LABELS[tag]}
              </button>
            ))}
            {/* Custom tags added on the fly */}
            {tags.filter((t) => !(ALL_TAGS as string[]).includes(t)).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-sky-500 text-white border border-sky-500"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="hover:opacity-70 transition-opacity"
                  aria-label={`Remove ${tag}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          {/* Add custom tag */}
          <div className="flex gap-2 mt-2">
            <input
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
              placeholder="Add custom tag..."
              className="flex-1 px-4 py-2.5 rounded-full border border-dashed border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:border-sky-400"
            />
            <button
              type="button"
              onClick={addCustomTag}
              disabled={!customTagInput.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-sky-400 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>

        {/* Ratings */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-1">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Category Ratings
          </h2>
          {([
            ['taste', 'Taste'],
            ['sweetness', 'Sweetness'],
            ['carbonation', 'Carbonation'],
            ['aftertaste', 'Aftertaste'],
            ['packaging', 'Packaging'],
          ] as [keyof CategoryRatings, string][]).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-28 shrink-0">
                {label}
              </span>
              <StarRating
                value={ratings[key]}
                onChange={(v) => setRating(key, v)}
                size="sm"
              />
            </div>
          ))}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Overall Score
            </span>
            <span className="text-lg font-bold text-sky-500">
              {computeOverallScore(ratings).toFixed(1)}/5
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional thoughts..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Rating'}
        </button>
      </form>
    </div>
  );
}
