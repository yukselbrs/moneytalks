import { createClient } from "@supabase/supabase-js";
import { BIST_HISSELER } from "@/lib/bist-hisseler";
import { normalizeTicker } from "@/lib/utils";

// Yeni kotasyon overlay'i: halka arz lifecycle'i "islem_goruyor"a cevirdigi ama repo evreni
// (data/bist-companies.json) henuz sync edilmedigi aradaki gunlerde hisseyi SITEDE gostermek icin.
// Kalici uyelik sync-bist-companies.mjs + commit ile gelir; overlay o ana kadarki koprudur
// (statik listeye girince filtreyle otomatik dusuyor). Hata/eksik tabloda guvenle bos doner.

export type OverlayHisse = { ticker: string; ad: string; logoUrl: string | null };

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
      .select("kod, sirket_adi, logo_url")
      .eq("durum", "islem_goruyor");
    if (error) throw error;
    const statik = new Set(BIST_HISSELER.map((h) => h.ticker));
    const items = (data ?? [])
      .filter((r) => r.kod && !statik.has(r.kod))
      .map((r) => ({ ticker: r.kod as string, ad: (r.sirket_adi as string) || r.kod, logoUrl: (r.logo_url as string | null) ?? null }));
    cache = { ts: Date.now(), items };
    return items;
  } catch {
    return cache?.items ?? [];
  }
}

// Bir overlay hissesinin (yeni kotasyon) logo URL'i — hisse sayfasi StockLogo'suna beslenir.
// Statik evren hisseleri icin (zaten domain/logo cozumu var) null doner.
export async function overlayLogo(ticker: string): Promise<string | null> {
  const overlay = await yeniKotasyonOverlay();
  return overlay.find((o) => o.ticker === ticker.toUpperCase())?.logoUrl ?? null;
}

// normalizeTicker statik evrene bakar; overlay hisseleri (islem_goruyor, JSON'a henuz sync olmamis)
// orada yoktur. Format gecerli + overlay uyesiyse kabul et — aksi halde sahte ticker reddedilir.
// Detay sayfasi endpoint'lerinde (hisse-ozet, analiz) evren kapsamini overlay ile genisletir.
export async function tickerCozOverlayli(raw: unknown): Promise<string | null> {
  const std = normalizeTicker(raw);
  if (std) return std;
  if (typeof raw !== "string") return null;
  const temiz = raw.trim().toUpperCase().replace(/\.IS$/, "");
  if (!/^[A-Z0-9]{2,10}$/.test(temiz)) return null;
  const overlay = await yeniKotasyonOverlay();
  return overlay.some((o) => o.ticker === temiz) ? temiz : null;
}
