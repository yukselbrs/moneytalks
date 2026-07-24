import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Takvim listesi: aktifler (talep_toplaniyor + arz_tamamlandi) ve gecmis (islem_goruyor) ayri.
// Tablo henuz olusturulmadiysa (migration Baris'ta) guvenle bos doner — sayfa graceful.
export async function GET() {
  const { data, error } = await supabase
    .from("halka_arzlar")
    .select("kod, sirket_adi, logo_url, durum, talep_baslangic, talep_bitis, islem_tarihi, fiyat, fiyat_ust, buyukluk, dagitim_yontemi, pazar, iskonto_orani, araci_kurumlar, created_at")
    .order("talep_baslangic", { ascending: false, nullsFirst: false });
  if (error) {
    console.error("halka-arz liste HATA:", error.message);
    return NextResponse.json({ aktif: [], gecmis: [] });
  }
  const rows = data ?? [];
  return NextResponse.json({
    aktif: rows.filter((r) => r.durum !== "islem_goruyor"),
    gecmis: rows.filter((r) => r.durum === "islem_goruyor"),
  });
}
