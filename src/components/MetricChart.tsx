interface Props {
  label: string;
  values: { bucket: string; value: number }[];
  /** A Cherry Fizz token, e.g. 'var(--color-sky-500)'. */
  color: string;
}

/**
 * A small bar chart drawn as inline SVG.
 *
 * Hand-rolled rather than pulling in a chart library: the whole job is "N daily counts,
 * scaled to the tallest", and the smallest charting dependency would outweigh the rest
 * of this page several times over. Also means it inherits the theme for free.
 */
export function MetricChart({ label, values, color }: Props) {
  const total = values.reduce((sum, v) => sum + v.value, 0);
  const max = Math.max(1, ...values.map((v) => v.value));
  const w = 100;
  const h = 34;
  const gap = 0.6;
  const barW = values.length ? (w - gap * (values.length - 1)) / values.length : w;

  const first = values[0]?.bucket;
  const last = values[values.length - 1]?.bucket;
  const fmt = (d?: string) =>
    d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="font-display text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {total}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full h-14"
        role="img"
        aria-label={`${label}: ${total} over ${values.length} days, peak ${max} in a day`}
      >
        {values.map((v, i) => {
          // Zero still gets a sliver so the day reads as present-but-empty, not missing.
          const barH = v.value === 0 ? 0.8 : Math.max(1.2, (v.value / max) * h);
          return (
            <rect
              key={v.bucket}
              x={i * (barW + gap)}
              y={h - barH}
              width={barW}
              height={barH}
              rx={0.6}
              fill={v.value === 0 ? 'currentColor' : color}
              className={v.value === 0 ? 'text-gray-200 dark:text-gray-700' : undefined}
            >
              <title>{`${v.bucket}: ${v.value}`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="flex justify-between mt-2 font-sans text-[9px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
        <span>{fmt(first)}</span>
        <span>peak {max}/day</span>
        <span>{fmt(last)}</span>
      </div>
    </div>
  );
}
