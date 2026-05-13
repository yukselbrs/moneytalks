import { NextResponse, NextRequest } from "next/server";
import { fetchMarketQuote } from "@/lib/market-pricing";
import { normalizeTicker } from "@/lib/utils";

const DEFAULT_TICKERS = ["THYAO", "GARAN", "ASELS", "EREGL", "SISE", "AKBNK", "KCHOL", "BIMAS"];
const MAX_EXTRA_TICKERS = 50;

type FiyatData = {
  fiyat: string;
  degisim: string;
  yukselis: boolean;
  hacim: number;
  piyasaDegeri: number;
  ts: number;
};

// Global in-memory cache - 15 saniye TTL
const g = globalThis as typeof globalThis & {
  fiyatCache?: Record<string, FiyatData>;
};
if (!g.fiyatCache) g.fiyatCache = {};

const TTL = 15000;
const MAX_CACHE_SIZE = 200;

function pruneCache() {
  const cache = g.fiyatCache!;
  const now = Date.now();
  for (const key of Object.keys(cache)) {
    if (now - cache[key].ts > TTL * 4) delete cache[key];
  }
  if (Object.keys(cache).length > MAX_CACHE_SIZE) {
    const sorted = Object.entries(cache).sort((a, b) => a[1].ts - b[1].ts);
    sorted.slice(0, sorted.length - MAX_CACHE_SIZE).forEach(([k]) => delete cache[k]);
  }
}

function parseExtraTickers(extra: string | null): string[] {
  if (!extra) return [];
  const normalized = extra
    .split(",")
    .map(normalizeTicker)
    .filter((ticker): ticker is string => ticker !== null);
  return [...new Set(normalized)].slice(0, MAX_EXTRA_TICKERS);
}

async function fetchFiyat(ticker: string) {
  const now = Date.now();
  const cached = g.fiyatCache![ticker];
  if (cached && now - cached.ts < TTL) return cached;

  try {
    const quote = await fetchMarketQuote(ticker, { revalidate: 15 });
    if (!quote) return null;
    const result = {
      fiyat: quote.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      degisim: (quote.degisimYuzde ?? 0).toFixed(2),
      yukselis: (quote.degisimYuzde ?? 0) >= 0,
      hacim: quote.hacim ?? 0,
      piyasaDegeri: quote.piyasaDegeri ?? 0,
      ts: now,
    };
    g.fiyatCache![ticker] = result;
    return result;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  pruneCache();
  const extra = req.nextUrl.searchParams.get("extra");
  const extraTickers = parseExtraTickers(extra);
  const allTickers = [...new Set([...DEFAULT_TICKERS, ...extraTickers])];
  const results = await Promise.all(allTickers.map(t => fetchFiyat(t)));
  const data: Record<string, FiyatData | null> = {};
  allTickers.forEach((t, i) => { data[t] = results[i]; });
  const response = NextResponse.json(data);
  response.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
  return response;
}
