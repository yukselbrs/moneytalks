import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  fetchLiveTefasSnapshot,
  fetchTefasDailyReturns,
  fetchTefasFundHistory,
  fetchTefasReturns,
  type FonHistoryPoint,
  type FonSnapshotRow,
  type TefasFundReturn,
} from "@/lib/tefas-fonlar";
import { getFonPortfoy } from "@/lib/fon-portfoy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 60 * 60 * 1000;
const HISTORY_CACHE_VERSION = "v7";
let snapshotCache: { rows: FonSnapshotRow[]; fetchedAt: number } | null = null;
let snapshotPromise: Promise<FonSnapshotRow[]> | null = null;
const historyCache = new Map<string, { rows: FonHistoryPoint[]; fetchedAt: number }>();
const historyPromises = new Map<string, Promise<FonHistoryPoint[]>>();
const latestPointCache = new Map<string, FonHistoryPoint>();
let returnMetricsCache: { returns: TefasFundReturn[]; daily: TefasFundReturn[]; fetchedAt: number } | null = null;
let returnMetricsPromise: Promise<{ returns: TefasFundReturn[]; daily: TefasFundReturn[] }> | null = null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function getSnapshotRows() {
  if (snapshotCache && Date.now() - snapshotCache.fetchedAt < CACHE_TTL_MS) {
    return snapshotCache.rows;
  }
  if (!snapshotPromise) {
    snapshotPromise = fetchLiveTefasSnapshot().finally(() => {
      snapshotPromise = null;
    });
  }
  const rows = await snapshotPromise;
  const filledInvestorCount = rows.filter((row) => row.kisi_sayisi !== null).length;
  if (rows.length > 0 && (filledInvestorCount > 500 || !snapshotCache)) {
    snapshotCache = { rows, fetchedAt: Date.now() };
  }
  return snapshotCache?.rows ?? rows;
}

async function getSnapshotRow(kod: string): Promise<FonSnapshotRow | null> {
  const cached = snapshotCache?.rows.find((row) => row.kod === kod);
  if (cached && Date.now() - snapshotCache!.fetchedAt < CACHE_TTL_MS) return cached;

  const { data, error } = await supabase
    .from("fon_snapshots")
    .select("*")
    .eq("kod", kod)
    .maybeSingle();
  if (!error && data) return normalize(data as Partial<FonSnapshotRow>);

  const liveRows = await withTimeout(getSnapshotRows(), 4500, [] as FonSnapshotRow[]);
  return liveRows.find((row) => row.kod === kod) ?? null;
}

async function getReturnMetrics() {
  if (returnMetricsCache && Date.now() - returnMetricsCache.fetchedAt < CACHE_TTL_MS) {
    return returnMetricsCache;
  }
  if (!returnMetricsPromise) {
    returnMetricsPromise = Promise.all([
      fetchTefasReturns(),
      fetchTefasDailyReturns(),
    ])
      .then(([returns, daily]) => {
        returnMetricsCache = { returns, daily, fetchedAt: Date.now() };
        return { returns, daily };
      })
      .finally(() => {
        returnMetricsPromise = null;
      });
  }
  return returnMetricsPromise;
}

async function getCategoryRows(kategori: string | null): Promise<FonSnapshotRow[]> {
  if (!kategori) return [];
  const cachedRows = snapshotCache && Date.now() - snapshotCache.fetchedAt < CACHE_TTL_MS
    ? snapshotCache.rows.filter((row) => row.kategori === kategori)
    : null;
  if (cachedRows) return cachedRows;

  const { data, error } = await supabase
    .from("fon_snapshots")
    .select("*")
    .eq("kategori", kategori)
    .limit(5000);
  if (error || !data) return [];
  return data.map((row) => normalize(row as Partial<FonSnapshotRow>));
}

async function getHistoryRows(kod: string, range: string) {
  const key = `${HISTORY_CACHE_VERSION}:${kod}:${range}`;
  const cached = historyCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.rows;

  if (historyPromises.has(key)) return historyPromises.get(key)!;

  const promise = (async () => {
    try {
      const rows = await fetchTefasFundHistory(kod, range);
      if (rows.length > 0) {
        historyCache.set(key, { rows, fetchedAt: Date.now() });
        const last = rows[rows.length - 1];
        if (last && isRecentHistoryPoint(last)) latestPointCache.set(kod, last);
        return rows;
      }
    } catch {
      // Eski sağlam veri varsa onu kullan; boş/hatalı TEFAS cevabını cache'leme.
    }

    return cached?.rows ?? [];
  })().finally(() => {
    historyPromises.delete(key);
  });
  historyPromises.set(key, promise);
  return promise;
}

