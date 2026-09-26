/**
 * Which way a navigation is going, which is what the page transition animates on.
 *
 * Derived from the navigation type and the destination rather than from a remembered
 * previous path: a ref read during render is what the lint rules here forbid, and POP
 * already means "backwards" for every case this needs to tell apart.
 */

export interface Direction {
  /** Back, so the page sinks rather than rises. */
  goingBack: boolean;
  /** Forward into content, which is the only time the fizz plays. */
  goingDeeper: boolean;
}

/** Path depth: home is 0, a collection 2 segments, a soda 4. */
export function pathDepth(pathname: string): number {
  return pathname.split('/').filter(Boolean).length;
}

export function navDirection(navType: string, pathname: string): Direction {
  const goingBack = navType === 'POP';
  return {
    goingBack,
    // Arriving at home is not going deeper even on a push — it is where you came from.
    goingDeeper: !goingBack && pathDepth(pathname) > 0,
  };
}
