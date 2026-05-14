export interface RatingInput {
  sodaName: string;
  brand: string;
  score: number;
}

// Most specific patterns first — order determines which label wins on a match
const FLAVOR_RULES: [RegExp, string][] = [
  [/root.?beer/i,                                     'Root Beer'],
  [/birch.?beer/i,                                    'Birch Beer'],
  [/sarsaparilla/i,                                   'Sarsaparilla'],
  [/ginger/i,                                         'Ginger'],
  [/cream.?soda|egg.?cream|creamy/i,                  'Cream Soda'],
  [/vanilla/i,                                        'Cream Soda'],
  [/lemonade/i,                                       'Lemonade'],
  [/kombucha/i,                                       'Kombucha'],
  [/\btea\b|chai/i,                                   'Tea'],
  [/tonic/i,                                          'Tonic'],
  [/seltzer|sparkling.?water|club.?soda|mineral.?water/, 'Sparkling Water'],
  [/\bcola\b/i,                                       'Cola'],
  [/lemon|lime|citrus|orange|grapefruit|tangerine|yuzu/, 'Citrus'],
  [/cherry|grape|\bberry\b|strawberr|watermelon|peach|apricot|\bapple\b|mango|pineapple|pomegranate|passion|guava|kiwi|\bplum\b|raspberr|blueberr|cranberr|hibiscus/, 'Fruit'],
];

