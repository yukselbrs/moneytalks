// Sabit pencereli sayac (in-memory) — rate-limit fallback'inin saf cekirdegi.
// Supabase RPC erisilemedigi anlarda lib/rate-limit.ts bunu kullanir; birim testleri tests/fixed-window.test.ts'te.

export type PencereKaydi = { count: number; windowStart: number };

export const FALLBACK_MAX_KEYS = 5000;

export function fixedWindowHit(
  map: Map<string, PencereKaydi>,
  key: string,
  windowSeconds: number,
  max: number,
  now: number = Date.now()
): boolean {
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
  const entry = map.get(key);

  if (!entry || entry.windowStart !== windowStart) {
    if (map.size >= FALLBACK_MAX_KEYS) {
      for (const [k, v] of map) {
        if (v.windowStart !== windowStart) map.delete(k);
        if (map.size < FALLBACK_MAX_KEYS) break;
      }
    }
    map.set(key, { count: 1, windowStart });
    return true;
  }

  entry.count++;
  return entry.count <= max;
}
