import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ENSTRUMANLAR, enstrumanParaBirimi } from "@/lib/enstruman-pricing";

export const revalidate = 0;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET() {
  const { data, error } = await supabase.from("enstruman_snapshots").select("*");
  const snapMap = new Map((data || []).map(r => [r.kod as string, r as object]));

  // Gecis koprusu: migration henuz calismadiysa maden verisi eski tablodan okunur (FAZ 8'de kalkar).
  if (error || !data?.length) {
    const { data: eski } = await supabase.from("maden_snapshots").select("*");
    for (const r of eski || []) snapMap.set(r.kod as string, r as object);
  }

  // Statik evren sirasi korunur; snapshot yoksa satir bos degerlerle doner (tablo kurulmadan da sayfa acilir).
  const items = ENSTRUMANLAR.map(e => ({
    kod: e.kod,
    tur: e.tur,
    ad: e.ad,
    aciklama: e.tur === "doviz" ? e.aciklama : e.birim === "gram" ? "Gram · TL (türetilmiş)" : "Ons · USD (spot)",
    birim: e.tur === "maden" ? e.birim : null,
    para_birimi: enstrumanParaBirimi(e),
    ...(snapMap.get(e.kod) || {}),
  }));
  const res = NextResponse.json({ items });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
