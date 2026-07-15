import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MADENLER } from "@/lib/maden-pricing";

export const revalidate = 0;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET() {
  const { data } = await supabase.from("maden_snapshots").select("*");
  const snapMap = new Map((data || []).map(r => [r.kod as string, r]));
  // Statik evren sirasi korunur; snapshot yoksa satir bos degerlerle doner (tablo kurulmadan da sayfa acilir).
  const items = MADENLER.map(m => ({
    kod: m.kod,
    ad: m.ad,
    birim: m.birim,
    para_birimi: m.paraBirimi,
    ...((snapMap.get(m.kod) as object) || {}),
  }));
  const res = NextResponse.json({ items });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
