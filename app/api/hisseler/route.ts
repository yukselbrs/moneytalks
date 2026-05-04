import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BIST_HISSELER } from "@/lib/bist-hisseler";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SAYFA_BOYUTU = 25;

type HisseSnapshot = {
  ticker: string;
  fiyat: number | string | null;
  degisim_yuzde: number | string | null;
  hacim: number | null;
  piyasa_degeri: number | null;
  getiri_1h: number | string | null;
  getiri_1a: number | string | null;
  getiri_3a: number | string | null;
  getiri_1y: number | string | null;
};

type LiveFiyat = {
  fiyat: number;
  degisim: number;
  hacim: number | null;
  piyasaDegeri: number | null;
};

type SnapshotSortColumn = keyof HisseSnapshot;

// Whitelist — frontend'den gelen sort key'i Supabase kolonuna map'liyoruz
const SORT_MAP: Record<string, { col: SnapshotSortColumn; ascDefault: boolean }> = {
  alfabetik: { col: "ticker", ascDefault: true },
  yukselis: { col: "degisim_yuzde", ascDefault: false },
  dusus: { col: "degisim_yuzde", ascDefault: true },
  hacim: { col: "hacim", ascDefault: false },
  piyasa: { col: "piyasa_degeri", ascDefault: false },
  "1wk": { col: "getiri_1h", ascDefault: false },
  "1mo": { col: "getiri_1a", ascDefault: false },
  "3mo": { col: "getiri_3a", ascDefault: false },
  "1y": { col: "getiri_1y", ascDefault: false },
};

// ticker → { ad, domain } hızlı lookup
const HISSE_META = new Map(BIST_HISSELER.map((h) => [h.ticker, h]));

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sort = sp.get("sort") || "alfabetik";
  const pageParam = parseInt(sp.get("page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const q = (sp.get("q") || "").trim().toUpperCase();

  const sortDef = SORT_MAP[sort] || SORT_MAP.alfabetik;

  // Arama — BIST_HISSELER üzerinden ticker veya ad ile baştan eşleşme
  let allowedTickers: string[] | null = null;
  if (q !== "") {
    allowedTickers = BIST_HISSELER.filter(
      (h) => h.ticker.startsWith(q) || h.ad.toUpperCase().startsWith(q)
    ).map((h) => h.ticker);
  }

  const allTickers = q !== "" ? allowedTickers! : BIST_HISSELER.map((h) => h.ticker);
  if (allTickers.length === 0) {
    return NextResponse.json({ items: [], total: 0, page, pageSize: SAYFA_BOYUTU });
  }

  const { data: snaps, error } = await supabase
    .from("hisse_snapshots")
    .select("*")
    .in("ticker", allTickers);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const typedSnaps = (snaps || []) as HisseSnapshot[];
  const snapMap = new Map(typedSnaps.map((snap) => [snap.ticker, snap]));
  const sortedTickers = [...allTickers].sort((a, b) => {
    if (sort === "alfabetik") return a.localeCompare(b, "tr");

    const snapA = snapMap.get(a);
    const snapB = snapMap.get(b);
    const rawA = snapA?.[sortDef.col];
    const rawB = snapB?.[sortDef.col];
    const hasA = rawA !== null && rawA !== undefined;
    const hasB = rawB !== null && rawB !== undefined;

    if (!hasA && !hasB) return a.localeCompare(b, "tr");
    if (!hasA) return 1;
    if (!hasB) return -1;

    const valueA = Number(rawA);
    const valueB = Number(rawB);
    return sortDef.ascDefault ? valueA - valueB : valueB - valueA;
  });

  const from = (page - 1) * SAYFA_BOYUTU;
  const slicedTickers = sortedTickers.slice(from, from + SAYFA_BOYUTU);
  const liveMap = await fetchLiveFiyatlar(slicedTickers);
  const items = slicedTickers.map((ticker) => formatRow(HISSE_META.get(ticker), snapMap.get(ticker), liveMap.get(ticker)));

  const response = NextResponse.json({
    items,
    total: sortedTickers.length,
    page,
    pageSize: SAYFA_BOYUTU,
  });
  response.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
  return response;
}

async function fetchLiveFiyatlar(tickers: string[]) {
  const results = await Promise.all(
    tickers.map(async (ticker): Promise<[string, LiveFiyat | null]> => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=1d`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 15 },
        });
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        const fiyat = Number(meta?.regularMarketPrice);
        if (!Number.isFinite(fiyat)) return [ticker, null];
        const onceki = Number(meta?.chartPreviousClose ?? meta?.previousClose);
        const degisim = Number.isFinite(onceki) && onceki > 0 ? ((fiyat - onceki) / onceki) * 100 : 0;
        return [ticker, {
          fiyat,
          degisim,
          hacim: Number.isFinite(Number(meta?.regularMarketVolume)) ? Number(meta.regularMarketVolume) : null,
          piyasaDegeri: Number.isFinite(Number(meta?.marketCap)) ? Number(meta.marketCap) : null,
        }];
      } catch {
        return [ticker, null];
      }
    })
  );
  return new Map(results.filter((entry): entry is [string, LiveFiyat] => entry[1] !== null));
}

function formatRow(meta: { ticker: string; ad: string; domain?: string } | undefined, snap?: HisseSnapshot, live?: LiveFiyat) {
  if (!meta) {
    return { ticker: snap?.ticker || "", ad: "", domain: undefined, fiyat: null };
  }
  if (!live && (!snap || snap.fiyat === null)) {
    return {
      ticker: meta.ticker,
      ad: meta.ad,
      domain: meta.domain,
      fiyat: null,
      degisim: null,
      yukselis: null,
      hacim: null,
      piyasaDegeri: null,
      getiri_1h: null,
      getiri_1a: null,
      getiri_3a: null,
      getiri_1y: null,
    };
  }
  const fiyat = live?.fiyat ?? Number(snap?.fiyat);
  const degisim = live?.degisim ?? Number(snap?.degisim_yuzde);
  return {
    ticker: meta.ticker,
    ad: meta.ad,
    domain: meta.domain,
    fiyat: fiyat.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    degisim: degisim.toFixed(2),
    yukselis: degisim >= 0,
    hacim: live?.hacim ?? snap?.hacim ?? null,
    piyasaDegeri: live?.piyasaDegeri ?? snap?.piyasa_degeri ?? null,
    getiri_1h: snap?.getiri_1h !== null && snap?.getiri_1h !== undefined ? Number(snap.getiri_1h).toFixed(2) : null,
    getiri_1a: snap?.getiri_1a !== null && snap?.getiri_1a !== undefined ? Number(snap.getiri_1a).toFixed(2) : null,
    getiri_3a: snap?.getiri_3a !== null && snap?.getiri_3a !== undefined ? Number(snap.getiri_3a).toFixed(2) : null,
    getiri_1y: snap?.getiri_1y !== null && snap?.getiri_1y !== undefined ? Number(snap.getiri_1y).toFixed(2) : null,
  };
}
