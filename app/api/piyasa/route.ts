import { NextResponse } from "next/server";

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
    },
    lastFetch: 0,
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
    const changePercent = prev ? (((price - prev) / prev) * 100).toFixed(2) : "-";
    const formattedPrice = price?.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "-";
    const sign = Number(changePercent) >= 0 ? "%" : "%-";
    const changeStr = changePercent !== "-" ? `${sign}${Math.abs(Number(changePercent)).toFixed(2).replace(".", ",")}` : "-";
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
      const [usd, eur, xu100, xu030] = await Promise.all([
        fetchYahoo("USDTRY=X"),
        fetchYahoo("EURTRY=X"),
        fetchYahoo("XU100.IS"),
        fetchYahoo("XU030.IS"),
      ]);
      g.piyasaCache!.data = { usd, eur, xu100, xu030 };
    }

    const res = NextResponse.json(g.piyasaCache!.data);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (e) {
    console.error("Piyasa API error:", e);
    return NextResponse.json(g.piyasaCache!.data);
  }
}
