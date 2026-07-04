import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type FallbackEntry = { count: number; windowStart: number };

const g = globalThis as typeof globalThis & {
  rateLimitFallback?: Map<string, FallbackEntry>;
};
if (!g.rateLimitFallback) g.rateLimitFallback = new Map();

const FALLBACK_MAX_KEYS = 5000;

function fallbackHit(key: string, windowSeconds: number, max: number): boolean {
  const map = g.rateLimitFallback!;
  const now = Date.now();
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

export type RateLimitSonuc = { allowed: boolean; degraded: boolean };

export async function rateLimitHit(key: string, windowSeconds: number, max: number): Promise<RateLimitSonuc> {
  try {
    const { data, error } = await supabaseAdmin.rpc("rate_limit_hit", {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) throw error;
    return { allowed: data === true, degraded: false };
  } catch {
    return { allowed: fallbackHit(key, windowSeconds, max), degraded: true };
  }
}

export function istekIpAdresi(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "bilinmiyor";
}
