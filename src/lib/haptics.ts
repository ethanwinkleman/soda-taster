const enabled = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export function hapticTap() {
  if (enabled) navigator.vibrate(5);
}

export function hapticMedium() {
  if (enabled) navigator.vibrate(10);
}

export function hapticSuccess() {
  if (enabled) navigator.vibrate([4, 30, 8]);
}

export function hapticError() {
  if (enabled) navigator.vibrate(25);
}
