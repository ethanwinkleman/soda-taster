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
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => navigate(`/stash/${stashId}`)}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Add Soda</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Soda Name <span className="text-red-400">*</span>
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Boylan Cane Cola"
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Brand <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Boylan"
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Photo <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageSelect}
          />
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={imagePreview}
                alt="Soda preview"
                className="w-full h-52 object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
                aria-label="Remove photo"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 p-2 bg-black/50 backdrop-blur-sm rounded-xl text-white hover:bg-black/70 transition-colors"
                aria-label="Change photo"
              >
                <Camera size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-sky-400 hover:text-sky-400 dark:hover:border-sky-500 dark:hover:text-sky-400 transition-colors"
            >
              <Camera size={22} />
              <span className="text-sm font-medium">Add photo</span>
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            My Rating <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <StarRating value={score} onChange={setScore} size="lg" />
          {score > 0 && (
            <button
              type="button"
              onClick={() => setScore(0)}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Clear rating
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
        >
          {saving ? 'Adding…' : 'Add Soda'}
        </button>
      </form>
    </div>
  );
}
