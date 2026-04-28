import { NextResponse } from "next/server";

// 24 saatlik cache
let cache: { data: {ticker: string; ad: string}[]; ts: number } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.ts < 86400000) {
    return NextResponse.json(cache.data);
  }

  try {
    // Yahoo Finance tüm IST borsası hisseleri
    const tickers: string[] = [];
    
    // Sayfalı çekme - her seferinde 100 kayıt
    for (let offset = 0; offset < 700; offset += 100) {
      const url = `https://query1.finance.yahoo.com/v1/finance/screener?formatted=false&lang=en-US&region=US&count=100&offset=${offset}`;
      const body = {
        size: 100,
        offset,
        sortField: "ticker",
        sortType: "ASC", 
        quoteType: "EQUITY",
        query: {
          operator: "AND",
          operands: [
            { operator: "EQ", operands: ["exchange", "IST"] }
          ]
        }
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (!res.ok) break;
      const data = await res.json();
      const quotes = data?.finance?.result?.[0]?.quotes || [];
      if (quotes.length === 0) break;

      quotes.forEach((q: {symbol: string; longName?: string; shortName?: string}) => {
        tickers.push(JSON.stringify({
          ticker: q.symbol.replace(".IS", ""),
          ad: q.longName || q.shortName || q.symbol.replace(".IS", ""),
        }));
      });

      if (quotes.length < 100) break;
    }

    const hisseler = tickers.map(t => JSON.parse(t));
    cache = { data: hisseler, ts: Date.now() };
    return NextResponse.json(hisseler);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
