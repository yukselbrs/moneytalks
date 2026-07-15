import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import { madenSnapshotlariUret } from "@/lib/maden-pricing";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const start = Date.now();
  const { satirlar, hata: fetchHata } = await madenSnapshotlariUret();
  let hata = fetchHata;

  if (satirlar.length) {
    const { error } = await supabase.from("maden_snapshots").upsert(
      satirlar.map(s => ({ ...s, updated_at: new Date().toISOString() }))
    );
    if (error) {
      hataYakala("maden-cron:upsert", error);
      return NextResponse.json({ error: error.message, hata: hata + 1 }, { status: 500 });
    }
  }
  if (fetchHata) hataYakala("maden-cron:fetch", new Error(`${fetchHata} sembol cekilemedi`));

  return NextResponse.json({ saved: satirlar.length, duration_ms: Date.now() - start, hata });
}
