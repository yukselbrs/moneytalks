import { createClient } from "@supabase/supabase-js";
import { fixedWindowHit, type PencereKaydi } from "@/lib/fixed-window";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const g = globalThis as typeof globalThis & {
  rateLimitFallback?: Map<string, PencereKaydi>;
};
if (!g.rateLimitFallback) g.rateLimitFallback = new Map();

function fallbackHit(key: string, windowSeconds: number, max: number): boolean {
  return fixedWindowHit(g.rateLimitFallback!, key, windowSeconds, max);
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
