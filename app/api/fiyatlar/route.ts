import { NextResponse, NextRequest } from "next/server";

const DEFAULT_TICKERS = ["THYAO", "GARAN", "ASELS", "EREGL", "SISE", "AKBNK", "KCHOL", "BIMAS"];

async function fetchFiyat(ticker: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=1d`;
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose;
    const change = prev ? (((price - prev) / prev) * 100) : 0;
    return {
      fiyat: price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      degisim: change.toFixed(2),
      yukselis: change >= 0,
    };
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
  return NextResponse.json(data);
}
