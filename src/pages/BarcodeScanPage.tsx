import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast as sonnerToast } from 'sonner';
import { ChevronLeft, Keyboard, AlertCircle, Settings, Loader2 } from 'lucide-react';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { lookupBarcode } from '../lib/barcodeApi';
import type { BarcodeResult } from '../lib/barcodeApi';
import { useAuth } from '../contexts/AuthContext';
import { useStashSodas } from '../hooks/useStashSodas';
import { hapticMedium } from '../lib/haptics';

const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

export function BarcodeScanPage() {
  const { id: stashId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sodas } = useStashSodas(stashId, user?.id);

  const [scanActive, setScanActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [manualBusy, setManualBusy] = useState(false);

  const processingRef = useRef(false);

  const openExisting = useCallback((sodaId: string) => {
    hapticMedium();
    sonnerToast.success('Already in your collection.');
    navigate(`/stash/${stashId}/soda/${sodaId}`);
  }, [navigate, stashId]);

  const navigateToResult = useCallback((result: BarcodeResult) => {
    navigate(`/stash/${stashId}/scan/result`, { state: result });
  }, [navigate, stashId]);

  const processBarcode = useCallback(async (barcode: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setScanActive(false);
    setLoading(true);

    // 1) Cached barcode → soda mapping (persistent localStorage, plus
    //    legacy sessionStorage from older versions). Only honor it if the
    //    soda still exists in the current stash.
    const cacheKey = `scanned_${stashId}_${barcode}`;
    const cachedId = localStorage.getItem(cacheKey) ?? sessionStorage.getItem(cacheKey);
    if (cachedId && sodas.some((s) => s.id === cachedId)) {
      setLoading(false);
      processingRef.current = false;
      openExisting(cachedId);
      return;
    }

    try {
      const result = await lookupBarcode(barcode);

      // 2) Name-match fallback — catches sodas added by other members or
      //    on other devices, where this device has no cache entry.
      const matched = sodas.find((s) =>
        result.candidates.some((c) => c.name && normalize(c.name) === normalize(s.name)),
      );
      if (matched) {
        localStorage.setItem(cacheKey, matched.id);
        setLoading(false);
        processingRef.current = false;
        openExisting(matched.id);
        return;
      }

      navigateToResult(result);
    } catch {
      setLoading(false);
      setScanActive(true);
      processingRef.current = false;
    }
  }, [stashId, sodas, openExisting, navigateToResult]);

  const { videoRef, status, errorType, showHint, showProminentManual } = useBarcodeScanner(
    processBarcode,
    scanActive,
  );

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = manualValue.trim().replace(/\D/g, '');
    if (!raw) return;
    setManualBusy(true);
    setManualOpen(false);
    await processBarcode(raw);
    setManualBusy(false);
  }

  function openSettings() {
    window.open('app-settings:', '_blank');
  }

  const isLoading = loading || manualBusy;

  return (
    <div className="flex flex-col min-h-dvh bg-black">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-3 bg-black/80 backdrop-blur z-10 shrink-0">
        <button
          type="button"
          onClick={() => { setScanActive(false); navigate(`/stash/${stashId}`); }}
          className="p-2 text-white/80 hover:text-white transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-display font-bold text-white text-lg flex-1">Scan a Soda</h1>
      </div>

      {/* Camera / content area */}
      <div className="flex-1 relative overflow-hidden">

        {/* Video feed */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Scan overlay — darken everything outside the scan frame */}
        {!isLoading && status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute"
              style={{
                top: '28%',
                left: '8%',
                right: '8%',
                bottom: '28%',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              }}
            >
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white" />
              {/* Scanning line */}
              <motion.div
                className="absolute left-1 right-1 h-px bg-white/50"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>
        )}

        {/* Loading overlay — shown while API lookup runs */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="text-white animate-spin" />
            <p className="text-white/80 font-sans text-sm tracking-wide">Looking up barcode…</p>
          </div>
        )}

        {/* Permission denied */}
        {status === 'error' && errorType === 'permission' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-5 px-8 text-center">
            <AlertCircle size={40} className="text-amber-400" />
            <div>
              <p className="text-white font-display font-bold text-lg mb-2">Camera Access Required</p>
              <p className="text-white/60 font-sans text-sm">
                Allow camera access in your device settings to scan barcodes.
              </p>
            </div>
            <button
              type="button"
              onClick={openSettings}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-sans text-sm font-bold uppercase tracking-wider"
            >
              <Settings size={15} />
              Open Settings
            </button>
          </div>
        )}

        {/* Device error */}
        {status === 'error' && errorType === 'device' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-8 text-center">
            <AlertCircle size={40} className="text-red-400" />
            <p className="text-white font-display font-bold text-lg">Camera Unavailable</p>
            <p className="text-white/60 font-sans text-sm">No camera found or camera is in use by another app.</p>
          </div>
        )}

        {/* Requesting permission spinner */}
        {status === 'requesting' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-3">
            <Loader2 size={28} className="text-white/60 animate-spin" />
            <p className="text-white/50 font-sans text-sm">Starting camera…</p>
          </div>
        )}

      </div>

      {/* Bottom bar */}
      <div className="shrink-0 bg-black/90 px-5 py-4 flex flex-col items-center gap-3">
        {status === 'scanning' && (
          <p className="text-white/60 font-sans text-xs uppercase tracking-wider text-center">
            {showHint ? 'Try better lighting or a different angle' : 'Point the camera at the barcode'}
          </p>
        )}

        {/* Manual entry — small text link normally, prominent button after 10s */}
        <AnimatePresence mode="wait">
          {showProminentManual ? (
            <motion.button
              key="prominent"
              type="button"
              onClick={() => setManualOpen(true)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full flex items-center justify-center gap-2 py-3 border border-white/30 text-white font-sans text-sm uppercase tracking-wider hover:border-white/60 transition-colors"
            >
              <Keyboard size={16} />
              Enter Barcode Manually
            </motion.button>
          ) : (
            <motion.button
              key="hint"
              type="button"
              onClick={() => setManualOpen(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white/40 font-sans text-xs underline hover:text-white/70 transition-colors"
            >
              Enter barcode manually
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Manual entry bottom sheet */}
      <AnimatePresence>
        {manualOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setManualOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950 border-t border-gray-700 p-5 pb-safe"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-3">
                — Enter Barcode —
              </p>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  autoFocus
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 049000028928"
                  maxLength={14}
                  inputMode="numeric"
                  className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 font-mono tracking-wider text-sm"
                />
                <button
                  type="submit"
                  disabled={manualValue.trim().length < 6}
                  className="px-4 py-2.5 bg-white text-gray-900 font-sans text-xs font-bold uppercase tracking-wider disabled:opacity-40 transition-opacity"
                >
                  Look Up
                </button>
              </form>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="mt-3 text-gray-500 font-sans text-xs underline hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
