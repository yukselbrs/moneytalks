import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=MOST_ACTIVES&count=250&region=TR&lang=tr-TR";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    const quotes = data?.finance?.result?.[0]?.quotes || [];
    const hisseler = quotes
      .filter((q: {symbol: string}) => q.symbol.endsWith(".IS"))
      .map((q: {symbol: string; longName?: string; shortName?: string}) => ({
        ticker: q.symbol.replace(".IS", ""),
        ad: q.longName || q.shortName || q.symbol.replace(".IS", ""),
      }));
    return NextResponse.json(hisseler);
  } catch (e) {
    return NextResponse.json({ error: "veri alinamadi" }, { status: 500 });
  }
}
