import { useRef, useState, useEffect, useCallback } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';

export type ScanStatus = 'idle' | 'requesting' | 'scanning' | 'error';
export type ScanErrorType = 'permission' | 'device' | null;

// Restrict to 1D grocery/beverage formats only — dramatically cuts processing time
// and improves reliability vs. scanning for every possible format
const HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
  ]],
  [DecodeHintType.TRY_HARDER, true],
] as Array<[DecodeHintType, unknown]>);

// High-res back camera + continuous autofocus gives ZXing enough pixels
// to decode small barcodes on cans and bottles reliably
const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: 'environment' },
    width:  { ideal: 1920 },
    height: { ideal: 1080 },
    // focusMode is a valid MediaTrackConstraints key on mobile but missing from lib.dom
    ...(({ focusMode: { ideal: 'continuous' } }) as Record<string, unknown>),
  },
};

export function useBarcodeScanner(
  onResult: (barcode: string) => void,
  active: boolean,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop(): void } | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prominentTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resolvedRef = useRef(false);

  const [status, setStatus] = useState<ScanStatus>('idle');
  const [errorType, setErrorType] = useState<ScanErrorType>(null);
  const [showHint, setShowHint] = useState(false);
  const [showProminentManual, setShowProminentManual] = useState(false);

  const stop = useCallback(() => {
    clearTimeout(hintTimerRef.current);
    clearTimeout(prominentTimerRef.current);
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!videoRef.current) return;
    resolvedRef.current = false;
    setStatus('requesting');
    setShowHint(false);
    setShowProminentManual(false);

    hintTimerRef.current = setTimeout(() => setShowHint(true), 5000);
    prominentTimerRef.current = setTimeout(() => setShowProminentManual(true), 10000);

    try {
      const reader = new BrowserMultiFormatReader(HINTS, {
        delayBetweenScanAttempts: 100, // default is 500ms — scan 5× as often
      });

      const controls = await reader.decodeFromConstraints(
        CAMERA_CONSTRAINTS,
        videoRef.current,
        (result, _err) => {
          if (result && !resolvedRef.current) {
            resolvedRef.current = true;
            clearTimeout(hintTimerRef.current);
            clearTimeout(prominentTimerRef.current);
            onResult(result.getText());
          }
        },
      );
      controlsRef.current = controls as unknown as { stop(): void };
      setStatus('scanning');
    } catch (err: unknown) {
      clearTimeout(hintTimerRef.current);
      clearTimeout(prominentTimerRef.current);
      const name = err instanceof Error ? err.name : '';
      setErrorType(name === 'NotAllowedError' ? 'permission' : 'device');
      setStatus('error');
    }
  }, [onResult]);

  useEffect(() => {
    if (!active) {
      stop();
      setStatus('idle');
      return;
    }
    start();
    return stop;
  }, [active, start, stop]);

  return { videoRef, status, errorType, showHint, showProminentManual };
}
