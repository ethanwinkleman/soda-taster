import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import type { Soda } from '../types/stash';
import { TastingCard } from './TastingCard';
import { hapticSuccess, hapticError } from '../lib/haptics';

interface Props {
  soda: Soda;
}

export function ShareCardButton({ soda }: Props) {
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleShare() {
    if (!cardRef.current || generating) return;
    setGenerating(true);
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#0d0805',
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to generate image'))), 'image/png'),
      );

      const filename = `${soda.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-soda-taster.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: soda.name,
          text: soda.avgScore
            ? `${soda.name} — ${soda.avgScore.toFixed(1)}/5 on Soda Taster`
            : `${soda.name} on Soda Taster`,
        });
        hapticSuccess();
      } else {
        // Desktop fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        hapticSuccess();
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      hapticError();
    } finally {
      setGenerating(false);
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <>
      {createPortal(
        <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none', zIndex: -1 }}>
          <TastingCard soda={soda} cardRef={cardRef} />
        </div>,
        document.body,
      )}

      <button
        type="button"
        onClick={handleShare}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 py-3 font-sans text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-500 dark:hover:border-gray-400 transition-colors disabled:opacity-40"
      >
        {canNativeShare ? <Share2 size={13} /> : <Download size={13} />}
        {generating ? 'Generating…' : 'Share Tasting Card'}
      </button>
    </>
  );
}
