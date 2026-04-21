import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStashSodas } from '../hooks/useStashSodas';
import { StarRating } from '../components/StarRating';

export function AddSodaPage() {
  const { id: stashId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { addSoda } = useStashSodas(stashId, user?.id);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [score, setScore] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setImageFile(file);
    setImagePreview(url);
  }

  function clearImage() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const displayName = (user?.user_metadata?.full_name ?? user?.email ?? 'Unknown') as string;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await addSoda(name.trim(), brand.trim(), score > 0 ? score : null, displayName, imageFile);
    navigate(`/stash/${stashId}`);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => navigate(`/stash/${stashId}`)}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="border-t border-gray-800 dark:border-gray-200 mb-1" />
          <h1 className="font-display text-2xl font-black italic text-gray-900 dark:text-white">
            Record a Soda
          </h1>
          <div className="border-b border-gray-400 dark:border-gray-600 mt-1" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Name */}
        <div>
          <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1.5">
            Soda Name <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Boylan Cane Cola"
            className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-700 dark:focus:border-gray-300 font-sans text-sm"
          />
        </div>

        {/* Brand */}
        <div>
          <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1.5">
            Manufacturer <span className="text-gray-400 font-normal italic">(optional)</span>
          </label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Boylan Bottling Co."
            className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-700 dark:focus:border-gray-300 font-sans text-sm"
          />
        </div>

        {/* Photo */}
        <div>
          <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1.5">
            Illustration <span className="text-gray-400 font-normal italic">(optional)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageSelect}
          />
          {imagePreview ? (
            <div className="relative border border-gray-300 dark:border-gray-600 overflow-hidden">
              <img
                src={imagePreview}
                alt="Soda preview"
                className="w-full h-52 object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Remove photo"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 p-1.5 bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Change photo"
              >
                <Camera size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-28 border border-dashed border-gray-400 dark:border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-gray-700 dark:hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <Camera size={20} />
              <span className="text-[10px] font-sans uppercase tracking-[0.2em]">Add illustration</span>
            </button>
          )}
        </div>

        {/* Rating */}
        <div>
          <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
            My Rating <span className="text-gray-400 font-normal italic">(optional)</span>
          </label>
          <StarRating value={score} onChange={setScore} size="lg" />
          {score > 0 && (
            <button
              type="button"
              onClick={() => setScore(0)}
              className="mt-2 text-[10px] font-sans uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Clear rating
            </button>
          )}
        </div>

        <div className="border-t border-gray-300 dark:border-gray-600 pt-5">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full py-3 font-sans text-sm font-bold uppercase tracking-[0.15em] text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Filing…' : 'File This Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
