import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BIST_HISSELER } from "@/lib/bist-hisseler";
import { verifyCronAuth } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH = 25;
const GUN = 86400; // saniye
const HISTORY_RANGE = "2y";

type SnapshotRow = {
  ticker: string;
  fiyat: number | null;
  degisim_yuzde: number | null;
  hacim: number | null;
  piyasa_degeri: number | null;
  getiri_1h: number | null;
  getiri_1a: number | null;
  getiri_3a: number | null;
  getiri_1y: number | null;
};

// Verilen target_ts'den önceki en yakın geçerli candle'ın close fiyatını bul
function findCloseAtOrBefore(
  timestamps: number[],
  closes: (number | null)[],
  targetTs: number
): number | null {
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (timestamps[i] <= targetTs && closes[i] !== null && closes[i] !== undefined) {
      return closes[i] as number;
    }
  }
  return null;
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

async function fetchHisseData(ticker: string): Promise<SnapshotRow | null> {
  try {
    const [res, res5d, res1d] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=${HISTORY_RANGE}`, {
        cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" },
      }),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=5d`, {
        cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" },
      }),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=1d`, {
        cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" },
      }),
    ]);
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    const opens: (number | null)[] = result.indicators?.quote?.[0]?.open || [];
    const adjustedCloses: (number | null)[] = result.indicators?.adjclose?.[0]?.adjclose || [];

    const [data5d, data1d] = await Promise.all([res5d.ok ? res5d.json() : Promise.resolve(null), res1d.ok ? res1d.json() : Promise.resolve(null)]);
    const adj5d: (number | null)[] = data5d?.chart?.result?.[0]?.indicators?.adjclose?.[0]?.adjclose || [];
    // range=1d'den doğru chartPreviousClose — 5d/2y range'de stale dönebilir
    const prevClose1d: number | null = data1d?.chart?.result?.[0]?.meta?.chartPreviousClose || null;
    const baseReturnSeries = adjustedCloses.length === closes.length ? adjustedCloses : closes;
    const returnSeries = kurumsalAksiyonlariAyarla(baseReturnSeries, opens);

    if (timestamps.length === 0 || !meta?.regularMarketPrice) return null;

    // Son iki geçerli candle'ı bul
    let sonFiyat: number | null = null;
    const validAdj5d = adj5d.filter((v): v is number => v !== null && v !== undefined);
    const fiyat = meta.regularMarketPrice || 0;
    const sonTs = timestamps[timestamps.length - 1];
    let degisim = 0;

    let prevUsed = 0; // extreme değişim tespitinde kullanılan önceki fiyat
    const adj5dStuck = validAdj5d.length >= 2 && validAdj5d.every(v => Math.abs(v - validAdj5d[0]) < 0.01);
    if (validAdj5d.length >= 2 && !adj5dStuck) {
      const prev5d = validAdj5d[validAdj5d.length - 2];
      prevUsed = prev5d;
      degisim = prev5d > 0 ? ((fiyat - prev5d) / prev5d) * 100 : 0;
    } else if (prevClose1d && prevClose1d > 0) {
      prevUsed = prevClose1d;
      degisim = ((fiyat - prevClose1d) / prevClose1d) * 100;
    } else if (meta.chartPreviousClose && meta.chartPreviousClose > 0) {
      prevUsed = meta.chartPreviousClose;
      degisim = ((fiyat - meta.chartPreviousClose) / meta.chartPreviousClose) * 100;
    } else {
      const degisimSeries = adjustedCloses.length === closes.length ? adjustedCloses : closes;
      let oncekiFiyat: number | null = null;
      for (let i = degisimSeries.length - 1; i >= 0; i--) {
        if (degisimSeries[i] !== null && degisimSeries[i] !== undefined) {
          if (sonFiyat === null) { sonFiyat = degisimSeries[i] as number; }
          else if (degisimSeries[i] !== sonFiyat) { oncekiFiyat = degisimSeries[i] as number; break; }
        }
      }
      if (oncekiFiyat && oncekiFiyat > 0) { prevUsed = oncekiFiyat; degisim = ((fiyat - oncekiFiyat) / oncekiFiyat) * 100; }
      else degisim = meta.regularMarketChangePercent ?? 0;
    }

    // Bedelsiz/split fallback: extreme değişime neden olan prevUsed/açılış oranı tam sayıya yakınsa düzelt
    if (Math.abs(degisim) > 50 && prevUsed > 0) {
      const openPrice: number = meta.regularMarketOpen > 0 ? meta.regularMarketOpen : fiyat;
      const ratio = prevUsed / openPrice;
      const rounded = Math.round(ratio);
      if (rounded >= 2 && Math.abs(ratio - rounded) / ratio < 0.10) {
        const adjustedPrev = prevUsed / rounded;
        degisim = ((fiyat - adjustedPrev) / adjustedPrev) * 100;
      }
    }

    // Getiriler: takvim gününe göre geriye git, o tarihte/öncesinde son geçerli candle
    const getiri = (gunOnce: number): number | null => {
      const targetTs = sonTs - gunOnce * GUN;
      const ref = findCloseAtOrBefore(timestamps, returnSeries, targetTs);
      const sonAdjusted = findCloseAtOrBefore(timestamps, returnSeries, sonTs) || fiyat;
      if (!ref || ref === 0) return null;
      return ((sonAdjusted - ref) / ref) * 100;
    };

    return {
      ticker,
      fiyat,
      degisim_yuzde: degisim,
      hacim: meta.regularMarketVolume || null,
      piyasa_degeri: meta.marketCap || null,
      getiri_1h: getiri(7),     // 1 hafta
      getiri_1a: getiri(30),    // 1 ay
      getiri_3a: getiri(90),    // 3 ay
      getiri_1y: getiri(365),   // 1 yıl
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const results: SnapshotRow[] = [];

  for (let i = 0; i < BIST_HISSELER.length; i += BATCH) {
    const batch = BIST_HISSELER.slice(i, i + BATCH);
    const data = await Promise.all(batch.map((h) => fetchHisseData(h.ticker)));
    data.forEach((r) => r && results.push(r));
  }

  if (results.length > 0) {
    const { error } = await supabase.from("hisse_snapshots").upsert(
      results.map((r) => ({ ...r, updated_at: new Date().toISOString() }))
    );
    if (error) {
      return NextResponse.json(
        { error: error.message, partial_saved: 0 },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    total: BIST_HISSELER.length,
    saved: results.length,
    failed: BIST_HISSELER.length - results.length,
    duration_ms: Date.now() - start,
  });
}
