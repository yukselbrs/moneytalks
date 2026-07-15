import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeTicker } from "@/lib/utils";
import { TIP_ETIKET, type KapBildirimTipi } from "@/lib/kap-ozet";
import companies from "@/data/bist-companies.json";

const MAX_TICKERS = 20;
const TTL = 60000;

type KapEslesme = {
  index: number;
  tipEtiket: string;
  ozet: string | null;
};

type SektorBilgi = {
  ad: string;
  ortalama: number | null;
};

type NedenYaniti = {
  endeksDegisim: number | null;
  hisseler: Record<string, { kap: KapEslesme | null; sektor: SektorBilgi | null }>;
};

const SEKTOR_HARITASI: Record<string, string> = Object.fromEntries(
  (companies as { ticker: string; sektor?: string }[])
    .filter(c => c.sektor)
    .map(c => [c.ticker, c.sektor as string])
);

// Istenen ticker'larin sektorlerindeki gunluk ortalama degisim (hisse_snapshots'tan).
async function fetchSektorOrtalamalari(tickers: string[]): Promise<Record<string, SektorBilgi | null>> {
  const sonuc: Record<string, SektorBilgi | null> = Object.fromEntries(
    tickers.map(t => [t, SEKTOR_HARITASI[t] ? { ad: SEKTOR_HARITASI[t], ortalama: null } : null])
  );
  const sektorler = [...new Set(tickers.map(t => SEKTOR_HARITASI[t]).filter(Boolean))];
  if (!sektorler.length) return sonuc;

  const sektorTickerlari = (companies as { ticker: string; sektor?: string }[])
    .filter(c => c.sektor && sektorler.includes(c.sektor))
    .map(c => c.ticker);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase
    .from("hisse_snapshots")
    .select("ticker, degisim_yuzde")
    .in("ticker", sektorTickerlari);
  if (!data) return sonuc;

  const toplam: Record<string, { sum: number; n: number }> = {};
  for (const row of data as { ticker: string; degisim_yuzde: number | null }[]) {
    const sektor = SEKTOR_HARITASI[row.ticker];
    if (!sektor || row.degisim_yuzde === null) continue;
    toplam[sektor] = toplam[sektor] || { sum: 0, n: 0 };
    toplam[sektor].sum += row.degisim_yuzde;
    toplam[sektor].n++;
  }
  for (const t of tickers) {
    const sektor = SEKTOR_HARITASI[t];
    if (!sektor || !sonuc[t]) continue;
    const agg = toplam[sektor];
    sonuc[t] = { ad: sektor, ortalama: agg && agg.n >= 3 ? agg.sum / agg.n : null };
  }
  return sonuc;
}

type CacheEntry = { payload: NedenYaniti; ts: number };

const g = globalThis as typeof globalThis & { nedenCache?: Map<string, CacheEntry> };
if (!g.nedenCache) g.nedenCache = new Map();

async function fetchEndeksDegisim(): Promise<number | null> {
  try {
    const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?interval=1d&range=1d", {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const prev = meta?.chartPreviousClose || meta?.previousClose;
    if (!price || !prev) return null;
    return ((price - prev) / prev) * 100;
  } catch {
    return null;
  }
}

async function fetchKapEslesmeleri(tickers: string[]): Promise<Record<string, KapEslesme | null>> {
  const sonuc: Record<string, KapEslesme | null> = Object.fromEntries(tickers.map(t => [t, null]));
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const dun = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("kap_bildirimleri")
    .select("disclosure_index, tickerlar, bildirim_tipi, ozet_tek_cumle, kap_zamani")
    .overlaps("tickerlar", tickers)
    .gte("kap_zamani", dun)
    .order("kap_zamani", { ascending: false });

  if (!data) return sonuc;

  for (const b of data as { disclosure_index: number; tickerlar: string[]; bildirim_tipi: KapBildirimTipi; ozet_tek_cumle: string | null }[]) {
    for (const t of b.tickerlar) {
      if (!(t in sonuc) || sonuc[t]) continue;
      sonuc[t] = {
        index: b.disclosure_index,
        tipEtiket: TIP_ETIKET[b.bildirim_tipi] ?? "KAP Bildirimi",
        ozet: b.ozet_tek_cumle,
      };
    }
  }

  return sonuc;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("tickers");
  if (!raw) return NextResponse.json({ error: "tickers gerekli" }, { status: 400 });

  const tickers = [...new Set(raw.split(",").map(normalizeTicker).filter((t): t is string => t !== null))].slice(0, MAX_TICKERS);
  if (!tickers.length) return NextResponse.json({ error: "gecerli ticker yok" }, { status: 400 });

  const cacheKey = [...tickers].sort().join(",");
  const cached = g.nedenCache!.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) return NextResponse.json(cached.payload);

  const [endeksDegisim, kapEslesmeleri, sektorOrtalamalari] = await Promise.all([
    fetchEndeksDegisim(),
    fetchKapEslesmeleri(tickers),
    fetchSektorOrtalamalari(tickers),
  ]);

  const payload: NedenYaniti = {
    endeksDegisim,
    hisseler: Object.fromEntries(tickers.map(t => [t, { kap: kapEslesmeleri[t], sektor: sektorOrtalamalari[t] }])),
  };

  if (g.nedenCache!.size > 50) g.nedenCache!.clear();
  g.nedenCache!.set(cacheKey, { payload, ts: Date.now() });

  return NextResponse.json(payload);
}
