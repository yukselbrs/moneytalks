import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker gerekli" }, { status: 400 });

  try {
    const symbol = ticker.endsWith(".IS") || ticker.endsWith("=X") ? ticker : `${ticker}.IS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return NextResponse.json({ error: "veri yok" }, { status: 404 });

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    const points = timestamps.map((t: number, i: number) => ({
      tarih: new Date(t * 1000).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
      fiyat: closes[i] ? parseFloat(closes[i].toFixed(2)) : null,
    })).filter((p: {tarih: string; fiyat: number | null}) => p.fiyat !== null);

    return NextResponse.json({ points });
  } catch {
    return NextResponse.json({ error: "hata" }, { status: 500 });
  }
}
