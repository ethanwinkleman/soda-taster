import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, CupSoda, Check, Pencil, Camera, X, Scan,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useStashSodas } from '../hooks/useStashSodas';
import { Button, PageHeader } from '../components/ui';
import type { BarcodeResult } from '../lib/barcodeApi';

function ProductImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className ?? ''}`}>
        <CupSoda size={32} className="text-gray-300 dark:text-gray-600" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className ?? ''}`}
      onError={() => setErrored(true)}
    />
  );
}

export function BarcodeResultPage() {
  const { id: stashId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as BarcodeResult | undefined;
  const barcode = state?.barcode ?? '';
  const candidates = state?.candidates ?? [];
  const isAmbiguous = state?.isAmbiguous ?? false;

  const { addSoda } = useStashSodas(stashId, user?.id);
  const displayName = (user?.user_metadata?.full_name ?? user?.email ?? 'Unknown') as string;

  type View = 'not_found' | 'disambiguation' | 'detail';
  const initialView: View = candidates.length === 0
    ? 'not_found'
    : isAmbiguous
      ? 'disambiguation'
      : 'detail';

  const [view, setView] = useState<View>(initialView);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    !isAmbiguous && candidates.length === 1 ? 0 : null,
  );
  const [editingName, setEditingName] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedManufacturer, setEditedManufacturer] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = selectedIdx !== null ? candidates[selectedIdx] : null;

  // Sync edit fields when selection changes
  useEffect(() => {
    if (selected) {
      setEditedName(selected.name);
      setEditedManufacturer(selected.manufacturer);
    }
  }, [selectedIdx]);

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

  function handleConfirmDisambiguation() {
    if (selectedIdx === null) return;
    setView('detail');
  }

  async function handleSave() {
    if (!stashId || !selected) return;
    setSaving(true);

    const finalName = editedName.trim() || selected.name;
    const finalManufacturer = editedManufacturer.trim() || selected.manufacturer;
    const externalImageUrl = imageFile ? null : (selected.imageUrl ?? null);

    try {
      const result = await addSoda(
        finalName,
        finalManufacturer,
        null,
        displayName,
        imageFile,
        externalImageUrl,
      );
      if (!result) throw new Error();
      const { sodaId } = result;
      if (sodaId && barcode) {
        sessionStorage.setItem(`scanned_${stashId}_${barcode}`, sodaId);
        localStorage.setItem(`scanned_${stashId}_${barcode}`, sodaId);
      }
      navigate(`/stash/${stashId}`);
    } catch {
      toast.error('Failed to save — please try again.');
      setSaving(false);
    }
  }

  // ── NOT FOUND ───────────────────────────────────────────────────────────────
  if (view === 'not_found') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <PageHeader title="Soda Not Found" onBack={() => navigate(`/stash/${stashId}/scan`)} />

        <div className="text-center py-10 border border-dashed border-gray-300 dark:border-gray-700 mb-6">
          <Scan size={40} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
          <p className="font-display italic text-gray-600 dark:text-gray-400 mb-1">
            We couldn't find this soda.
          </p>
          {barcode && (
            <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mt-1">{barcode}</p>
          )}
        </div>

        <div className="space-y-3">
          <Button
            size="md"
            onClick={() => navigate(`/stash/${stashId}/add`)}
            className="w-full tracking-[0.15em]"
          >
            Add It Manually
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate(`/stash/${stashId}/scan`)}
            className="w-full dark:hover:bg-gray-800"
          >
            Try Scanning Again
          </Button>
        </div>
      </div>
    );
  }

  // ── DISAMBIGUATION ──────────────────────────────────────────────────────────
  if (view === 'disambiguation') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <PageHeader
          title="Which soda did you scan?"
          size="md"
          onBack={() => navigate(`/stash/${stashId}/scan`)}
          className="mb-6"
        />

        {barcode && (
          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-wide">
            Barcode: {barcode}
          </p>
        )}

        <div className="space-y-2 mb-6">
          {candidates.map((c, i) => (
            <motion.button
              key={i}
              type="button"
              onClick={() => setSelectedIdx(i)}
              whileTap={{ scale: 0.985 }}
              className={`w-full flex items-center gap-3 p-3 border transition-colors text-left ${
                selectedIdx === i
                  ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-800'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {/* Thumbnail */}
              <ProductImage
                src={c.imageUrl}
                alt={c.name}
                className="w-16 h-16 shrink-0 rounded"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate max-w-[40ch]">
                  {c.name || <span className="italic text-gray-400">Name unknown</span>}
                </p>
                <p className="font-sans text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {c.manufacturer || <span className="italic">Manufacturer unknown</span>}
                </p>
                <span className="inline-block mt-1 font-sans text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-700 px-1 py-px">
                  {c.source === 'open_food_facts' ? 'Open Food Facts' : 'Barcode Lookup'}
                </span>
              </div>

              {selectedIdx === i && (
                <div className="shrink-0 w-5 h-5 bg-gray-900 dark:bg-gray-100 flex items-center justify-center">
                  <Check size={12} className="text-white dark:text-gray-900" />
                </div>
              )}
            </motion.button>
          ))}

          {/* None of these */}
          <button
            type="button"
            onClick={() => navigate(`/stash/${stashId}/add`)}
            className="w-full py-3 font-sans text-xs text-gray-400 dark:text-gray-500 italic hover:text-gray-600 dark:hover:text-gray-300 transition-colors border border-dashed border-gray-300 dark:border-gray-700"
          >
            None of these — add manually
          </button>
        </div>

        {/* Sticky confirm */}
        <AnimatePresence>
          {selectedIdx !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="sticky bottom-4"
            >
              <Button
                size="md"
                onClick={handleConfirmDisambiguation}
                className="w-full tracking-[0.15em] shadow-lg"
              >
                Confirm Selection
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── DETAIL / CONFIRMATION ───────────────────────────────────────────────────
  const displayImage = imagePreview ?? selected?.imageUrl ?? null;

  return (
    <div className="max-w-md mx-auto">
      {/* Back button */}
      <div className="px-4 pt-6 pb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (isAmbiguous) {
              setView('disambiguation');
            } else {
              navigate(`/stash/${stashId}/scan`);
            }
          }}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Product image — full width, 4:3 */}
      <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        <ProductImage
          src={displayImage}
          alt={editedName || selected?.name || ''}
          className="w-full h-full"
        />
        {/* Replace image button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-3 right-3 p-2 bg-black/60 text-white hover:bg-black/80 transition-colors"
          aria-label="Replace image"
        >
          <Camera size={16} />
        </button>
        {imageFile && (
          <button
            type="button"
            onClick={() => {
              if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
              previewUrlRef.current = null;
              setImageFile(null);
              setImagePreview(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="absolute top-3 right-3 p-1.5 bg-black/60 text-white hover:bg-black/80 transition-colors"
            aria-label="Remove custom image"
          >
            <X size={14} />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleImageSelect}
        />
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Soda name */}
        <div>
          {editingName ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-display text-2xl font-black text-gray-900 dark:text-white focus:outline-none focus:border-gray-700 dark:focus:border-gray-300"
              />
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <h1 className="flex-1 font-display text-2xl font-black italic text-gray-900 dark:text-white leading-tight">
                {editedName || <span className="text-gray-400">Unknown soda</span>}
              </h1>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="mt-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                aria-label="Edit name"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Manufacturer */}
        <div>
          {editingManufacturer ? (
            <input
              autoFocus
              value={editedManufacturer}
              onChange={(e) => setEditedManufacturer(e.target.value)}
              onBlur={() => setEditingManufacturer(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingManufacturer(false)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-sans text-base text-gray-700 dark:text-gray-300 italic focus:outline-none focus:border-gray-700 dark:focus:border-gray-300"
            />
          ) : (
            <div className="flex items-center gap-2">
              <p className="flex-1 font-sans text-base text-gray-600 dark:text-gray-400 italic">
                {editedManufacturer || <span className="text-gray-400">Manufacturer unknown</span>}
              </p>
              <button
                type="button"
                onClick={() => setEditingManufacturer(true)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                aria-label="Edit manufacturer"
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Source credit */}
        {selected && (
          <p className="font-sans text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-wide">
            Data provided by {selected.source === 'open_food_facts' ? 'Open Food Facts' : 'Barcode Lookup'}
          </p>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-5 space-y-3">
          <Button
            size="md"
            disabled={saving}
            onClick={handleSave}
            className="w-full tracking-[0.15em]"
          >
            {saving ? 'Filing…' : 'Add to My Collection'}
          </Button>
          <button
            type="button"
            onClick={() => navigate(`/stash/${stashId}/scan`)}
            className="w-full py-2 font-sans text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Scan Another
          </button>
        </div>
      </div>
    </div>
  );
}
