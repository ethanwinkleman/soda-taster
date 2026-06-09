import type { Soda } from '../types/stash';

interface Props {
  soda: Soda;
  cardRef: React.RefObject<HTMLDivElement | null>;
}

const CARD_W = 600;
const CARD_H = 800;
const PAD = 44;

const bg = '#0d0805';
const cream = '#f2e8d8';
const gold = '#c4a96a';
const muted = '#7a6548';
const rule = '#2e1f10';

export function TastingCard({ soda, cardRef }: Props) {
  const topNote = soda.ratings.find((r) => r.notes)?.notes ?? null;
  const hasImage = !!soda.imageUrl;
  const imgH = hasImage ? 260 : 0;

  return (
    <div
      ref={cardRef}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: bg,
        color: cream,
        fontFamily: "'Playfair Display', Georgia, serif",
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Hero image */}
      {hasImage && (
        <div style={{ position: 'relative', width: CARD_W, height: imgH }}>
          <img
            src={soda.imageUrl!}
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
              background: `linear-gradient(to bottom, transparent, ${bg})`,
            }}
          />
        </div>
      )}

      {/* Body */}
      <div style={{ padding: `${hasImage ? 28 : 64}px ${PAD}px 0` }}>

        {/* Top rule */}
        <div style={{ borderTop: `1px solid ${rule}`, marginBottom: 24 }} />

        {/* Name + score row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: soda.brand ? 8 : 24 }}>
          <div
            style={{
              fontSize: 44, fontWeight: 900, fontStyle: 'italic',
              lineHeight: 1.05, flex: 1, color: cream,
            }}
          >
            {soda.name}
          </div>

          {soda.avgScore !== null && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: cream, letterSpacing: '-2px' }}>
                {soda.avgScore.toFixed(1)}
              </div>
              <div style={{
                fontFamily: "'Libre Baskerville', Georgia, serif",
                fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: gold,
                marginTop: 2,
              }}>
                Group Avg
              </div>
              <div style={{
                fontFamily: "'Libre Baskerville', Georgia, serif",
                fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: muted,
              }}>
                {soda.ratings.length} Rating{soda.ratings.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Brand */}
        {soda.brand && (
          <div style={{
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontSize: 15, fontStyle: 'italic', color: gold, marginBottom: 28,
          }}>
            {soda.brand}
          </div>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: rule }} />
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: gold }} />
          <div style={{ flex: 1, height: 1, background: rule }} />
        </div>

        {/* Tasting note */}
        {topNote && (
          <div style={{
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontSize: 15, fontStyle: 'italic', color: '#c8b89a',
            lineHeight: 1.7, borderLeft: `2px solid ${gold}`, paddingLeft: 16,
            marginBottom: 24,
          }}>
            "{topNote.length > 120 ? topNote.slice(0, 117) + '…' : topNote}"
          </div>
        )}

        {/* Star row */}
        {soda.avgScore !== null && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  fontSize: 18,
                  color: i <= Math.round(soda.avgScore!) ? gold : rule,
                }}
              >
                ★
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: `16px ${PAD}px`,
          borderTop: `1px solid ${rule}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ width: 24, height: 1, background: gold }} />
        <div style={{
          fontFamily: "'Libre Baskerville', Georgia, serif",
          fontSize: 9, letterSpacing: '0.35em', textTransform: 'uppercase', color: muted,
        }}>
          Soda Taster
        </div>
        <div style={{ width: 24, height: 1, background: gold }} />
      </div>
    </div>
  );
}
