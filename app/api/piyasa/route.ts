import { NextResponse } from "next/server";
import { formatNumber, formatPercent } from "@/lib/formatters";

export const revalidate = 0;

type PiyasaItem = { value: string; change: string };

const FETCH_INTERVAL = 3000;

const g = globalThis as typeof globalThis & {
  piyasaCache?: {
    data: {
      usd: PiyasaItem;
      eur: PiyasaItem;
      xu100: PiyasaItem;
      xu030: PiyasaItem;
      gram: PiyasaItem;
    };
    lastFetch: number;
  };
};

if (!g.piyasaCache) {
  g.piyasaCache = {
    data: {
      usd: { value: "-", change: "-" },
      eur: { value: "-", change: "-" },
      xu100: { value: "-", change: "-" },
      xu030: { value: "-", change: "-" },
      gram: { value: "-", change: "-" },
    },
    lastFetch: 0,
  };
}

const TROY_ONS_GRAM = 31.1035;

async function fetchYahooRaw(symbol: string): Promise<{ price: number; changePercent: number | null } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    const meta = (await res.json())?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const prev = meta.chartPreviousClose || meta.previousClose;
    return { price: meta.regularMarketPrice, changePercent: prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : null };
  } catch {
    return null;
  }
}

// Gram altin TL: GC=F (USD/ons) / 31.1035 * USDTRY. Degisim yuzdesi ons bazinda (kur etkisi haric, v1).
async function fetchGramAltin(): Promise<PiyasaItem> {
  const [ons, kur] = await Promise.all([fetchYahooRaw("GC=F"), fetchYahooRaw("USDTRY=X")]);
  if (!ons || !kur) return { value: "-", change: "-" };
  const gram = (ons.price / TROY_ONS_GRAM) * kur.price;
  return {
    value: formatNumber(gram, { minimumFractionDigits: 2, maximumFractionDigits: 2 }, "-"),
    change: ons.changePercent === null ? "-" : formatPercent(ons.changePercent, { symbolPosition: "prefix" }),
  };
}

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
    const changePercent = prev ? ((price - prev) / prev) * 100 : null;
    const formattedPrice = formatNumber(price, { minimumFractionDigits: 2, maximumFractionDigits: 2 }, "-");
    const changeStr = changePercent === null ? "-" : formatPercent(changePercent, { symbolPosition: "prefix" });
    return { value: formattedPrice, change: changeStr };
  } catch {
    return { value: "-", change: "-" };
  }
}

export async function GET() {
  try {
    const now = Date.now();
    if (now - g.piyasaCache!.lastFetch >= FETCH_INTERVAL) {
      g.piyasaCache!.lastFetch = now;
      const [usd, eur, xu100, xu030, gram] = await Promise.all([
        fetchYahoo("USDTRY=X"),
        fetchYahoo("EURTRY=X"),
        fetchYahoo("XU100.IS"),
        fetchYahoo("XU030.IS"),
        fetchGramAltin(),
      ]);
      g.piyasaCache!.data = { usd, eur, xu100, xu030, gram };
    }

    const res = NextResponse.json(g.piyasaCache!.data);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (e) {
    console.error("Piyasa API error:", e);
    return NextResponse.json(g.piyasaCache!.data);
  }
}
