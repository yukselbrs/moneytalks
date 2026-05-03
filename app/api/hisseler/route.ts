import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BIST_HISSELER } from "@/lib/bist-hisseler";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SAYFA_BOYUTU = 25;

// Whitelist — frontend'den gelen sort key'i Supabase kolonuna map'liyoruz
const SORT_MAP: Record<string, { col: string; ascDefault: boolean }> = {
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

  const snapMap = new Map((snaps || []).map((snap) => [snap.ticker, snap]));
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
  const items = slicedTickers.map((ticker) => formatRow(HISSE_META.get(ticker), snapMap.get(ticker)));

  return NextResponse.json({
    items,
    total: sortedTickers.length,
    page,
    pageSize: SAYFA_BOYUTU,
  });
}

function formatRow(meta: { ticker: string; ad: string; domain?: string } | undefined, snap: any) {
  if (!meta) {
    return { ticker: snap?.ticker || "", ad: "", domain: undefined, fiyat: null };
  }
  if (!snap || snap.fiyat === null) {
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
  return {
    ticker: meta.ticker,
    ad: meta.ad,
    domain: meta.domain,
    fiyat: Number(snap.fiyat).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    degisim: Number(snap.degisim_yuzde).toFixed(2),
    yukselis: Number(snap.degisim_yuzde) >= 0,
    hacim: snap.hacim,
    piyasaDegeri: snap.piyasa_degeri,
    getiri_1h: snap.getiri_1h !== null ? Number(snap.getiri_1h).toFixed(2) : null,
    getiri_1a: snap.getiri_1a !== null ? Number(snap.getiri_1a).toFixed(2) : null,
    getiri_3a: snap.getiri_3a !== null ? Number(snap.getiri_3a).toFixed(2) : null,
    getiri_1y: snap.getiri_1y !== null ? Number(snap.getiri_1y).toFixed(2) : null,
  };
}
