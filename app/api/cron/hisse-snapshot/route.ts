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

async function fetchHisseData(ticker: string): Promise<SnapshotRow | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=${HISTORY_RANGE}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];

    if (timestamps.length === 0 || !meta?.regularMarketPrice) return null;

    // Son iki geçerli candle'ı bul
    let sonFiyat: number | null = null;
    let oncekiFiyat: number | null = null;
    for (let i = closes.length - 1; i >= 0; i--) {
      if (closes[i] !== null && closes[i] !== undefined) {
        if (sonFiyat === null) {
          sonFiyat = closes[i] as number;
        } else if (closes[i] !== sonFiyat) {
          oncekiFiyat = closes[i] as number;
          break;
        }
      }
    }
    const fiyat = sonFiyat || meta.regularMarketPrice;
    const sonTs = timestamps[timestamps.length - 1];
    const degisim = meta.regularMarketChangePercent ?? (oncekiFiyat ? ((fiyat - oncekiFiyat) / oncekiFiyat) * 100 : 0);

    // Getiriler: takvim gününe göre geriye git, o tarihte/öncesinde son geçerli candle
    const getiri = (gunOnce: number): number | null => {
      const targetTs = sonTs - gunOnce * GUN;
      const ref = findCloseAtOrBefore(timestamps, closes, targetTs);
      if (!ref || ref === 0) return null;
      return ((fiyat - ref) / ref) * 100;
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
