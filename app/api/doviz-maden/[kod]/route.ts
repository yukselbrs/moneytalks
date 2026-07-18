import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enstrumanBul, enstrumanParaBirimi, enstrumanGrafik, oynaklikProfili, fetchProfilSerisi, canliSnapshotlar } from "@/lib/enstruman-pricing";

export const revalidate = 0;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(req: NextRequest, { params }: { params: Promise<{ kod: string }> }) {
  const { kod: kodParam } = await params;
  const kod = kodParam.toLocaleLowerCase("tr-TR");
  const tanim = enstrumanBul(kod);
  if (!tanim) return NextResponse.json({ error: "Enstrüman bulunamadı" }, { status: 404 });

  const range = req.nextUrl.searchParams.get("range") || "1mo";
  const [{ data: snap }, grafik, seri] = await Promise.all([
    supabase.from("enstruman_snapshots").select("*").eq("kod", kod).maybeSingle(),
    enstrumanGrafik(kod, range),
    fetchProfilSerisi(kod),
  ]);

  // Gecis koprusu: yeni tablo bossa canli uretimden (60 sn cache), o da yoksa maden icin eski tablodan.
  let snapshot = snap;
  if (!snapshot) {
    const canli = await canliSnapshotlar();
    snapshot = canli.get(kod) ?? null;
  }
  if (!snapshot && tanim.tur === "maden") {
    const { data: eski } = await supabase.from("maden_snapshots").select("*").eq("kod", kod).maybeSingle();
    snapshot = eski;
  }

  const res = NextResponse.json({
    enstruman: {
      kod: tanim.kod,
      tur: tanim.tur,
      ad: tanim.ad,
      aciklama: tanim.tur === "doviz" ? tanim.aciklama : null,
      birim: tanim.tur === "maden" ? tanim.birim : null,
      taban: tanim.tur === "doviz" ? tanim.taban : null,
      karsi: tanim.tur === "doviz" ? tanim.karsi : null,
      para_birimi: enstrumanParaBirimi(tanim),
      ...(snapshot || {}),
    },
    grafik,
    range,
    profil: oynaklikProfili(seri),
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
