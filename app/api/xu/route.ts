import { NextResponse } from "next/server";

const g = globalThis as typeof globalThis & {
  xuCache?: { xu100: { value: string; change: string }; xu030: { value: string; change: string }; lastFetch: number };
};

if (!g.xuCache) {
  g.xuCache = {
    xu100: { value: "-", change: "-" },
    xu030: { value: "-", change: "-" },
    lastFetch: 0,
  };
}

const FETCH_INTERVAL = 3000;

async function fetchYahoo(symbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return { value: "-", change: "-" };
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose;
    const changePercent = prev ? (((price - prev) / prev) * 100).toFixed(2) : "-";
    const formattedPrice = price?.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "-";
    const sign = Number(changePercent) >= 0 ? "%" : "%-";
    const changeStr = changePercent !== "-" ? `${sign}${Math.abs(Number(changePercent)).toFixed(2).replace(".", ",")}` : "-";
    return { value: formattedPrice, change: changeStr };
  } catch {
    return { value: "-", change: "-" };
  }
}

async function refreshCache() {
  const now = Date.now();
  if (now - g.xuCache!.lastFetch < FETCH_INTERVAL) return;
  g.xuCache!.lastFetch = now;
  const [xu100, xu030] = await Promise.all([
    fetchYahoo("XU100.IS"),
    fetchYahoo("XU030.IS"),
  ]);
  g.xuCache!.xu100 = xu100;
  g.xuCache!.xu030 = xu030;
}

export async function GET() {
  await refreshCache();
  const r = NextResponse.json({ xu100: g.xuCache!.xu100, xu030: g.xuCache!.xu030 });
  r.headers.set("Cache-Control", "no-store, max-age=0");
  return r;
}
