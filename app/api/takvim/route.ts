import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Birlesik takvim okuma ucu — dort alt takvimin TEK giris noktasi.
//   ?tip=ekonomik   -> ekonomik_takvim
//   ?tip=bilanco    -> sirket_takvim_etkinlikleri (event_type=bilanco_aciklama)
//   ?tip=temettu    -> sirket_takvim_etkinlikleri (event_type=temettu)
//   ?tip=halka-arz  -> halka_arzlar (kendi tablosu; asama tarihlerine acilir)
// Veriyi /api/cron/takvim (KAP + ForexFactory + Fed + TR kural ureteci) ve
// /api/cron/halka-arz yazar. Bu uc yalniz okur — anon key, RLS altinda.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const bugun = () => new Date().toISOString().slice(0, 10);

type TakvimTip = "ekonomik" | "bilanco" | "temettu" | "halka-arz";

// Halka arz asamalari — bir arz takvimde birden fazla gunde gorunur.
const HA_ASAMA = [
  { alan: "talep_baslangic", etiket: "Talep toplama başlangıcı" },
  { alan: "talep_bitis", etiket: "Talep toplama bitişi" },
  { alan: "islem_tarihi", etiket: "Borsada işlem görmeye başlıyor" },
] as const;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tip = (searchParams.get("tip") || "ekonomik") as TakvimTip;
  const from = searchParams.get("from") || bugun();
  const to = searchParams.get("to") || from;

  if (tip === "ekonomik") {
    const { data, error } = await supabase
      .from("ekonomik_takvim")
      .select("ulke_kod, ulke_bayrak, olay, tarih, saat, onem, onceki, beklenti, gerceklesen, ilgili_enstruman")
      .gte("tarih", from).lte("tarih", to)
      .order("tarih").order("saat", { nullsFirst: false });
    if (error) return NextResponse.json({ events: [], hata: error.message });
    return NextResponse.json({
      events: (data ?? []).map((e) => ({
        tarih: e.tarih,
        saat: e.saat ?? "—",
        baslik: e.olay,
        onem: e.onem,
        ulke: e.ulke_bayrak,
        ulkeKod: e.ulke_kod,
        beklenti: e.beklenti,
        onceki: e.onceki,
        gerceklesen: e.gerceklesen,
        link: e.ilgili_enstruman ? `/doviz-maden/${e.ilgili_enstruman}` : null,
      })),
    });
  }

  if (tip === "bilanco" || tip === "temettu") {
    const eventType = tip === "bilanco" ? "bilanco_aciklama" : "temettu";
    const { data, error } = await supabase
      .from("sirket_takvim_etkinlikleri")
      .select("ticker, tarih, tarih_kesin, durum, donem, donem_bitis, brut_tutar, net_tutar, stopaj_orani, para_birimi, odeme_sekli, genel_kurul_tarihi, kap_link")
      .eq("event_type", eventType)
      .gte("tarih", from).lte("tarih", to)
      .order("tarih").order("ticker");
    if (error) return NextResponse.json({ events: [], hata: error.message });
    return NextResponse.json({
      events: (data ?? []).map((e) => ({
        tarih: e.tarih,
        ticker: e.ticker,
        tarihKesin: e.tarih_kesin,
        durum: e.durum,
        donem: e.donem,
        donemBitis: e.donem_bitis,
        brutTutar: e.brut_tutar,
        netTutar: e.net_tutar,
        stopajOrani: e.stopaj_orani,
        paraBirimi: e.para_birimi,
        odemeSekli: e.odeme_sekli,
        genelKurulTarihi: e.genel_kurul_tarihi,
        kapLink: e.kap_link,
        link: `/hisse/${e.ticker}`,
      })),
    });
  }

  if (tip === "halka-arz") {
    const { data, error } = await supabase
      .from("halka_arzlar")
      .select("kod, sirket_adi, logo_url, durum, talep_baslangic, talep_bitis, islem_tarihi, fiyat, fiyat_ust, buyukluk, dagitim_yontemi, pazar")
      .order("talep_baslangic", { ascending: false, nullsFirst: false });
    if (error) return NextResponse.json({ events: [], hata: error.message });
    const events = [];
    for (const a of data ?? []) {
      for (const { alan, etiket } of HA_ASAMA) {
        const tarih = a[alan];
        if (!tarih || tarih < from || tarih > to) continue;
        events.push({
          tarih,
          kod: a.kod,
          sirketAdi: a.sirket_adi,
          logoUrl: a.logo_url,
          durum: a.durum,
          asama: etiket,
          asamaAlan: alan,
          fiyat: a.fiyat,
          fiyatUst: a.fiyat_ust,
          buyukluk: a.buyukluk,
          dagitimYontemi: a.dagitim_yontemi,
          pazar: a.pazar,
          link: `/halka-arz/${a.kod}`,
        });
      }
    }
    events.sort((x, y) => x.tarih.localeCompare(y.tarih) || x.kod.localeCompare(y.kod));
    return NextResponse.json({ events });
  }

  return NextResponse.json({ events: [], hata: "bilinmeyen tip" }, { status: 400 });
}
