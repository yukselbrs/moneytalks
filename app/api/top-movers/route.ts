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

export async function GET() {
  const [yukRes, dusRes] = await Promise.all([
    supabase
      .from("hisse_snapshots")
      .select("ticker, fiyat, degisim_yuzde")
      .not("degisim_yuzde", "is", null)
      .not("fiyat", "is", null)
      .gt("hacim", 0)
      .gte("degisim_yuzde", -30)
      .order("degisim_yuzde", { ascending: false })
      .limit(5),
    supabase
      .from("hisse_snapshots")
      .select("ticker, fiyat, degisim_yuzde")
      .not("degisim_yuzde", "is", null)
      .not("fiyat", "is", null)
      .gt("hacim", 0)
      .lte("degisim_yuzde", 30)
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
