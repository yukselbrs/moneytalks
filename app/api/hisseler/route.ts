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

type LiveGetiriler = {
  getiri_1h: number | null;
  getiri_1a: number | null;
  getiri_3a: number | null;
  getiri_1y: number | null;
};

type SnapshotSortColumn = keyof HisseSnapshot;

// Whitelist — frontend'den gelen sort key'i Supabase kolonuna map'liyoruz
const SORT_MAP: Record<string, { col: SnapshotSortColumn; ascDefault: boolean }> = {
  alfabetik: { col: "ticker", ascDefault: true },
  fiyat: { col: "fiyat", ascDefault: false },
  gun: { col: "degisim_yuzde", ascDefault: false },
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
const GUN = 24 * 60 * 60;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sort = sp.get("sort") || "alfabetik";
  const dirParam = sp.get("dir");
  const explicitDir = dirParam === "asc" || dirParam === "desc" ? dirParam : null;
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
  const shouldLiveSort = sort === "gun" || sort === "yukselis" || sort === "dusus" || sort === "fiyat";
  const shouldReturnSort = sort === "1wk" || sort === "1mo" || sort === "3mo" || sort === "1y";
  const sortLiveMap = shouldLiveSort ? await fetchLiveFiyatlar(allTickers) : new Map<string, LiveFiyat>();
  const sortReturnMap = shouldReturnSort ? await fetchLiveGetiriler(allTickers) : new Map<string, LiveGetiriler>();
  const sortedTickers = [...allTickers].sort((a, b) => {
    if (sort === "alfabetik") return a.localeCompare(b, "tr");

    const snapA = snapMap.get(a);
    const snapB = snapMap.get(b);
    const liveA = sortLiveMap.get(a);
    const liveB = sortLiveMap.get(b);
    const returnA = sortReturnMap.get(a);
    const returnB = sortReturnMap.get(b);
    const rawA = sortDef.col === "fiyat"
      ? (liveA?.fiyat ?? snapA?.fiyat)
      : sortDef.col === "degisim_yuzde"
        ? (liveA?.degisim ?? snapA?.degisim_yuzde)
        : shouldReturnSort
          ? (returnA?.[sortDef.col as keyof LiveGetiriler] ?? snapA?.[sortDef.col])
          : snapA?.[sortDef.col];
    const rawB = sortDef.col === "fiyat"
      ? (liveB?.fiyat ?? snapB?.fiyat)
      : sortDef.col === "degisim_yuzde"
        ? (liveB?.degisim ?? snapB?.degisim_yuzde)
        : shouldReturnSort
          ? (returnB?.[sortDef.col as keyof LiveGetiriler] ?? snapB?.[sortDef.col])
          : snapB?.[sortDef.col];
    const hasA = rawA !== null && rawA !== undefined;
    const hasB = rawB !== null && rawB !== undefined;

    if (!hasA && !hasB) return a.localeCompare(b, "tr");
    if (!hasA) return 1;
    if (!hasB) return -1;

    const valueA = Number(rawA);
    const valueB = Number(rawB);
    const asc = explicitDir ? explicitDir === "asc" : sortDef.ascDefault;
    return asc ? valueA - valueB : valueB - valueA;
  });

  const from = (page - 1) * SAYFA_BOYUTU;
  const slicedTickers = sortedTickers.slice(from, from + SAYFA_BOYUTU);
  const liveMap = shouldLiveSort ? sortLiveMap : await fetchLiveFiyatlar(slicedTickers);
  const returnMap = shouldReturnSort ? sortReturnMap : await fetchLiveGetiriler(slicedTickers);
  const items = slicedTickers.map((ticker) => formatRow(HISSE_META.get(ticker), snapMap.get(ticker), liveMap.get(ticker), returnMap.get(ticker)));

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

function findCloseAtOrBefore(timestamps: number[], closes: (number | null)[], targetTs: number) {
  for (let i = timestamps.length - 1; i >= 0; i--) {
    const close = closes[i];
    if (timestamps[i] <= targetTs && close !== null && close !== undefined) return close;
  }
  return null;
}

function findCloseAtOrAfter(timestamps: number[], closes: (number | null)[], targetTs: number) {
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (timestamps[i] >= targetTs && close !== null && close !== undefined) return close;
  }
  return null;
}