export function classifyFlavor(name: string, brand: string): string | null {
  const text = `${name} ${brand}`;
  for (const [pattern, label] of FLAVOR_RULES) {
    if (pattern.test(text)) return label;
  }
  return null;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function computeStats(ratings: RatingInput[]) {
  const total = ratings.length;
  const uniqueBrands = new Set(ratings.map((r) => r.brand.trim()).filter(Boolean)).size;
  const avg = total > 0 ? round1(ratings.reduce((s, r) => s + r.score, 0) / total) : 0;
  return { total, uniqueBrands, avg };
}

export function generateProfile(ratings: RatingInput[]): string | null {
  if (ratings.length < 5) return null;

  const { total, uniqueBrands, avg } = computeStats(ratings);

  // Flavor stats
  const flavorMap = new Map<string, number[]>();
  for (const r of ratings) {
    const f = classifyFlavor(r.sodaName, r.brand);
    if (f) {
      if (!flavorMap.has(f)) flavorMap.set(f, []);
      flavorMap.get(f)!.push(r.score);
    }
  }
  const flavorStats = Array.from(flavorMap.entries())
    .map(([category, scores]) => ({
      category,
      count: scores.length,
      avg: round1(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => b.count - a.count);

  // Brand stats
  const brandMap = new Map<string, number[]>();
  for (const r of ratings) {
    const key = r.brand.trim() || r.sodaName;
    if (!brandMap.has(key)) brandMap.set(key, []);
    brandMap.get(key)!.push(r.score);
  }
  const brandStats = Array.from(brandMap.entries())
    .map(([name, scores]) => ({
      name,
      count: scores.length,
      avg: round1(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => b.count - a.count);

  const topByCount = flavorStats[0] ?? null;
  const topByScore = flavorStats
    .filter((f) => f.count >= 2)
    .sort((a, b) => b.avg - a.avg)[0] ?? null;
  const topBrand = brandStats[0] ?? null;
  const adventurousness = uniqueBrands / total;

  const sentences: string[] = [];

  // — Sentence 1: flavor identity —
  if (topByCount && topByCount.count >= Math.ceil(total * 0.25)) {
    const pct = Math.round((topByCount.count / total) * 100);
    sentences.push(flavorLeadSentence(topByCount.category, pct, total));
  } else if (flavorStats.length >= 3) {
    const top3 = flavorStats.slice(0, 3).map((f) => f.category).join(', ');
    sentences.push(`Your palate ranges broadly — ${top3} each have a foothold in your records, with no single style claiming dominance.`);
  } else if (topByCount) {
    sentences.push(`Your collection is still finding its shape, with early entries leaning toward ${topByCount.category}.`);
  } else {
    sentences.push(`Your collection covers ground that defies easy categorization — a sign of genuine curiosity.`);
  }

  // — Sentence 2: the hidden preference reveal (most revelatory) —
  if (
    topByScore &&
    topByCount &&
    topByScore.category !== topByCount.category &&
    topByScore.avg >= 3.5
  ) {
    sentences.push(
      `What the numbers quietly reveal: while ${topByCount.category} fills most of your entries, it's ${topByScore.category} that earns your highest marks — averaging ${topByScore.avg} — a preference you may not have named until now.`
    );
  }

  // — Sentence 3: scoring personality —
  sentences.push(scoringSentence(avg));

  // — Sentence 4: adventurousness / loyalty —
  if (topBrand && topBrand.count >= 3) {
    const earnedIt = topBrand.avg >= 4.0 ? `, and earns it — your scores there average ${topBrand.avg}` : '';
    sentences.push(`${topBrand.name} appears in your record more than any other producer${earnedIt}.`);
  } else if (adventurousness > 0.75) {
    sentences.push(`You drink wide rather than deep — ${uniqueBrands} brands across ${total} sodas, rarely returning to the same label twice.`);
  } else if (adventurousness < 0.35 && topBrand) {
    sentences.push(`You are a loyal drinker: ${topBrand.name} has earned more of your attention than any other producer in the record.`);
  }

  return sentences.join(' ');
}

function flavorLeadSentence(flavor: string, pct: number, total: number): string {
  const share = pct >= 40 ? 'nearly half' : pct >= 30 ? 'nearly a third' : 'a quarter';
  const lines: Record<string, string> = {
    'Root Beer':       `Root beer is your native territory — ${share} of your ${total} sodas, staked out with clear intention.`,
    'Birch Beer':      `Birch beer leads your collection at ${share} of your entries — an unusual centerpiece that speaks to a deliberate palate.`,
    'Sarsaparilla':    `Sarsaparilla anchors ${share} of your collection — an old-world taste in a modern record.`,
    'Ginger':          `Ginger runs through your collection like a current, accounting for ${share} of your entries.`,
    'Cream Soda':      `Cream sodas have claimed ${share} of your collection — smooth, deliberate, unhurried.`,
    'Cola':            `Cola forms the backbone of your collection, making up ${share} of your ${total} sodas.`,
    'Citrus':          `Citrus defines your palate — bright, acidic, alive — at ${share} of your total entries.`,
    'Fruit':           `Fruit sodas form the core of your collection, ranging from cherry to mango at ${share} of your entries.`,
    'Sparkling Water': `Sparkling water anchors ${share} of your collection — you appreciate the elemental.`,
    'Lemonade':        `Lemonade accounts for ${share} of your collection — tart, straightforward, reliable.`,
    'Kombucha':        `Kombucha leads your collection at ${share} of entries — fermented, complex, an acquired taste you've clearly acquired.`,
    'Tea':             `Tea-based sodas anchor ${share} of your collection — a subtler current running through your taste.`,
    'Tonic':           `Tonic leads your collection at ${share} of entries — bitter, precise, not for everyone.`,
  };
  return lines[flavor] ?? `${flavor} accounts for ${share} of your ${total} sodas — it leads the rest by a clear margin.`;
}

function scoringSentence(avg: number): string {
  if (avg >= 4.2) return `An average of ${avg} marks you as a generous taster — you approach most sodas ready to be pleased, and usually are.`;
  if (avg >= 3.7) return `Your scores lean warm: ${avg} on average suggests an open palate, one that gives most sodas a fair hearing.`;
  if (avg >= 3.2) return `At ${avg} average, your scores reflect measured discernment — approval here is given, not assumed.`;
  if (avg >= 2.7) return `Your average of ${avg} signals real standards; most sodas have to work to earn your confidence.`;
  return `An average of ${avg} marks you as a demanding critic. The soda that earns a high score from you has genuinely earned it.`;
}
