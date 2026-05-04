import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEMETTU_HISSELER = [
  "THYAO","GARAN","AKBNK","EREGL","SISE","KCHOL","BIMAS","ASELS","TUPRS","FROTO",
  "TOASO","SAHOL","YKBNK","HALKB","VAKBN","ISCTR","PGSUS","ARCLK","TCELL","TTKOM",
  "KOZAA","KOZAL","PETKM","KRDMD","ENKAI","OYAKC","VESTL","MGROS","ULKER","AEFES",
  "LOGO","KERVT","TAVHL","MAVI","DOAS","GUBRF","ALARK","SOKM","CWENE","SASA",
  "ISMEN","NETAS","TURSG","ODAS","EKGYO","IHLGM","SELEC","ZOREN","OTKAR","INDES"
];

type DivEvent = { amount: number; date: number };

async function fetchTemettu(ticker: string): Promise<{ ticker: string; tarih: string; tutar: number }[]> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?events=dividends&range=2y&interval=1d`,
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const divs: Record<string, DivEvent> = data?.chart?.result?.[0]?.events?.dividends || {};
    return Object.values(divs).map((d) => ({
      ticker,
      tarih: new Date(d.date * 1000).toISOString().slice(0, 10),
      tutar: Math.round(d.amount * 100) / 100,
    }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yil = parseInt(searchParams.get("yil") || String(new Date().getFullYear()));
  const ay = parseInt(searchParams.get("ay") || String(new Date().getMonth() + 1));

  const BATCH = 10;
  const results: { ticker: string; tarih: string; tutar: number }[] = [];

  for (let i = 0; i < TEMETTU_HISSELER.length; i += BATCH) {
    const batch = TEMETTU_HISSELER.slice(i, i + BATCH);
    const data = await Promise.all(batch.map(fetchTemettu));
    data.flat().forEach(d => results.push(d));
  }

  const filtered = results.filter(d => {
    const date = new Date(d.tarih);
    return date.getFullYear() === yil && date.getMonth() + 1 === ay;
  });

  filtered.sort((a, b) => a.tarih.localeCompare(b.tarih));

  return NextResponse.json({ dividends: filtered });
}
