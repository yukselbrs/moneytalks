import { NextResponse, NextRequest } from "next/server";
import { fetchMarketQuote } from "@/lib/market-pricing";
import { normalizeTicker } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";

const DEFAULT_TICKERS = ["THYAO", "GARAN", "ASELS", "EREGL", "SISE", "AKBNK", "KCHOL", "BIMAS"];
const MAX_EXTRA_TICKERS = 50;
const MAX_EXTRA_PARAM_LENGTH = 600;

type FiyatData = {
  fiyat: string;
  degisim: string;
  yukselis: boolean;
  hacim: number;
  piyasaDegeri: number;
  ts: number;
};

const TTL = 15000;
const MAX_CACHE_SIZE = 200;

// Map preserves insertion order → kullanılan LRU davranışı için yeterli.
const g = globalThis as typeof globalThis & {
  fiyatCache?: Map<string, FiyatData>;
};
if (!g.fiyatCache) g.fiyatCache = new Map();

function cacheGet(ticker: string): FiyatData | undefined {
  const cache = g.fiyatCache!;
  const entry = cache.get(ticker);
  if (!entry) return undefined;
  // LRU: erişimi en taze konuma taşı
  cache.delete(ticker);
  cache.set(ticker, entry);
  return entry;
}

function cacheSet(ticker: string, value: FiyatData) {
  const cache = g.fiyatCache!;
  if (cache.has(ticker)) cache.delete(ticker);
  cache.set(ticker, value);
  while (cache.size > MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function pruneCache() {
  const cache = g.fiyatCache!;
  const now = Date.now();
  for (const [key, value] of cache) {
    if (now - value.ts > TTL * 4) cache.delete(key);
  }
}

function parseExtraTickers(extra: string | null): string[] {
  if (!extra) return [];
  if (extra.length > MAX_EXTRA_PARAM_LENGTH) return [];
  const parts = extra.split(",", MAX_EXTRA_TICKERS + 1).slice(0, MAX_EXTRA_TICKERS);
  const normalized = parts
    .map(normalizeTicker)
    .filter((ticker): ticker is string => ticker !== null);
  return [...new Set(normalized)];
}

async function fetchFiyat(ticker: string) {
  const now = Date.now();
  const cached = cacheGet(ticker);
  if (cached && now - cached.ts < TTL) return cached;

  try {
    const quote = await fetchMarketQuote(ticker, { revalidate: 15 });
    if (!quote) return null;
    const result = {
      fiyat: formatNumber(quote.fiyat, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      degisim: (quote.degisimYuzde ?? 0).toFixed(2),
      yukselis: (quote.degisimYuzde ?? 0) >= 0,
      hacim: quote.hacim ?? 0,
      piyasaDegeri: quote.piyasaDegeri ?? 0,
      ts: now,
    };
    cacheSet(ticker, result);
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
