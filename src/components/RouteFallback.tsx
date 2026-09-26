/**
 * What a route shows while its chunk is still downloading.
 *
 * Both Suspense boundaries used to have no fallback, so React rendered null — measured
 * on a throttled connection, the whole screen was blank for the entire download.
 *
 * It waits 250 ms before appearing. A navigation that resolves quickly, which is most
 * of them, should look instant rather than flashing a spinner on its way past; the
 * delay lives in the CSS animation rather than a timer so there is no state to manage.
 */
export function RouteFallback() {
  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center gap-3 opacity-0 animate-route-fallback motion-reduce:animate-none motion-reduce:opacity-100"
      role="status"
      aria-label="Loading"
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <clipPath id="route-cup"><path d="M6 8 L7.75 20.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8 Z" /></clipPath>
        </defs>
        <g clipPath="url(#route-cup)">
          <rect x="5" y="14" width="14" height="8" className="fill-sky-500/30" />
          <g className="fill-sky-500">
            <circle cx="9.5" cy="20" r="0.7" className="animate-route-fizz motion-reduce:hidden" />
            <circle cx="12" cy="20" r="0.9" className="animate-route-fizz [animation-delay:0.25s] motion-reduce:hidden" />
            <circle cx="14.5" cy="20" r="0.6" className="animate-route-fizz [animation-delay:0.5s] motion-reduce:hidden" />
          </g>
        </g>
        <g className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8" />
          <path d="M5 8h14" />
          <path d="m12 8 1-6h2" />
        </g>
      </svg>
    </div>
  );
}
