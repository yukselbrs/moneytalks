import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BIST_HISSELER } from "@/lib/bist-hisseler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const HISSE_META = new Map(BIST_HISSELER.map((h) => [h.ticker, h]));
const BIST_DAILY_LIMIT = 10.01;

export async function GET() {
  // BIST pay piyasasında günlük fiyat marjı genel olarak ±10%.
  // Bunun üstündeki snapshot değerleri çoğunlukla bedelsiz/split/stale veri etkisi.
  // 10.01 küçük yuvarlama payı bırakır; ekranda %10 üstü mover gösterilmez.
  const [yukRes, dusRes] = await Promise.all([
    supabase
      .from("hisse_snapshots")
      .select("ticker, fiyat, degisim_yuzde")
      .not("degisim_yuzde", "is", null)
      .not("fiyat", "is", null)
      .gt("hacim", 10000)
      .gte("degisim_yuzde", -BIST_DAILY_LIMIT)
      .lte("degisim_yuzde", BIST_DAILY_LIMIT)
      .order("degisim_yuzde", { ascending: false })
      .limit(5),
    supabase
      .from("hisse_snapshots")
      .select("ticker, fiyat, degisim_yuzde")
      .not("degisim_yuzde", "is", null)
      .not("fiyat", "is", null)
      .gt("hacim", 10000)
      .gte("degisim_yuzde", -BIST_DAILY_LIMIT)
      .lte("degisim_yuzde", BIST_DAILY_LIMIT)
      .order("degisim_yuzde", { ascending: true })
      .limit(5),
  ]);

  const mapRow = (row: { ticker: string; fiyat: number; degisim_yuzde: number }) => ({
    ticker: row.ticker,
    ad: HISSE_META.get(row.ticker)?.ad || row.ticker,
    fiyat: Number(row.fiyat).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    degisim: Number(row.degisim_yuzde),
  });

  const response = NextResponse.json({
    yukselenler: (yukRes.data || []).map(mapRow),
    dusenler: (dusRes.data || []).map(mapRow),
  });
  response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  return response;
}
