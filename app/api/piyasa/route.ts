import { NextResponse } from "next/server";

export const revalidate = 30;

async function fetchYahoo(symbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(url, {
      next: { revalidate: 30 },
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
    const res = await fetch("https://finans.truncgil.com/today.json", {
      next: { revalidate: 30 },
      headers: { "Accept": "application/json" },
    });
    const data = await res.json();

    const usdObj = data["USD"] || {};
    const eurObj = data["EUR"] || {};

    const usdValue = usdObj[Object.keys(usdObj).find(k => k.includes("at")) || ""] || "-";
    const usdChange = usdObj[Object.keys(usdObj).find(k => k.includes("işim") || k.includes("Degisim")) || ""] || "-";
    const eurValue = eurObj[Object.keys(eurObj).find(k => k.includes("at")) || ""] || "-";
    const eurChange = eurObj[Object.keys(eurObj).find(k => k.includes("işim") || k.includes("Degisim")) || ""] || "-";

    const [xu100, xu030] = await Promise.all([
      fetchYahoo("XU100.IS"),
      fetchYahoo("XU030.IS"),
    ]);

    const res2 = NextResponse.json({
      usd: { value: usdValue, change: usdChange },
      eur: { value: eurValue, change: eurChange },
      xu100,
      xu030,
    });
    res2.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return res2;
  } catch (e) {
    console.error("Piyasa API error:", e);
    return NextResponse.json({
      usd: { value: "-", change: "-" },
      eur: { value: "-", change: "-" },
      xu100: { value: "-", change: "-" },
      xu030: { value: "-", change: "-" },
    });
  }
}
