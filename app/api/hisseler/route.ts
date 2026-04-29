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
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const q = (sp.get("q") || "").trim().toUpperCase();

  const sortDef = SORT_MAP[sort] || SORT_MAP.alfabetik;

  // Arama — BIST_HISSELER üzerinden ticker veya ad ile baştan eşleşme
  let allowedTickers: string[] | null = null;
  if (q !== "") {
    allowedTickers = BIST_HISSELER.filter(
      (h) => h.ticker.startsWith(q) || h.ad.toUpperCase().startsWith(q)
    ).map((h) => h.ticker);
  }

  // Alfabetik sıralama: BIST_HISSELER listesini direkt kullan, snapshot'a join et
  if (sort === "alfabetik") {
    const filtered = q !== "" ? allowedTickers! : BIST_HISSELER.map((h) => h.ticker);
    const total = filtered.length;
    const sliced = filtered.slice((page - 1) * SAYFA_BOYUTU, page * SAYFA_BOYUTU);

    const { data: snaps, error } = await supabase
      .from("hisse_snapshots")
      .select("*")
      .in("ticker", sliced);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const snapMap = new Map(snaps?.map((s) => [s.ticker, s]) || []);
    const items = sliced.map((ticker) => {
      const meta = HISSE_META.get(ticker)!;
      const snap = snapMap.get(ticker);
      return formatRow(meta, snap);
    });

    return NextResponse.json({ items, total, page, pageSize: SAYFA_BOYUTU });
  }

  // Diğer sıralamalar: Supabase'de ORDER BY + range
  let query = supabase
    .from("hisse_snapshots")
    .select("*", { count: "exact" })
    .order(sortDef.col, { ascending: sortDef.ascDefault, nullsFirst: false });

  if (allowedTickers) {
    if (allowedTickers.length === 0) {
      return NextResponse.json({ items: [], total: 0, page, pageSize: SAYFA_BOYUTU });
    }
    query = query.in("ticker", allowedTickers);
  }

  const from = (page - 1) * SAYFA_BOYUTU;
  const to = from + SAYFA_BOYUTU - 1;
  query = query.range(from, to);

  const { data: snaps, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (snaps || []).map((snap) => {
    const meta = HISSE_META.get(snap.ticker);
    return formatRow(meta, snap);
  });

  return NextResponse.json({
    items,
    total: count || items.length,
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
