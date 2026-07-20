import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeTicker } from "@/lib/utils";
import { bilancoSnapshotlariUret } from "@/lib/bilanco";

export const revalidate = 0;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: tickerParam } = await params;
  const ticker = normalizeTicker(tickerParam);
  if (!ticker) return NextResponse.json({ error: "Geçersiz ticker" }, { status: 400 });

  const { data } = await supabase.from("bilanco_snapshots").select("*").eq("ticker", ticker).maybeSingle();

  // Canli fallback: satir yok, YA DA eski kisa-format (ceyrek_seri < 5 -> yil-uzeri karsilastirma icin yetersiz).
  // Boylece deploy sonrasi cron'u beklemeden 8-ceyrek gelir; cron 8 yazinca hizli tablo okumasi devralir.
  const seri = (data?.ceyrek_seri as { net_kar?: unknown[] } | null)?.net_kar;
  const yetersiz = !Array.isArray(seri) || seri.length < 5;
  let bilanco = data;
  if (!bilanco || yetersiz) {
    const { satirlar } = await bilancoSnapshotlariUret([ticker]);
    if (satirlar[0]) bilanco = { ...satirlar[0], son_bildirim_tarihi: data?.son_bildirim_tarihi ?? null, kaynak: "tradingview", updated_at: new Date().toISOString() };
  }

  const res = NextResponse.json({ bilanco });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
