import { useRef, useState, useEffect, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export type ScanStatus = 'idle' | 'requesting' | 'scanning' | 'error';
export type ScanErrorType = 'permission' | 'device' | null;

export function useBarcodeScanner(
  onResult: (barcode: string) => void,
  active: boolean,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop(): void } | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const prominentTimerRef = useRef<ReturnType<typeof setTimeout>>();
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
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
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
