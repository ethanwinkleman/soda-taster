export interface SodaProductCandidate {
  name: string;
  manufacturer: string;
  imageUrl: string | null;
  source: 'open_food_facts' | 'barcode_lookup';
}

export interface BarcodeResult {
  barcode: string;
  candidates: SodaProductCandidate[];
  isAmbiguous: boolean;
}

const GENERIC_TERMS = ['cola', 'soda', 'beverage', 'drink', 'pop', 'soft drink', 'carbonated'];

function isGenericName(name: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  return GENERIC_TERMS.some((t) => lower === t || lower.endsWith(` ${t}`));
}

function isComplete(c: SodaProductCandidate): boolean {
  return !!(c.name && c.manufacturer && c.imageUrl);
}

async function lookupOpenFoodFacts(barcode: string): Promise<SodaProductCandidate | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const name = ((p.product_name as string) || (p.generic_name as string) || '').trim();
    const rawBrands = ((p.brands as string) || '').trim();
    const manufacturer = rawBrands.includes(',')
      ? rawBrands.split(',').map((s: string) => s.trim()).filter(Boolean).at(-1) ?? rawBrands
      : rawBrands;
    const imageUrl: string | null = p.image_front_url || p.image_url || null;

    if (!name && !manufacturer) return null;
    return { name, manufacturer, imageUrl, source: 'open_food_facts' };
  } catch {
    return null;
  }
}

async function lookupBarcodeApi(barcode: string): Promise<SodaProductCandidate | null> {
  const key = import.meta.env.VITE_BARCODE_LOOKUP_KEY as string | undefined;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.barcodelookup.com/v3/products?barcode=${barcode}&formatted=y&key=${key}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const p = data.products?.[0];
    if (!p) return null;

    return {
      name: (p.title as string) || '',
      manufacturer: (p.manufacturer as string) || '',
      imageUrl: (p.images?.[0] as string) || null,
      source: 'barcode_lookup',
    };
  } catch {
    return null;
  }
}

export async function lookupBarcode(barcode: string): Promise<BarcodeResult> {
  const [offResult, blResult] = await Promise.all([
    lookupOpenFoodFacts(barcode),
    lookupBarcodeApi(barcode),
  ]);

  const candidates: SodaProductCandidate[] = [];

  if (!offResult && !blResult) {
    return { barcode, candidates: [], isAmbiguous: false };
  }

  if (offResult && blResult) {
    const namesDiffer =
      offResult.name &&
      blResult.name &&
      offResult.name.toLowerCase() !== blResult.name.toLowerCase();

    if (namesDiffer) {
      // Two distinct products — offer both for disambiguation
      candidates.push(offResult, blResult);
    } else {
      // Merge: fill gaps in OFF result with BL data
      const merged: SodaProductCandidate = {
        name: offResult.name || blResult.name,
        manufacturer: offResult.manufacturer || blResult.manufacturer,
        imageUrl: offResult.imageUrl || blResult.imageUrl,
        source: 'open_food_facts',
      };
      candidates.push(merged);
    }
  } else {
    candidates.push((offResult ?? blResult)!);
  }

  const primary = candidates[0];
  const isAmbiguous =
    candidates.length > 1 ||
    isGenericName(primary.name) ||
    (!primary.name && !!primary.manufacturer) ||
    !isComplete(primary);

  // Rank: complete records first, then by source preference
  const ranked = [...candidates].sort((a, b) => {
    const aFull = isComplete(a) ? 1 : 0;
    const bFull = isComplete(b) ? 1 : 0;
    return bFull - aFull;
  });

  return { barcode, candidates: ranked.slice(0, 8), isAmbiguous };
}
