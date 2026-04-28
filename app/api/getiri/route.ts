import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker gerekli" }, { status: 400 });

  const symbol = ticker.endsWith(".IS") || ticker.endsWith("=X") ? ticker : `${ticker}.IS`;

  const ranges = ["1wk", "1mo", "3mo", "1y"];
  const results: Record<string, string | null> = {};

  await Promise.all(ranges.map(async (range) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`;
      const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) { results[range] = null; return; }
      const closes = result.indicators?.quote?.[0]?.close || [];
      const valid = closes.filter((c: number | null) => c !== null && c !== undefined);
      if (valid.length < 2) { results[range] = null; return; }
      const ilk = valid[0];
      const son = valid[valid.length - 1];
      const getiri = ((son - ilk) / ilk) * 100;
      results[range] = getiri.toFixed(2);
    } catch {
      results[range] = null;
    }
  }));

  return NextResponse.json({
    ticker,
    "1wk": results["1wk"],
    "1mo": results["1mo"],
    "3mo": results["3mo"],
    "1y": results["1y"],
  });
}
