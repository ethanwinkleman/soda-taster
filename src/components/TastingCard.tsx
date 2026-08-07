import type { Soda } from '../types/stash';

interface Props {
  soda: Soda;
  cardRef: React.RefObject<HTMLDivElement | null>;
  sharedBy?: string | null;
  sharedAt?: string | null;
}

const CARD_W = 600;
const PAD = 44;

// Cherry Fizz palette (mirrors the @theme tokens in index.css — inlined because
// html2canvas rasterises this card outside the Tailwind cascade).
const bg = '#15101c';      // gray-950, plum black
const cream = '#fffbf7';   // gray-50
const cherry = '#ff3d78';  // sky-500
const amber = '#ffd166';   // amber-400
const muted = '#8a7d9e';   // gray-500
const soft = '#dcd0e3';    // gray-300
const rule = '#2e2440';    // gray-800

const DISPLAY = "'Fredoka', system-ui, sans-serif";
const SANS = "'Plus Jakarta Sans', system-ui, sans-serif";

export function TastingCard({ soda, cardRef, sharedBy, sharedAt }: Props) {
  const topNote = soda.ratings.find((r) => r.notes)?.notes ?? null;
  const hasImage = !!soda.imageUrl;
  const imgH = hasImage ? 280 : 0;

  // Show up to 4 individual rater rows
  const raterRows = soda.ratings.slice(0, 4);

  return (
    <div
      ref={cardRef}
      style={{
        width: CARD_W,
        background: bg,
        color: cream,
        fontFamily: SANS,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Cherry brand bar */}
      <div style={{ height: 6, background: `linear-gradient(to right, ${cherry}, #00c2d1)`, flexShrink: 0 }} />

      {/* Hero image */}
      {hasImage && (
        <div style={{ position: 'relative', width: CARD_W, height: imgH, flexShrink: 0 }}>
          <img
            src={soda.imageUrl!}
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
              background: `linear-gradient(to bottom, transparent, ${bg})`,
            }}
          />
        </div>
      )}

      {/* Body */}
      <div style={{ padding: `${hasImage ? 24 : 52}px ${PAD}px ${PAD}px` }}>

        {/* Name */}
        <div style={{ marginBottom: soda.brand ? 6 : 20 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 700, lineHeight: 1.1, color: cream }}>
            {soda.name}
          </div>
        </div>

        {/* Brand */}
        {soda.brand && (
          <div style={{ fontSize: 15, fontWeight: 500, color: cherry, marginBottom: 24 }}>
            {soda.brand}
          </div>
        )}

        {/* Score + stars row */}
        {soda.avgScore !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{
              fontFamily: DISPLAY, fontSize: 72, fontWeight: 700, lineHeight: 1,
              color: cherry, letterSpacing: '-1px', flexShrink: 0,
            }}>
              {soda.avgScore.toFixed(1)}
            </div>
            <div>
              {/* Stars */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 7 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ fontSize: 20, color: i <= Math.round(soda.avgScore!) ? amber : rule }}>★</div>
                ))}
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.28em',
                textTransform: 'uppercase', color: soft, marginBottom: 3,
              }}>
                Group Average
              </div>
              <div style={{
                fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: muted,
              }}>
                {soda.ratings.length} Rating{soda.ratings.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: rule }} />
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: cherry }} />
          <div style={{ flex: 1, height: 1, background: rule }} />
        </div>

        {/* Tasting note */}
        {topNote && (
          <div style={{
            fontSize: 14, color: soft, lineHeight: 1.7,
            borderLeft: `3px solid ${cherry}`, paddingLeft: 16,
            marginBottom: 24,
          }}>
            “{topNote.length > 120 ? topNote.slice(0, 117) + '…' : topNote}”
          </div>
        )}

        {/* Individual rater scores */}
        {raterRows.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {raterRows.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: soft }}>
                  {r.displayName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} style={{ fontSize: 11, color: i <= r.score ? amber : rule }}>★</div>
                    ))}
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: cream, minWidth: 24, textAlign: 'right',
                  }}>
                    {r.score.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          borderTop: `1px solid ${rule}`,
          paddingTop: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: muted, flex: 1,
          }}>
            {sharedBy ? `Shared by ${sharedBy}` : ''}
          </div>
          <div style={{
            fontFamily: DISPLAY, fontSize: 11, fontWeight: 600, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: cherry, flexShrink: 0,
          }}>
            Soda Taster
          </div>
          <div style={{
            fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: muted,
            flex: 1, textAlign: 'right',
          }}>
            {sharedAt ?? ''}
          </div>
        </div>
      </div>
    </div>
  );
}
