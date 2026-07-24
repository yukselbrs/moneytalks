import { NextRequest, NextResponse } from "next/server";
import { isyOzetFinansal, isyCarpanlar, type IsyOzetFinansal } from "@/lib/isyatirim-finansal";
import { tickerCozOverlayli } from "@/lib/hisse-evren";

export const runtime = "nodejs";

// Is Yatirim ozet finansal + hesaplanan F/K & PD/DD (guncel piyasa degeri / TTM net kar & ozkaynak).
// Yeni kotasyonlar TradingView'de temel veri tutmadigi icin hisse sayfasi bilanco/carpan bunlardan gelir.
// 15 dk in-memory cache — Is Yatirim gunluk/ceyreklik veri, sik cagriya gerek yok.

type CacheEntry = { veri: FinansalYanit | null; ts: number };
type FinansalYanit = { ozet: IsyOzetFinansal; fk: number | null; pddd: number | null; piyasa_degeri: number | null };
const g = globalThis as typeof globalThis & { finansalCache?: Map<string, CacheEntry> };
if (!g.finansalCache) g.finansalCache = new Map();
const TTL = 15 * 60 * 1000;

async function tvPiyasaDegeri(ticker: string): Promise<number | null> {
  try {
    const res = await fetch("https://scanner.tradingview.com/turkey/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ symbols: { tickers: [`BIST:${ticker}`] }, columns: ["market_cap_basic"] }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const v = j?.data?.[0]?.d?.[0];
    return typeof v === "number" && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await params;
  const ticker = await tickerCozOverlayli(raw);
  if (!ticker) return NextResponse.json({ veri: null }, { status: 400 });

  const cache = g.finansalCache!;
  const simdi = Date.now();
  const eski = cache.get(ticker);
  if (eski && simdi - eski.ts < TTL) return NextResponse.json({ veri: eski.veri });

  const now = new Date();
  const bugun = { yil: now.getUTCFullYear(), ay: now.getUTCMonth() + 1 };
  const [ozet, piyasaDegeri] = await Promise.all([
    isyOzetFinansal(ticker, bugun),
    tvPiyasaDegeri(ticker),
  ]);

  let veri: FinansalYanit | null = null;
  if (ozet) {
    const { fk, pddd } = isyCarpanlar(ozet, piyasaDegeri);
    veri = { ozet, fk, pddd, piyasa_degeri: piyasaDegeri };
  }

  if (cache.size > 300) {
    for (const [k, v] of cache) { if (simdi - v.ts > TTL) cache.delete(k); }
  }
  cache.set(ticker, { veri, ts: simdi });
  return NextResponse.json({ veri });
}
