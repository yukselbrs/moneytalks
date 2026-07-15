import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MADENLER, madenGrafik, oynaklikProfili, fetchOnsSerisi } from "@/lib/maden-pricing";

export const revalidate = 0;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(req: NextRequest, { params }: { params: Promise<{ kod: string }> }) {
  const { kod: kodParam } = await params;
  const kod = kodParam.toLocaleLowerCase("tr-TR");
  const tanim = MADENLER.find(m => m.kod === kod);
  if (!tanim) return NextResponse.json({ error: "Maden bulunamadı" }, { status: 404 });

  const range = req.nextUrl.searchParams.get("range") || "1mo";
  const [{ data: snap }, grafik, seri] = await Promise.all([
    supabase.from("maden_snapshots").select("*").eq("kod", kod).maybeSingle(),
    madenGrafik(kod, range),
    fetchOnsSerisi(tanim.yahooSembol),
  ]);

  const res = NextResponse.json({
    maden: { kod: tanim.kod, ad: tanim.ad, birim: tanim.birim, para_birimi: tanim.paraBirimi, ...(snap || {}) },
    grafik,
    range,
    profil: oynaklikProfili(seri),
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
