import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps keyboard focus inside an open dialog, and puts it back where it came from
 * on close.
 *
 * Without this, Tab walks straight out of the dialog and into the page behind it —
 * which is still visible through the backdrop but not meant to be reachable. A screen
 * reader user ends up reading the page they thought they had covered up, with no
 * obvious way back, and on close lands at the top of the document rather than on the
 * control they opened.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    // Captured before we move focus, so it can be handed back on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const items = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
        // offsetParent is null for anything display:none — a collapsed section's
        // buttons must not become invisible tab stops.
        .filter((el) => el.offsetParent !== null);

    (items()[0] ?? node).focus();

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || activeEl === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [active, ref]);
}
