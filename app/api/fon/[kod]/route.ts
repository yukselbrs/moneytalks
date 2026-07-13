import { NextRequest, NextResponse } from "next/server";
import {
  fetchLiveTefasSnapshot,
  fetchTefasFundHistory,
  type FonHistoryPoint,
  type FonSnapshotRow,
} from "@/lib/tefas-fonlar";
import { getFonPortfoy } from "@/lib/fon-portfoy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 60 * 60 * 1000;
const HISTORY_CACHE_VERSION = "v4";
let snapshotCache: { rows: FonSnapshotRow[]; fetchedAt: number } | null = null;
let snapshotPromise: Promise<FonSnapshotRow[]> | null = null;
const historyCache = new Map<string, { rows: FonHistoryPoint[]; fetchedAt: number }>();
const historyPromises = new Map<string, Promise<FonHistoryPoint[]>>();
const latestPointCache = new Map<string, FonHistoryPoint>();

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

  if (anchorPrice !== null && (points.length < 35 || range !== "1mo")) {
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
    const history = await getHistoryRows(kod, range);
    const cachedLatestPoint = latestPointCache.get(kod);
    let recentHistory = history.length > 0 && isRecentHistoryPoint(history[history.length - 1]) ? history : [];
    if (recentHistory.length === 0 && range === "1mo") recentHistory = history;
    if (recentHistory.length === 0 && range !== "1mo") recentHistory = await getHistoryRows(kod, "1mo");
    if (recentHistory.length === 0 && cachedLatestPoint) recentHistory = [cachedLatestPoint];
    const snapshotRows = await getSnapshotRows();
    const baseFon = snapshotRows.find((row) => row.kod === kod);
    const fon = baseFon ? withLatestKnownFields(withHistoryFallback(baseFon, recentHistory), [history, recentHistory]) : null;
    if (!fon) {
      return NextResponse.json({ error: "Fon bulunamadı" }, { status: 404 });
    }

    const returns = returnsFromHistory(fon, history);
    const chartHistory = chartHistoryForRange(fon, history, range, returns);

    const response = NextResponse.json({
      fon,
      history: chartHistory,
      rawHistoryCount: history.length,
      returns,
      range,
      portfoy: getFonPortfoy(kod),
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