function findReferenceClose(timestamps: number[], closes: (number | null)[], targetTs: number) {
  const ilkTs = timestamps.find((_, i) => closes[i] !== null && closes[i] !== undefined);
  if (!ilkTs || ilkTs > targetTs) return null;
  return findCloseAtOrAfter(timestamps, closes, targetTs) ?? findCloseAtOrBefore(timestamps, closes, targetTs);
}

function kurumsalAksiyonlariAyarla(series: (number | null)[], opens: (number | null)[] = []) {
  const adjusted = [...series];
  for (let i = 1; i < adjusted.length; i++) {
    const prev = adjusted[i - 1];
    const curr = adjusted[i];
    if (!prev || !curr || prev <= 0 || curr <= 0) continue;
    const ratio = curr / prev;
    if (ratio < 0.55 || ratio > 1.8) {
      const openRatio = opens[i] && opens[i]! > 0 ? opens[i]! / prev : ratio;
      const factor = openRatio > 0 ? openRatio : ratio;
      for (let j = 0; j < i; j++) {
        if (adjusted[j] !== null && adjusted[j] !== undefined) adjusted[j] = adjusted[j]! * factor;
      }
    }
  }
  return adjusted;
}

async function fetchLiveGetiriler(tickers: string[]) {
  const results = await Promise.all(
    tickers.map(async (ticker): Promise<[string, LiveGetiriler | null]> => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=13mo`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 900 },
        });
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        const timestamps: number[] = result?.timestamp || [];
        const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];
        const opens: (number | null)[] = result?.indicators?.quote?.[0]?.open || [];
        const adjustedCloses: (number | null)[] = result?.indicators?.adjclose?.[0]?.adjclose || [];
        const baseSeries = adjustedCloses.length === closes.length ? adjustedCloses : closes;
        const returnSeries = kurumsalAksiyonlariAyarla(baseSeries, opens);
        const sonTs = timestamps[timestamps.length - 1];
        const son = Number(result?.meta?.regularMarketPrice) || findCloseAtOrBefore(timestamps, returnSeries, sonTs);
        if (!son || timestamps.length < 2) return [ticker, null];

        const getiri = (gunOnce: number) => {
          const targetTs = sonTs - gunOnce * GUN;
          const ref = findReferenceClose(timestamps, returnSeries, targetTs);
          if (!ref || ref === 0) return null;
          return ((son - ref) / ref) * 100;
        };

        return [ticker, {
          getiri_1h: getiri(7),
          getiri_1a: getiri(30),
          getiri_3a: getiri(90),
          getiri_1y: getiri(365),
        }];
      } catch {
        return [ticker, null];
      }
    })
  );
  return new Map(results.filter((entry): entry is [string, LiveGetiriler] => entry[1] !== null));
}

function formatRow(meta: { ticker: string; ad: string; domain?: string } | undefined, snap?: HisseSnapshot, live?: LiveFiyat, getiriler?: LiveGetiriler) {
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
    getiri_1h: formatGetiri(getiriler ? getiriler.getiri_1h : snap?.getiri_1h),
    getiri_1a: formatGetiri(getiriler ? getiriler.getiri_1a : snap?.getiri_1a),
    getiri_3a: formatGetiri(getiriler ? getiriler.getiri_3a : snap?.getiri_3a),
    getiri_1y: formatGetiri(getiriler ? getiriler.getiri_1y : snap?.getiri_1y),
  };
}

function formatGetiri(value: number | string | null | undefined) {
  return value !== null && value !== undefined ? Number(value).toFixed(2) : null;
}
