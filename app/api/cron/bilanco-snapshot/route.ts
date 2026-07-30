import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import { bilancoSnapshotlariUret } from "@/lib/bilanco";
import bistHisseler from "@/data/bist-companies.json";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type BistEntry = { ticker: string };

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const start = Date.now();
  const tickerlar = (bistHisseler as BistEntry[]).map(h => h.ticker).filter(Boolean);
  const { satirlar, hata: fetchHata } = await bilancoSnapshotlariUret(tickerlar);
  const hata = fetchHata;
  if (fetchHata) hataYakala("bilanco-cron:fetch", new Error(`${fetchHata} chunk cekilemedi`));

  if (!satirlar.length) {
    return NextResponse.json({ error: "Hicbir bilanco cekilemedi", saved: 0, hata: hata || 1 }, { status: 500 });
  }

  // En az bir anlamli finansal kalemi olan satirlari yaz (bos/kotasyondan dusmus tickerlari atla).
  const simdi = new Date().toISOString();
  const yazilacak = satirlar
    .filter(s => s.toplam_varlik !== null || s.net_kar !== null || s.fk !== null)
    .map(s => ({ ...s, kaynak: "tradingview", updated_at: simdi }));

  const { error } = await supabase.from("bilanco_snapshots").upsert(yazilacak, { onConflict: "ticker" });
  if (error) {
    hataYakala("bilanco-cron:upsert", error);
    return NextResponse.json({ error: error.message, saved: 0, hata: hata + 1 }, { status: 500 });
  }

  return NextResponse.json({ saved: yazilacak.length, toplamCekilen: satirlar.length, duration_ms: Date.now() - start, hata });
}
