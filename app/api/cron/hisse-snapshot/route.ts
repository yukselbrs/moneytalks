import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BIST_HISSELER } from "@/lib/bist-hisseler";
import { yeniKotasyonOverlay } from "@/lib/hisse-evren";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import { fetchMarketQuote } from "@/lib/market-pricing";

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
    const [res, quote] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=${HISTORY_RANGE}`, {
        cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" },
      }),
      fetchMarketQuote(ticker, { cache: "no-store" }),
    ]);
    if (!res.ok || !quote) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    const opens: (number | null)[] = result.indicators?.quote?.[0]?.open || [];
    const adjustedCloses: (number | null)[] = result.indicators?.adjclose?.[0]?.adjclose || [];

    const baseReturnSeries = adjustedCloses.length === closes.length ? adjustedCloses : closes;
    const returnSeries = kurumsalAksiyonlariAyarla(baseReturnSeries, opens);

    if (timestamps.length === 0 || !meta?.regularMarketPrice) return null;

    const fiyat = quote.fiyat;
    const sonTs = timestamps[timestamps.length - 1];

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
      degisim_yuzde: quote.degisimYuzde,
      hacim: quote.hacim,
      piyasa_degeri: quote.piyasaDegeri,
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

  // Statik evren + yeni kotasyon overlay'i (islem_goruyor'a gecen halka arzlar JSON sync'ini beklemeden fiyat alir)
  const overlay = await yeniKotasyonOverlay();
  const evren = overlay.length ? [...BIST_HISSELER, ...overlay] : BIST_HISSELER;

  for (let i = 0; i < evren.length; i += BATCH) {
    const batch = evren.slice(i, i + BATCH);
    const data = await Promise.all(batch.map((h) => fetchHisseData(h.ticker)));
    data.forEach((r) => r && results.push(r));
  }

  if (results.length > 0) {
    const { error } = await supabase.from("hisse_snapshots").upsert(
      results.map((r) => ({ ...r, updated_at: new Date().toISOString() }))
    );
    if (error) {
      hataYakala("snapshot-cron:upsert", error);
      return NextResponse.json(
        { error: error.message, partial_saved: 0, hata: 1 },
        { status: 500 }
      );
    }
  }

  const basarisiz = evren.length - results.length;
  // Tekil ticker fetch'leri zaman zaman bos doner (Yahoo dalgalanmasi) — %10'u asarsa sistemik sorun say.
  const hata = basarisiz > evren.length * 0.1 ? 1 : 0;
  if (hata) hataYakala("snapshot-cron:kapsama", new Error(`${basarisiz} hisse cekilemedi`), { basarisiz });

  return NextResponse.json({
    success: true,
    total: evren.length,
    saved: results.length,
    failed: basarisiz,
    duration_ms: Date.now() - start,
    hata,
  });
}
