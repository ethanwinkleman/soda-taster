import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, X, Barcode, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useStashSodas } from '../hooks/useStashSodas';
import { StarRating } from '../components/StarRating';
import { Button, Input, FieldLabel, PageHeader } from '../components/ui';

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function AddSodaPage() {
  const { id: stashId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { sodas, addSoda } = useStashSodas(stashId, user?.id);

  const [quickMode, setQuickMode] = useState(true);
  const [addedCount, setAddedCount] = useState(0);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [score, setScore] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
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

  function resetForm() {
    setName('');
    setBrand('');
    setScore(0);
    clearImage();
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  const displayName = (user?.user_metadata?.full_name ?? user?.email ?? 'Unknown') as string;

  const duplicate = useMemo(() => {
    const q = normalize(name);
    if (q.length < 3) return null;
    return sodas.find((s) => {
      const n = normalize(s.name);
      return n === q || n.includes(q) || q.includes(n);
    }) ?? null;
  }, [name, sodas]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const result = await addSoda(name.trim(), brand.trim(), score > 0 ? score : null, displayName, imageFile);
      if (!result) throw new Error();
      toast.success(`"${name.trim()}" added to collection.`);
      if (quickMode) {
        setAddedCount((c) => c + 1);
        resetForm();
        setSaving(false);
      } else {
        navigate(`/stash/${stashId}`);
      }
    } catch {
      toast.error('Failed to save — please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">

      <PageHeader title="Add a Soda" onBack={() => navigate(`/stash/${stashId}`)} />

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 mb-5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setQuickMode(true)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-sans text-xs font-medium uppercase tracking-wider transition-all ${
            quickMode
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Zap size={12} />
          Quick Add
        </button>
        <button
          type="button"
          onClick={() => setQuickMode(false)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-sans text-xs font-medium uppercase tracking-wider transition-all ${
            !quickMode
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Full Details
        </button>
      </div>

      {/* Scan entry point */}
      <button
        type="button"
        onClick={() => navigate(`/stash/${stashId}/scan`)}
        className="w-full flex items-center justify-center gap-2 py-3 mb-2 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-sky-400 dark:hover:border-sky-500 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
      >
        <Barcode size={18} />
        <span className="font-sans text-sm uppercase tracking-wider">Scan a Barcode</span>
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 border-b border-gray-200 dark:border-gray-700" />
        <span className="text-[10px] font-sans text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">or enter manually</span>
        <div className="flex-1 border-b border-gray-200 dark:border-gray-700" />
      </div>

      <form onSubmit={handleSubmit}>

        {/* Name */}
        <div className="mb-5">
          <FieldLabel className="mb-1.5">
            Soda Name <span className="text-red-500">*</span>
          </FieldLabel>
          <Input
            ref={nameInputRef}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Boylan Cane Cola"
          />
          <AnimatePresence>
          {duplicate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-2 px-3 py-2.5 rounded-xl border border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-2.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="font-sans text-xs text-gray-700 dark:text-gray-300">
                  <span className="font-bold">"{duplicate.name}"</span>
                  {duplicate.brand && <span className="text-gray-500 dark:text-gray-400"> ({duplicate.brand})</span>}
                  {' '}is already in this collection.{' '}
                  <Link
                    to={`/stash/${stashId}/soda/${duplicate.id}`}
                    className="font-bold underline text-gray-900 dark:text-gray-100 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                  >
                    {duplicate.myRating ? 'View it' : 'Rate it instead'}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Manufacturer — Full Details only */}
        <AnimatePresence initial={false}>
          {!quickMode && (
            <motion.div
              key="brand"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="mb-5">
                <FieldLabel className="mb-1.5">
                  Manufacturer <span className="text-gray-400 font-normal">(optional)</span>
                </FieldLabel>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Boylan Bottling Co."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Photo — Full Details only */}
        <AnimatePresence initial={false}>
          {!quickMode && (
            <motion.div
              key="photo"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="mb-5">
                <FieldLabel className="mb-1.5">
                  Photo <span className="text-gray-400 font-normal">(optional)</span>
                </FieldLabel>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleImageSelect}
                />
                <AnimatePresence mode="wait">
                {imagePreview ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="relative rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <img
                      src={imagePreview}
                      alt="Soda preview"
                      className="w-full h-52 object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      aria-label="Remove photo"
                    >
                      <X size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      aria-label="Change photo"
                    >
                      <Camera size={14} />
                    </button>
                  </motion.div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-28 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-sky-400 dark:hover:border-sky-500 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
                  >
                    <Camera size={20} />
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em]">Add photo</span>
                  </button>
                )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rating */}
        <div className="mb-5">
          <FieldLabel className="mb-2">
            My Rating <span className="text-gray-400 font-normal">(optional)</span>
          </FieldLabel>
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

        <div className="border-t border-gray-200 dark:border-gray-700 pt-5 space-y-3">
          <Button type="submit" size="md" disabled={saving || !name.trim()} className="w-full">
            {saving ? 'Saving…' : quickMode ? 'Add & Next' : 'Add to Collection'}
          </Button>

          <AnimatePresence>
            {quickMode && addedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-3"
              >
                <p className="flex items-center justify-center gap-1.5 font-sans text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <span aria-hidden>✓</span>
                  Added {addedCount} {addedCount === 1 ? 'soda' : 'sodas'}
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate(`/stash/${stashId}`)}
                  className="w-full"
                >
                  Done Logging
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
