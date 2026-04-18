import type { SodaEntry } from '../types/soda';

const STORAGE_KEY = 'soda-taster-entries';

export function loadSodas(): SodaEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SodaEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveSodas(sodas: SodaEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sodas));
}

export function addSoda(soda: SodaEntry): SodaEntry[] {
  const sodas = loadSodas();
  const updated = [soda, ...sodas];
  saveSodas(updated);
  return updated;
}

export function updateSoda(updated: SodaEntry): SodaEntry[] {
  const sodas = loadSodas().map((s) => (s.id === updated.id ? updated : s));
  saveSodas(sodas);
  return sodas;
}

export function deleteSoda(id: string): SodaEntry[] {
  const sodas = loadSodas().filter((s) => s.id !== id);
  saveSodas(sodas);
  return sodas;
}
