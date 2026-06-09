import type { Soda } from '../types/stash';

interface Props {
  soda: Soda;
  cardRef: React.RefObject<HTMLDivElement | null>;
}

const CARD_W = 600;
const PAD = 44;

const bg = '#0d0805';
const cream = '#f2e8d8';
const gold = '#c4a96a';
const muted = '#7a6548';
const rule = '#2e1f10';

export function TastingCard({ soda, cardRef }: Props) {
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
        fontFamily: "'Playfair Display', Georgia, serif",
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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
      <div style={{ padding: `${hasImage ? 24 : 56}px ${PAD}px ${PAD}px` }}>

        {/* Top rule */}
        <div style={{ borderTop: `1px solid ${rule}`, marginBottom: 22 }} />

        {/* Name row */}
        <div style={{ marginBottom: soda.brand ? 6 : 20 }}>
          <div style={{ fontSize: 44, fontWeight: 900, fontStyle: 'italic', lineHeight: 1.05, color: cream }}>
            {soda.name}
          </div>
        </div>

        {/* Brand */}
        {soda.brand && (
          <div style={{
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontSize: 15, fontStyle: 'italic', color: gold, marginBottom: 22,
          }}>
            {soda.brand}
          </div>
        )}

        {/* Score + stars row */}
        {soda.avgScore !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 22 }}>
            <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: cream, letterSpacing: '-2px', flexShrink: 0 }}>
              {soda.avgScore.toFixed(1)}
            </div>
            <div>
              {/* Stars */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ fontSize: 20, color: i <= Math.round(soda.avgScore!) ? gold : rule }}>★</div>
                ))}
              </div>
              <div style={{
                fontFamily: "'Libre Baskerville', Georgia, serif",
                fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: gold,
                marginBottom: 2,
              }}>
                Group Average
              </div>
              <div style={{
                fontFamily: "'Libre Baskerville', Georgia, serif",
                fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: muted,
              }}>
                {soda.ratings.length} Rating{soda.ratings.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{ flex: 1, height: 1, background: rule }} />
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: gold }} />
          <div style={{ flex: 1, height: 1, background: rule }} />
        </div>

        {/* Tasting note */}
        {topNote && (
          <div style={{
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontSize: 14, fontStyle: 'italic', color: '#c8b89a',
            lineHeight: 1.7, borderLeft: `2px solid ${gold}`, paddingLeft: 16,
            marginBottom: 22,
          }}>
            "{topNote.length > 120 ? topNote.slice(0, 117) + '…' : topNote}"
          </div>
        )}

        {/* Individual rater scores */}
        {raterRows.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            {raterRows.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  fontFamily: "'Libre Baskerville', Georgia, serif",
                  fontSize: 12, color: '#a89070',
                }}>
                  {r.displayName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} style={{ fontSize: 11, color: i <= r.score ? gold : rule }}>★</div>
                    ))}
                  </div>
                  <div style={{
                    fontFamily: "'Libre Baskerville', Georgia, serif",
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
    </div>
  );
}
