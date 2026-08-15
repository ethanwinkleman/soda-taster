import { useRef, useState, useEffect, useCallback } from 'react';

export type ScanStatus = 'idle' | 'requesting' | 'scanning' | 'error';
export type ScanErrorType = 'permission' | 'device' | null;

// ZXing is ~370KB, so it's loaded dynamically when scanning starts rather
// than bundled into the page chunk.
async function loadReader() {
  const [{ BrowserMultiFormatReader, BarcodeFormat }, { DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);

  // Restrict to 1D grocery/beverage formats only — dramatically cuts processing time
  // and improves reliability vs. scanning for every possible format
  const hints = new Map<unknown, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
    ]],
    [DecodeHintType.TRY_HARDER, true],
  ]);

  return new BrowserMultiFormatReader(hints as ConstructorParameters<typeof BrowserMultiFormatReader>[0], {
    delayBetweenScanAttempts: 100, // default is 500ms — scan 5× as often
  });
}

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
      const reader = await loadReader();
      if (!videoRef.current) return;

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

  // The one set-state-in-effect left in the codebase, kept deliberately.
  //
  // Deriving `status` from `active` is the usual fix, but scanning stops and restarts
  // while this page stays mounted — every detected barcode pauses it — and a derived
  // status would surface the previous attempt's value (an 'error' most damagingly) for
  // a frame before start() reports back. Moving the reset into stop() does not help;
  // the rule follows the call. Both alternatives risk a visible regression in the
  // camera flow, which cannot be exercised in CI or a headless browser, so this trades
  // one extra render on an infrequent user-driven transition for a UI that is correct.
  useEffect(() => {
    if (!active) {
      stop();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see note above
      setStatus('idle');
      return;
    }
    start();
    return stop;
  }, [active, start, stop]);

  return { videoRef, status, errorType, showHint, showProminentManual };
}
