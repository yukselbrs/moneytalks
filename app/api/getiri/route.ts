import { NextResponse, NextRequest } from "next/server";

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

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker gerekli" }, { status: 400 });

  const symbol = ticker.endsWith(".IS") || ticker.endsWith("=X") ? ticker : `${ticker}.IS`;
  const results: Record<string, string | null> = {};
  const gun = 24 * 60 * 60;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=13mo`;
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];
    const opens: (number | null)[] = result?.indicators?.quote?.[0]?.open || [];
    const adjustedCloses: (number | null)[] = result?.indicators?.adjclose?.[0]?.adjclose || [];
    const baseSeries = adjustedCloses.length === closes.length ? adjustedCloses : closes;
    const series = kurumsalAksiyonlariAyarla(baseSeries, opens);
    const sonTs = timestamps[timestamps.length - 1];
    const son = Number(result?.meta?.regularMarketPrice) || findCloseAtOrBefore(timestamps, series, sonTs);

    if (!son || !sonTs || timestamps.length < 2) {
      results["1wk"] = null;
      results["1mo"] = null;
      results["3mo"] = null;
      results["1y"] = null;
    } else {
      const getiri = (range: string, gunOnce: number) => {
        const targetTs = sonTs - gunOnce * gun;
        const ref = findCloseAtOrAfter(timestamps, series, targetTs) ?? findCloseAtOrBefore(timestamps, series, targetTs);
        results[range] = ref && ref !== 0 ? (((son - ref) / ref) * 100).toFixed(2) : null;
      };

      getiri("1wk", 7);
      getiri("1mo", 30);
      getiri("3mo", 90);
      getiri("1y", 365);
    }
  } catch {
    results["1wk"] = null;
    results["1mo"] = null;
    results["3mo"] = null;
    results["1y"] = null;
  }

  return NextResponse.json({
    ticker,
    "1wk": results["1wk"],
    "1mo": results["1mo"],
    "3mo": results["3mo"],
    "1y": results["1y"],
  });
}
