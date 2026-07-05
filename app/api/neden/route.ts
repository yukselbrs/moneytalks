import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeTicker } from "@/lib/utils";
import { TIP_ETIKET, type KapBildirimTipi } from "@/lib/kap-ozet";

const MAX_TICKERS = 20;
const TTL = 60000;

type KapEslesme = {
  index: number;
  tipEtiket: string;
  ozet: string | null;
};

type NedenYaniti = {
  endeksDegisim: number | null;
  hisseler: Record<string, { kap: KapEslesme | null }>;
};

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

  const [endeksDegisim, kapEslesmeleri] = await Promise.all([
    fetchEndeksDegisim(),
    fetchKapEslesmeleri(tickers),
  ]);

  const payload: NedenYaniti = {
    endeksDegisim,
    hisseler: Object.fromEntries(tickers.map(t => [t, { kap: kapEslesmeleri[t] }])),
  };

  if (g.nedenCache!.size > 50) g.nedenCache!.clear();
  g.nedenCache!.set(cacheKey, { payload, ts: Date.now() });

  return NextResponse.json(payload);
}