function withHistoryFallback(fon: FonSnapshotRow, history: FonHistoryPoint[]): FonSnapshotRow {
  const sonNokta = history[history.length - 1] ?? null;
  if (!sonNokta || !isRecentHistoryPoint(sonNokta)) return fon;
  return {
    ...fon,
    fiyat: sonNokta.fiyat ?? fon.fiyat,
    portfoy_buyukluk: sonNokta.portfoy_buyukluk ?? fon.portfoy_buyukluk,
    kisi_sayisi: sonNokta.kisi_sayisi ?? fon.kisi_sayisi,
    tedavuldeki_pay: sonNokta.tedavuldeki_pay ?? fon.tedavuldeki_pay,
    veri_tarihi: sonNokta.tarih ?? fon.veri_tarihi,
  };
}

function withLatestKnownFields(fon: FonSnapshotRow, histories: FonHistoryPoint[][]): FonSnapshotRow {
  const points = histories.flat();
  const latestWithInvestor = [...points].reverse().find((point) => point.kisi_sayisi !== null);
  const latestWithSize = [...points].reverse().find((point) => point.portfoy_buyukluk !== null || point.tedavuldeki_pay !== null);
  return {
    ...fon,
    kisi_sayisi: fon.kisi_sayisi ?? latestWithInvestor?.kisi_sayisi ?? null,
    portfoy_buyukluk: fon.portfoy_buyukluk ?? latestWithSize?.portfoy_buyukluk ?? null,
    tedavuldeki_pay: fon.tedavuldeki_pay ?? latestWithSize?.tedavuldeki_pay ?? null,
  };
}

