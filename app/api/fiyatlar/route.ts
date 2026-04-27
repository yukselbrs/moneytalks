import { NextResponse, NextRequest } from "next/server";

const DEFAULT_TICKERS = ["THYAO", "GARAN", "ASELS", "EREGL", "SISE", "AKBNK", "KCHOL", "BIMAS"];

// Global in-memory cache - 15 saniye TTL
const g = globalThis as typeof globalThis & {
  fiyatCache?: Record<string, { fiyat: string; degisim: string; yukselis: boolean; ts: number }>;
};
if (!g.fiyatCache) g.fiyatCache = {};

const TTL = 15000;

async function fetchFiyat(ticker: string) {
  const now = Date.now();
  const cached = g.fiyatCache![ticker];
  if (cached && now - cached.ts < TTL) return cached;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=1d`;
    const res = await fetch(url, { next: { revalidate: 15 }, headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose;
    const change = prev ? (((price - prev) / prev) * 100) : 0;
    const result = {
      fiyat: price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      degisim: change.toFixed(2),
      yukselis: change >= 0,
      ts: now,
    };
    g.fiyatCache![ticker] = result;
    return result;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const extra = req.nextUrl.searchParams.get("extra");
  const extraTickers = extra ? extra.split(",").filter(Boolean) : [];
  const allTickers = [...new Set([...DEFAULT_TICKERS, ...extraTickers])];
  const results = await Promise.all(allTickers.map(t => fetchFiyat(t)));
  const data: Record<string, { fiyat: string; degisim: string; yukselis: boolean } | null> = {};
  allTickers.forEach((t, i) => { data[t] = results[i]; });
  const response = NextResponse.json(data);
  response.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
  return response;
}
