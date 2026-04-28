import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Yahoo Finance query2 endpoint - BIST tüm hisseler
    const url = "https://query2.finance.yahoo.com/v1/finance/screener?formatted=false&lang=en-US&region=TR&crumb=&count=250&offset=0";
    const body = {
      size: 250,
      offset: 0,
      sortField: "ticker",
      sortType: "ASC",
      quoteType: "EQUITY",
      query: {
        operator: "AND",
        operands: [
          { operator: "EQ", operands: ["region", "tr"] },
          { operator: "EQ", operands: ["exchange", "IST"] }
        ]
      },
      userId: "",
      userIdType: "guid"
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    const quotes = data?.finance?.result?.[0]?.quotes || [];
    const hisseler = quotes.map((q: {symbol: string; longName?: string; shortName?: string}) => ({
      ticker: q.symbol.replace(".IS", ""),
      ad: q.longName || q.shortName || q.symbol.replace(".IS", ""),
    }));
    return NextResponse.json({ count: hisseler.length, hisseler });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