function latestBusinessDayIso() {
  const date = new Date();
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function isRecentHistoryPoint(point: FonHistoryPoint) {
  return point.tarih_iso >= latestBusinessDayIso();
}

function pct(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function pointAt(points: FonHistoryPoint[], daysBack: number) {
  if (points.length === 0) return null;
  const index = Math.max(0, points.length - 1 - daysBack);
  return points[index]?.fiyat ?? null;
}

function returnsFromHistory(fon: FonSnapshotRow, history: FonHistoryPoint[]) {
  const last = history[history.length - 1]?.fiyat ?? fon.fiyat;
  return {
    "1h": pct(last, pointAt(history, 5)),
    "1a": fon.getiri_1a,
    "3a": fon.getiri_3a,
    "6a": fon.getiri_6a,
    ybb: fon.getiri_yb,
    "1y": fon.getiri_1y,
  };
}

function applyLiveReturnMetrics(
  fon: FonSnapshotRow,
  metrics: { returns: TefasFundReturn[]; daily: TefasFundReturn[] } | null,
  history: FonHistoryPoint[],
) {
  const ret = metrics?.returns.find((row) => row.fonKodu === fon.kod);
  const daily = metrics?.daily.find((row) => row.fonKodu === fon.kod);
  const last = history[history.length - 1]?.fiyat ?? fon.fiyat;
  const previous = history.length >= 2 ? history[history.length - 2]?.fiyat ?? null : null;
  const historyDaily = pct(last, previous);

  return {
    ...fon,
    kategori: ret?.fonTurAciklama ?? fon.kategori,
    gunluk_getiri: safeNumber(daily?.getiriOrani) ?? historyDaily ?? fon.gunluk_getiri,
    getiri_1a: safeNumber(ret?.getiri1a) ?? fon.getiri_1a,
    getiri_3a: safeNumber(ret?.getiri3a) ?? fon.getiri_3a,
    getiri_6a: safeNumber(ret?.getiri6a) ?? fon.getiri_6a,
    getiri_1y: safeNumber(ret?.getiri1y) ?? fon.getiri_1y,
    getiri_yb: safeNumber(ret?.getiriyb) ?? fon.getiri_yb,
    getiri_3y: safeNumber(ret?.getiri3y) ?? fon.getiri_3y,
    getiri_5y: safeNumber(ret?.getiri5y) ?? fon.getiri_5y,
    risk_degeri: safeNumber(ret?.riskDegeri) ?? fon.risk_degeri,
    tefas_durum: ret?.tefasDurum ?? fon.tefas_durum,
  };
}

function returnForRange(range: string, returns: Record<string, number | null>) {
  if (range === "1wk") return returns["1h"];
  if (range === "1mo") return returns["1a"];
  if (range === "3mo") return returns["3a"];
  if (range === "6mo") return returns["6a"];
  if (range === "ytd") return returns.ybb;
  if (range === "1y") return returns["1y"];
  return returns["1a"];
}

function rangeLabel(range: string) {
  if (range === "1wk") return "1H Başlangıç";
  if (range === "1mo") return "1A Başlangıç";
  if (range === "3mo") return "3A Başlangıç";
  if (range === "6mo") return "6A Başlangıç";
  if (range === "ytd") return "YBB Başlangıç";
  if (range === "1y") return "1Y Başlangıç";
  return "Başlangıç";
}

function chartHistoryForRange(fon: FonSnapshotRow, history: FonHistoryPoint[], range: string, returns: Record<string, number | null>) {
  const currentPrice = fon.fiyat;
  const periodReturn = returnForRange(range, returns);
  const shouldAddAnchor = range !== "1wk" && currentPrice !== null && periodReturn !== null && periodReturn > -99;
  const anchorPrice = shouldAddAnchor ? currentPrice / (1 + periodReturn / 100) : null;
  const points = [...history];
  const last = points[points.length - 1];

  if (anchorPrice !== null && points.length < 2) {
    points.unshift({
      tarih: rangeLabel(range),
      tarih_iso: "",
      fiyat: anchorPrice,
      portfoy_buyukluk: null,
      kisi_sayisi: null,
      tedavuldeki_pay: null,
    });
  }

  if (currentPrice !== null && (!last || Math.abs(last.fiyat - currentPrice) > 0.000001)) {
    points.push({
      tarih: "Son",
      tarih_iso: latestBusinessDayIso(),
      fiyat: currentPrice,
      portfoy_buyukluk: fon.portfoy_buyukluk,
      kisi_sayisi: fon.kisi_sayisi,
      tedavuldeki_pay: fon.tedavuldeki_pay,
    });
  }

  return points;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kod: string }> }
) {
  const { kod: kodParam } = await params;
  const kod = kodParam.toLocaleUpperCase("tr-TR");
  const range = req.nextUrl.searchParams.get("range") || "1mo";

  try {
    const [history, baseFon] = await Promise.all([
      withTimeout(getHistoryRows(kod, range), 3500, [] as FonHistoryPoint[]),
      getSnapshotRow(kod),
    ]);
    const cachedLatestPoint = latestPointCache.get(kod);
    let recentHistory = history.length > 0 && isRecentHistoryPoint(history[history.length - 1]) ? history : [];
    if (recentHistory.length === 0 && range === "1mo") recentHistory = history;
    if (recentHistory.length === 0 && range !== "1mo") {
      recentHistory = await withTimeout(getHistoryRows(kod, "1mo"), 2000, [] as FonHistoryPoint[]);
    }
    if (recentHistory.length === 0 && cachedLatestPoint) recentHistory = [cachedLatestPoint];
    const liveMetrics = await withTimeout<Awaited<ReturnType<typeof getReturnMetrics>> | null>(getReturnMetrics(), 2500, null);
    const fon = baseFon
      ? applyLiveReturnMetrics(
          withLatestKnownFields(withHistoryFallback(baseFon, recentHistory), [history, recentHistory]),
          liveMetrics,
          recentHistory,
        )
      : null;
    if (!fon) {
      return NextResponse.json({ error: "Fon bulunamadı" }, { status: 404 });
    }

    const returns = returnsFromHistory(fon, history);
    const chartHistory = chartHistoryForRange(fon, history, range, returns);

    // Kategori kiyasi (Faz 4 B.12): ayni kategorideki fonlarin medyan gider orani ve 1Y getirisi.
    const medyan = (dizi: number[]): number | null => {
      if (dizi.length < 5) return null;
      const s = [...dizi].sort((a, b) => a - b);
      const orta = Math.floor(s.length / 2);
      return s.length % 2 ? s[orta] : (s[orta - 1] + s[orta]) / 2;
    };
    const kategoriFonlari = await withTimeout(getCategoryRows(fon.kategori), 1500, [] as FonSnapshotRow[]);
    const kategoriKiyas = kategoriFonlari.length >= 5 ? {
      fonSayisi: kategoriFonlari.length,
      medyanGiderOrani: medyan(kategoriFonlari.map(r => Number(r.toplam_gider_orani)).filter(v => Number.isFinite(v) && v > 0)),
      medyanGetiri1y: medyan(kategoriFonlari.map(r => Number(r.getiri_1y)).filter(v => Number.isFinite(v))),
    } : null;

    const response = NextResponse.json({
      fon,
      history: chartHistory,
      rawHistoryCount: history.length,
      returns,
      range,
      portfoy: getFonPortfoy(kod),
      kategoriKiyas,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fon detayı alınamadı" },
      { status: 500 }
    );
  }
}
