import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { fetchLiveTefasSnapshot, type FonSnapshotRow } from "@/lib/tefas-fonlar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SAYFA_BOYUTU = 25;
const LIVE_CACHE_TTL_MS = 60 * 60 * 1000;

let liveFallbackCache: { rows: FonSnapshotRow[]; fetchedAt: number } | null = null;

const fetchCachedLiveTefasSnapshot = unstable_cache(
  async () => fetchLiveTefasSnapshot(),
  ["tefas-fonlar-live-snapshot-v1"],
  { revalidate: 60 * 60 }
);

type SortColumn = keyof FonSnapshotRow;

const SORT_MAP: Record<string, { col: SortColumn; ascDefault: boolean }> = {
  alfabetik: { col: "kod", ascDefault: true },
  gun: { col: "gunluk_getiri", ascDefault: false },
  "1mo": { col: "getiri_1a", ascDefault: false },
  "3mo": { col: "getiri_3a", ascDefault: false },
  "6mo": { col: "getiri_6a", ascDefault: false },
  "1y": { col: "getiri_1y", ascDefault: false },
  risk: { col: "risk_degeri", ascDefault: true },
  buyukluk: { col: "portfoy_buyukluk", ascDefault: false },
  kisi: { col: "kisi_sayisi", ascDefault: false },
  ucret: { col: "yonetim_ucreti_yillik", ascDefault: true },
};

function safeNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalize(row: Partial<FonSnapshotRow>): FonSnapshotRow {
  return {
    kod: row.kod || "",
    unvan: row.unvan || "",
    kategori: row.kategori ?? null,
    fiyat: safeNumber(row.fiyat),
    gunluk_getiri: safeNumber(row.gunluk_getiri),
    getiri_1a: safeNumber(row.getiri_1a),
    getiri_3a: safeNumber(row.getiri_3a),
    getiri_6a: safeNumber(row.getiri_6a),
    getiri_1y: safeNumber(row.getiri_1y),
    getiri_yb: safeNumber(row.getiri_yb),
    getiri_3y: safeNumber(row.getiri_3y),
    getiri_5y: safeNumber(row.getiri_5y),
    risk_degeri: safeNumber(row.risk_degeri),
    portfoy_buyukluk: safeNumber(row.portfoy_buyukluk),
    kisi_sayisi: safeNumber(row.kisi_sayisi),
    tedavuldeki_pay: safeNumber(row.tedavuldeki_pay),
    yonetim_ucreti_yillik: safeNumber(row.yonetim_ucreti_yillik),
    toplam_gider_orani: safeNumber(row.toplam_gider_orani),
    tefas_durum: row.tefas_durum ?? null,
    veri_tarihi: row.veri_tarihi ?? null,
  };
}

function formatPercent(value: number | null) {
  return value !== null ? value.toFixed(2) : null;
}

function formatRow(row: FonSnapshotRow) {
  return {
    kod: row.kod,
    unvan: row.unvan,
    kategori: row.kategori,
    fiyat: row.fiyat !== null
      ? row.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 6 })
      : null,
    gunluk_getiri: formatPercent(row.gunluk_getiri),
    getiri_1a: formatPercent(row.getiri_1a),
    getiri_3a: formatPercent(row.getiri_3a),
    getiri_6a: formatPercent(row.getiri_6a),
    getiri_1y: formatPercent(row.getiri_1y),
    getiri_yb: formatPercent(row.getiri_yb),
    risk_degeri: row.risk_degeri,
    portfoy_buyukluk: row.portfoy_buyukluk,
    kisi_sayisi: row.kisi_sayisi,
    yonetim_ucreti_yillik: row.yonetim_ucreti_yillik,
    toplam_gider_orani: row.toplam_gider_orani,
    tefas_durum: row.tefas_durum,
    veri_tarihi: row.veri_tarihi,
  };
}

async function getRows(forceLive: boolean) {
  if (forceLive) {
    const rows = await fetchLiveTefasSnapshot();
    liveFallbackCache = { rows, fetchedAt: Date.now() };
    return rows;
  }

  if (!forceLive) {
    const { data, error } = await supabase
      .from("fon_snapshots")
      .select("*");
    if (!error && data && data.length > 0) return data.map((row) => normalize(row as Partial<FonSnapshotRow>));
  }

  if (liveFallbackCache && Date.now() - liveFallbackCache.fetchedAt < LIVE_CACHE_TTL_MS) {
    return liveFallbackCache.rows;
  }

  const rows = await fetchCachedLiveTefasSnapshot();
  liveFallbackCache = { rows, fetchedAt: Date.now() };
  return rows;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sort = sp.get("sort") || "alfabetik";
  const tefasParam = sp.get("tefas");
  const tefasFilter = tefasParam === "kapali" || tefasParam === "tumu" ? tefasParam : "acik";
  const dirParam = sp.get("dir");
  const explicitDir = dirParam === "asc" || dirParam === "desc" ? dirParam : null;
  const pageParam = parseInt(sp.get("page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const q = (sp.get("q") || "").trim().toLocaleUpperCase("tr-TR");
  const forceLive = sp.get("force") === "1";
  const sortDef = SORT_MAP[sort] || SORT_MAP.alfabetik;

  try {
    const rows = (await getRows(forceLive))
      .filter((row) => {
        if (tefasFilter === "tumu") return true;
        if (tefasFilter === "kapali") return row.tefas_durum === false;
        return row.tefas_durum !== false;
      })
      .filter((row) => {
        if (!q) return true;
        return row.kod.toLocaleUpperCase("tr-TR").startsWith(q)
          || row.unvan.toLocaleUpperCase("tr-TR").includes(q)
          || (row.kategori ?? "").toLocaleUpperCase("tr-TR").includes(q);
      });

    const sorted = [...rows].sort((a, b) => {
      if (sort === "alfabetik") return a.kod.localeCompare(b.kod, "tr");
      const rawA = a[sortDef.col];
      const rawB = b[sortDef.col];
      const valueA = typeof rawA === "number" ? rawA : null;
      const valueB = typeof rawB === "number" ? rawB : null;
      const hasA = valueA !== null && Number.isFinite(valueA);
      const hasB = valueB !== null && Number.isFinite(valueB);
      if (!hasA && !hasB) return a.kod.localeCompare(b.kod, "tr");
      if (!hasA) return 1;
      if (!hasB) return -1;
      const asc = explicitDir ? explicitDir === "asc" : sortDef.ascDefault;
      return asc ? valueA - valueB : valueB - valueA;
    });

    const from = (page - 1) * SAYFA_BOYUTU;
    const items = sorted.slice(from, from + SAYFA_BOYUTU).map(formatRow);
    const response = NextResponse.json({ items, total: sorted.length, page, pageSize: SAYFA_BOYUTU });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fon verisi alınamadı", items: [], total: 0, page, pageSize: SAYFA_BOYUTU },
      { status: 500 }
    );
  }
}
