/**
 * Filing what broke.
 *
 * Only this half touches the network, and it never throws: a reporter that can break
 * the app it is watching is worse than no reporter. Every decision it makes — what is
 * worth reporting, what a path may say, how much of a stack to keep — lives in
 * errorReporting.ts, where it is tested.
 */

import { supabase } from './supabase';
import { shouldReport, truncate, normalisePath, isDuplicate, budgetLeft } from './errorReporting';

// Session state. Deliberately not persisted: a new tab should report again, because a
// bug that survives a reload is worth hearing about twice.
const seen = new Set<string>();
let sent = 0;

/** Test seam: forget what this session has reported. */
export function resetReportingState() {
  seen.clear();
  sent = 0;
}

export async function report(error: unknown): Promise<void> {
  try {
    const err = error instanceof Error ? error : new Error(String(error ?? ''));
    const message = truncate(err.message.trim(), 500);

    if (!shouldReport(message) || isDuplicate(message, seen) || !budgetLeft(sent)) return;
    seen.add(message);
    sent += 1;

    const { data } = await supabase.auth.getSession();

    await supabase.from('client_errors').insert({
      user_id: data.session?.user.id ?? null,
      message,
      stack: err.stack ? truncate(err.stack, 4000) : null,
      path: truncate(normalisePath(window.location.pathname), 300),
      user_agent: truncate(navigator.userAgent, 400),
      app_version: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : null,
    });
  } catch {
    // A reporter that throws takes down the thing it is reporting on.
  }
}

/** Window-level failures. React's own are caught by ErrorBoundary. */
export function installErrorReporting(): () => void {
  const onError = (e: ErrorEvent) => { void report(e.error ?? e.message); };
  const onRejection = (e: PromiseRejectionEvent) => { void report(e.reason); };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
