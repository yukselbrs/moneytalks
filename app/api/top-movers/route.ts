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
const TOP_LIMIT = 5;

type SnapshotMoverRow = {
  ticker: string;
  fiyat: number | string | null;
  degisim_yuzde: number | string | null;
};

function safeNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function mapRow(row: SnapshotMoverRow) {
  const fiyat = safeNumber(row.fiyat);
  const degisim = safeNumber(row.degisim_yuzde);
  if (fiyat === null || degisim === null) return null;

  return {
    ticker: row.ticker,
    ad: HISSE_META.get(row.ticker)?.ad || row.ticker,
    fiyat: fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    degisim,
  };
}

function compactRows(rows: SnapshotMoverRow[] | null) {
  return (rows ?? []).map(mapRow).filter((row): row is NonNullable<ReturnType<typeof mapRow>> => row !== null);
}

export async function GET() {
  // BIST pay piyasasında günlük fiyat marjı genel olarak ±10%.
  // Bunun üstündeki snapshot değerleri çoğunlukla bedelsiz/split/stale veri etkisi.
  // 10.01 küçük yuvarlama payı bırakır; ekranda %10 üstü mover gösterilmez.
  const [yukRes, dusRes, hacimRes] = await Promise.all([
    supabase
      .from("hisse_snapshots")
      .select("ticker, fiyat, degisim_yuzde")
      .not("degisim_yuzde", "is", null)
      .not("fiyat", "is", null)
      .gt("hacim", 10000)
      .gt("degisim_yuzde", 0)
      .gte("degisim_yuzde", -BIST_DAILY_LIMIT)
      .lte("degisim_yuzde", BIST_DAILY_LIMIT)
      .order("degisim_yuzde", { ascending: false })
      .limit(TOP_LIMIT),
    supabase
      .from("hisse_snapshots")
      .select("ticker, fiyat, degisim_yuzde")
      .not("degisim_yuzde", "is", null)
      .not("fiyat", "is", null)
      .gt("hacim", 10000)
      .lt("degisim_yuzde", 0)
      .gte("degisim_yuzde", -BIST_DAILY_LIMIT)
      .lte("degisim_yuzde", BIST_DAILY_LIMIT)
      .order("degisim_yuzde", { ascending: true })
      .limit(TOP_LIMIT),
    supabase
      .from("hisse_snapshots")
      .select("ticker, fiyat, degisim_yuzde")
      .not("degisim_yuzde", "is", null)
      .not("fiyat", "is", null)
      .gt("hacim", 10000)
      .gte("degisim_yuzde", -BIST_DAILY_LIMIT)
      .lte("degisim_yuzde", BIST_DAILY_LIMIT)
      .order("hacim", { ascending: false })
      .limit(TOP_LIMIT),
  ]);

  const response = NextResponse.json({
    yukselenler: compactRows(yukRes.data as SnapshotMoverRow[] | null),
    dusenler: compactRows(dusRes.data as SnapshotMoverRow[] | null),
    hacimliler: compactRows(hacimRes.data as SnapshotMoverRow[] | null),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
