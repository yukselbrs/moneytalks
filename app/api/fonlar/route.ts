import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  fetchLatestTefasGeneral,
  fetchLiveTefasSnapshot,
  fetchTefasDailyReturns,
  fetchTefasGeneralRange,
  fetchTefasReturns,
  type FonSnapshotRow,
  type TefasFundGeneral,
  type TefasFundReturn,
} from "@/lib/tefas-fonlar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SAYFA_BOYUTU = 25;
const LIVE_CACHE_TTL_MS = 60 * 60 * 1000;
const ROWS_CACHE_TTL_MS = 5 * 60 * 1000;
const SUPABASE_PAGE_SIZE = 1000;
// Snapshot'in EKSIK/yarim yazilmadigini dogrulamak icin taban satir sayisi. TEFAS fon evreni
// zamanla degisir (kapali fonlar cikar); 2100 fazla katiydi (evren 2035'e inince tum istekler
// yavas canli TEFAS scrape'ine dusup fon sayfasini kilitliyordu). Kalite zaten priced>=900 &
// returnRows>=900 ile ayrica dogrulaniyor; bu esik yalnizca ciddi eksik snapshot'a karsi taban.
const MIN_SNAPSHOT_ROWS = 1500;

let liveFallbackCache: { rows: FonSnapshotRow[]; fetchedAt: number } | null = null;
let rowsCache: { rows: FonSnapshotRow[]; fetchedAt: number; forceLive: boolean } | null = null;
let rowsPromise: Promise<FonSnapshotRow[]> | null = null;
let livePatchCache: { rows: FonSnapshotRow[]; fetchedAt: number } | null = null;
let livePatchPromise: Promise<FonSnapshotRow[] | null> | null = null;

const fetchCachedLiveTefasSnapshot = unstable_cache(
  async () => fetchLiveTefasSnapshot(),
  ["tefas-fonlar-live-snapshot-v2"],
  { revalidate: 60 * 60 }
);

type SortColumn = keyof FonSnapshotRow;

