import { createClient } from "@supabase/supabase-js";
import { BIST_HISSELER } from "@/lib/bist-hisseler";

// Yeni kotasyon overlay'i: halka arz lifecycle'i "islem_goruyor"a cevirdigi ama repo evreni
// (data/bist-companies.json) henuz sync edilmedigi aradaki gunlerde hisseyi SITEDE gostermek icin.
// Kalici uyelik sync-bist-companies.mjs + commit ile gelir; overlay o ana kadarki koprudur
// (statik listeye girince filtreyle otomatik dusuyor). Hata/eksik tabloda guvenle bos doner.

export type OverlayHisse = { ticker: string; ad: string };

let cache: { ts: number; items: OverlayHisse[] } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function yeniKotasyonOverlay(): Promise<OverlayHisse[]> {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.items;
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase
      .from("halka_arzlar")
      .select("kod, sirket_adi")
      .eq("durum", "islem_goruyor");
    if (error) throw error;
    const statik = new Set(BIST_HISSELER.map((h) => h.ticker));
    const items = (data ?? [])
      .filter((r) => r.kod && !statik.has(r.kod))
      .map((r) => ({ ticker: r.kod as string, ad: (r.sirket_adi as string) || r.kod }));
    cache = { ts: Date.now(), items };
    return items;
  } catch {
    return cache?.items ?? [];
  }
}