const SORT_MAP: Record<string, { col: SortColumn; ascDefault: boolean }> = {
  alfabetik: { col: "kod", ascDefault: true },
  gun: { col: "gunluk_getiri", ascDefault: false },
  "1wk": { col: "getiri_1h", ascDefault: false },
  "1mo": { col: "getiri_1a", ascDefault: false },
  "3mo": { col: "getiri_3a", ascDefault: false },
  "6mo": { col: "getiri_6a", ascDefault: false },
  ytd: { col: "getiri_yb", ascDefault: false },
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
    getiri_1h: safeNumber(row.getiri_1h),
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
    getiri_1h: formatPercent(row.getiri_1h),
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

function hasUsableSnapshot(rows: FonSnapshotRow[]) {
  if (rows.length < MIN_SNAPSHOT_ROWS) return false;
  const pricedRows = rows.filter((row) => row.fiyat !== null).length;
  const returnRows = rows.filter((row) => (
    row.gunluk_getiri !== null
    || row.getiri_1a !== null
    || row.getiri_3a !== null
    || row.getiri_6a !== null
    || row.getiri_1y !== null
  )).length;
  return pricedRows >= 900 && returnRows >= 900;
}

function latestBusinessDayIso(date = new Date()) {
  const istanbulNow = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  while (istanbulNow.getDay() === 0 || istanbulNow.getDay() === 6) {
    istanbulNow.setDate(istanbulNow.getDate() - 1);
  }
  const year = istanbulNow.getFullYear();
  const month = String(istanbulNow.getMonth() + 1).padStart(2, "0");
  const day = String(istanbulNow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function latestSnapshotDate(rows: FonSnapshotRow[]) {
  return rows.reduce<string | null>((latest, row) => {
    const value = row.veri_tarihi;
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return latest;
    return latest === null || value > latest ? value : latest;
  }, null);
}

function hasFreshSnapshot(rows: FonSnapshotRow[]) {
  const latest = latestSnapshotDate(rows);
  return latest !== null && latest >= latestBusinessDayIso();
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function pct(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function pickWeekAnchors(rows: TefasFundGeneral[], target: Date) {
  const targetIso = target.toISOString().slice(0, 10);
  const picked = new Map<string, TefasFundGeneral>();
  rows.forEach((row) => {
    if (!row.fonKodu || !row.tarih || safeNumber(row.fiyat) === null || row.tarih < targetIso) return;
    const current = picked.get(row.fonKodu);
    if (!current || row.tarih < current.tarih) picked.set(row.fonKodu, row);
  });
  return picked;
}

function patchFromRows(
  row: FonSnapshotRow,
  general: TefasFundGeneral | undefined,
  weekAnchor: TefasFundGeneral | undefined,
  ret: TefasFundReturn | undefined,
  daily: TefasFundReturn | undefined,
): FonSnapshotRow {
  const currentPrice = safeNumber(general?.fiyat) ?? row.fiyat;
  const weekReturn = pct(currentPrice, safeNumber(weekAnchor?.fiyat));
  return {
    ...row,
    unvan: general?.fonUnvan || ret?.fonUnvan || row.unvan,
    kategori: ret?.fonTurAciklama ?? row.kategori,
    fiyat: currentPrice,
    gunluk_getiri: safeNumber(daily?.getiriOrani) ?? row.gunluk_getiri,
    getiri_1h: weekReturn ?? row.getiri_1h,
    getiri_1a: safeNumber(ret?.getiri1a) ?? row.getiri_1a,
    getiri_3a: safeNumber(ret?.getiri3a) ?? row.getiri_3a,
    getiri_6a: safeNumber(ret?.getiri6a) ?? row.getiri_6a,
    getiri_1y: safeNumber(ret?.getiri1y) ?? row.getiri_1y,
    getiri_yb: safeNumber(ret?.getiriyb) ?? row.getiri_yb,
    getiri_3y: safeNumber(ret?.getiri3y) ?? row.getiri_3y,
    getiri_5y: safeNumber(ret?.getiri5y) ?? row.getiri_5y,
    risk_degeri: safeNumber(ret?.riskDegeri) ?? row.risk_degeri,
    portfoy_buyukluk: safeNumber(general?.portfoyBuyukluk) ?? row.portfoy_buyukluk,
    kisi_sayisi: safeNumber(general?.kisiSayisi) ?? row.kisi_sayisi,
    tedavuldeki_pay: safeNumber(general?.tedPaySayisi) ?? row.tedavuldeki_pay,
    tefas_durum: ret?.tefasDurum ?? row.tefas_durum,
    veri_tarihi: general?.tarih ?? row.veri_tarihi,
  };
}

async function refreshRowsWithLiveTefas(rows: FonSnapshotRow[]) {
  if (livePatchCache && Date.now() - livePatchCache.fetchedAt < ROWS_CACHE_TTL_MS) {
    return livePatchCache.rows;
  }
  if (livePatchPromise) return livePatchPromise;

  livePatchPromise = (async () => {
    const [general, returns, daily] = await Promise.all([
      fetchLatestTefasGeneral(3),
      fetchTefasReturns(),
      fetchTefasDailyReturns(),
    ]);
    const generalDate = general.date ? new Date(`${general.date}T12:00:00`) : null;
    const weekRows = generalDate
      ? await fetchTefasGeneralRange(addDays(generalDate, -7), generalDate).catch(() => [] as TefasFundGeneral[])
      : [];
    const generalMap = new Map(general.rows.map((row) => [row.fonKodu, row]));
    const weekMap = generalDate ? pickWeekAnchors(weekRows, addDays(generalDate, -7)) : new Map<string, TefasFundGeneral>();
    const returnMap = new Map(returns.map((row) => [row.fonKodu, row]));
    const dailyMap = new Map(daily.map((row) => [row.fonKodu, row]));
    const refreshed = rows.map((row) => patchFromRows(
      row,
      generalMap.get(row.kod),
      weekMap.get(row.kod),
      returnMap.get(row.kod),
      dailyMap.get(row.kod),
    ));
    livePatchCache = { rows: refreshed, fetchedAt: Date.now() };
    return refreshed;
  })()
    .catch(() => null)
    .finally(() => {
      livePatchPromise = null;
    });

  return livePatchPromise;
}

async function getRows(forceLive: boolean) {
  if (rowsCache && rowsCache.forceLive === forceLive && Date.now() - rowsCache.fetchedAt < ROWS_CACHE_TTL_MS) {
    return rowsCache.rows;
  }

  if (!forceLive && rowsPromise) return rowsPromise;

  rowsPromise = loadRows(forceLive)
    .then((rows) => {
      rowsCache = { rows, fetchedAt: Date.now(), forceLive };
      return rows;
    })
    .finally(() => {
      rowsPromise = null;
    });

  return rowsPromise;
}

async function loadRows(forceLive: boolean) {
  if (forceLive) {
    const rows = await fetchLiveTefasSnapshot();
    liveFallbackCache = { rows, fetchedAt: Date.now() };
    return rows;
  }

  if (!forceLive) {
    const rows: FonSnapshotRow[] = [];
    for (let from = 0; from < 10000; from += SUPABASE_PAGE_SIZE) {
      const { data, error } = await supabase
        .from("fon_snapshots")
        .select("*")
        .range(from, from + SUPABASE_PAGE_SIZE - 1);
      if (error) {
        rows.length = 0;
        break;
      }
      const batch = data ?? [];
      rows.push(...batch.map((row) => normalize(row as Partial<FonSnapshotRow>)));
      if (batch.length < SUPABASE_PAGE_SIZE) break;
    }
    if (hasUsableSnapshot(rows)) {
      if (hasFreshSnapshot(rows)) return rows;
      const refreshedRows = await withTimeout(refreshRowsWithLiveTefas(rows), 6500, rows);
      return refreshedRows ?? rows;
    }
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
        // Yalnizca kesin kapali (false) olanlar "kapali"ya girer; durumu
        // bilinmeyen (null) fonlar acik tarafinda kalir ki iki sekme
        // arasinda fon kaybolmasin / cop birikmesin.
        if (tefasFilter === "kapali") return row.tefas_durum !== true;
        return row.tefas_durum === true;
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
