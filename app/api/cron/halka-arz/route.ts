import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import { ahlatciArzlari, yahooIslemSinyali } from "@/lib/halka-arz-kaynak";
import { kodSlugHaritasi, halkaArzFinansalCek } from "@/lib/halka-arz-finansal";
import { BIST_HISSELER } from "@/lib/bist-hisseler";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ArzSatiri = {
  kod: string;
  durum: "talep_toplaniyor" | "arz_tamamlandi" | "islem_goruyor";
  talep_bitis: string | null;
  islem_tarihi: string | null;
};

// Lifecycle cron'u: (1) kaynaktan yeni arz tespiti + yapisal alan guncelleme,
// (2) talep_bitis gecmisse arz_tamamlandi, (3) Yahoo fiyat akmaya baslamissa islem_goruyor.
// Durum ASLA geri dusmez (islem_goruyor son duraktir). Derin manuel alanlara dokunulmaz.
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baslangic = Date.now();
  const bugun = new Date().toISOString().slice(0, 10);
  let yeni = 0, guncellenen = 0, arzTamamlanan = 0, islemeGecen = 0, hata = 0;
  // Kaynak erisilemezligi YUMUSAK uyaridir (isi kirmizi yapmaz): veri kaybi yok, mevcut satirlar
  // kalir, sonraki kosu tekrar dener. `hata` yalnizca gercek DB yazma basarisizliklarinda artar.
  let kaynakUyari = 0;

  const kaynak = await ahlatciArzlari();
  if (kaynak === null) {
    kaynakUyari = 1;
    hataYakala("halka-arz-cron:kaynak", new Error("Ahlatci listesi cekilemedi (gecici — is kirmizi yapilmaz)"));
  }

  const { data: mevcutData, error: okumaHatasi } = await supabase
    .from("halka_arzlar")
    .select("kod, durum, talep_bitis, islem_tarihi");
  if (okumaHatasi) {
    hataYakala("halka-arz-cron:okuma", okumaHatasi);
    return NextResponse.json({ error: okumaHatasi.message, hata: 1 }, { status: 500 });
  }
  const mevcut = new Map((mevcutData as ArzSatiri[] ?? []).map((r) => [r.kod, r]));
  const statikEvren = new Set(BIST_HISSELER.map((h) => h.ticker));

  // 1) Kaynak -> tablo (insert/update). Statik evrende zaten olan kodlar gecmis arzdir; yeni kayit acilmaz.
  for (const arz of kaynak ?? []) {
    const var_ = mevcut.get(arz.kod);
    const kaynakDurum = arz.aktif ? "talep_toplaniyor" : "arz_tamamlandi";
    if (!var_) {
      if (!arz.aktif && statikEvren.has(arz.kod)) continue;
      const { error } = await supabase.from("halka_arzlar").insert({
        kod: arz.kod,
        sirket_adi: arz.sirket_adi,
        logo_url: arz.logo_url,
        durum: statikEvren.has(arz.kod) ? "islem_goruyor" : kaynakDurum,
        talep_baslangic: arz.talep_baslangic,
        talep_bitis: arz.talep_bitis,
        fiyat: arz.fiyat,
        buyukluk: arz.buyukluk,
        pay_miktari: arz.pay_miktari,
        dagitim_yontemi: arz.dagitim_yontemi,
        iskonto_orani: arz.iskonto_orani,
        halka_aciklik_orani: arz.halka_aciklik_orani,
        araci_kurumlar: arz.araci_kurumlar,
        kaynak: "araci",
        kaynak_linkleri: { araci_sayfa: arz.kaynak_link },
      });
      if (error) { hata = 1; hataYakala("halka-arz-cron:insert", error, { kod: arz.kod }); }
      else { yeni++; mevcut.set(arz.kod, { kod: arz.kod, durum: kaynakDurum, talep_bitis: arz.talep_bitis, islem_tarihi: null }); }
      continue;
    }
    if (var_.durum === "islem_goruyor") continue;
    const guncelleme: Record<string, unknown> = {
      sirket_adi: arz.sirket_adi,
      talep_baslangic: arz.talep_baslangic,
      talep_bitis: arz.talep_bitis,
      fiyat: arz.fiyat,
      buyukluk: arz.buyukluk,
      updated_at: new Date().toISOString(),
    };
    if (arz.logo_url) guncelleme.logo_url = arz.logo_url;
    if (arz.pay_miktari !== null) guncelleme.pay_miktari = arz.pay_miktari;
    if (arz.dagitim_yontemi) guncelleme.dagitim_yontemi = arz.dagitim_yontemi;
    if (arz.iskonto_orani !== null) guncelleme.iskonto_orani = arz.iskonto_orani;
    if (arz.halka_aciklik_orani !== null) guncelleme.halka_aciklik_orani = arz.halka_aciklik_orani;
    if (arz.araci_kurumlar.length) guncelleme.araci_kurumlar = arz.araci_kurumlar;
    if (var_.durum === "talep_toplaniyor" && kaynakDurum === "arz_tamamlandi") {
      guncelleme.durum = "arz_tamamlandi";
      var_.durum = "arz_tamamlandi";
      arzTamamlanan++;
    }
    const { error } = await supabase.from("halka_arzlar").update(guncelleme).eq("kod", arz.kod);
    if (error) { hata = 1; hataYakala("halka-arz-cron:update", error, { kod: arz.kod }); }
    else guncellenen++;
  }

  // 2) Talep penceresi kapananlar: talep_toplaniyor -> arz_tamamlandi.
  for (const r of mevcut.values()) {
    if (r.durum === "talep_toplaniyor" && r.talep_bitis && r.talep_bitis < bugun) {
      const { error } = await supabase.from("halka_arzlar")
        .update({ durum: "arz_tamamlandi", updated_at: new Date().toISOString() })
        .eq("kod", r.kod).eq("durum", "talep_toplaniyor");
      if (error) { hata = 1; hataYakala("halka-arz-cron:tamamla", error, { kod: r.kod }); }
      else { r.durum = "arz_tamamlandi"; arzTamamlanan++; }
    }
  }

  // 3) Islem sinyali: arz_tamamlandi olanlari Yahoo'da yokla; fiyat aktiysa islem_goruyor.
  //    Statik evren disindaki kod hisseler menusunde overlay ile aninda gorunur (lib/hisse-evren).
  const sinyalDetay: Record<string, string> = {};
  for (const r of mevcut.values()) {
    if (r.durum !== "arz_tamamlandi") continue;
    const sinyal = await yahooIslemSinyali(r.kod);
    sinyalDetay[r.kod] = sinyal.detay;
    if (!sinyal.islemGoruyor) continue;
    const { error } = await supabase.from("halka_arzlar")
      .update({ durum: "islem_goruyor", islem_tarihi: sinyal.ilkIslemTarihi ?? bugun, updated_at: new Date().toISOString() })
      .eq("kod", r.kod).eq("durum", "arz_tamamlandi");
    if (error) { hata = 1; hataYakala("halka-arz-cron:islem", error, { kod: r.kod }); }
    else islemeGecen++;
  }

  // 4) Finansal zenginlestirme: izahname bilanco ozeti (halkaarz.info) + hesaplanan F/K & PD/DD.
  //    TradingView yeni kotasyonlarda temel veri tutmadigi icin bu bosluk izahname verisiyle dolar.
  //    Tum tablodaki her arz icin (guncel kalsin) — hafif throttle, hata tekil yutulur (silent fail yok).
  let finansalGuncellenen = 0;
  const slugHarita = await kodSlugHaritasi();
  for (const kod of mevcut.keys()) {
    const slug = slugHarita.get(kod);
    if (!slug) continue;
    try {
      const f = await halkaArzFinansalCek(kod, slug);
      if (!f.finansal && f.piyasa_degeri === null) continue;
      const { error } = await supabase.from("halka_arzlar").update({
        finansal_ozet: f.finansal,
        piyasa_degeri: f.piyasa_degeri,
        fk: f.fk,
        pddd: f.pddd,
        finansal_guncelleme: new Date().toISOString(),
      }).eq("kod", kod);
      if (error) { hata = 1; hataYakala("halka-arz-cron:finansal", error, { kod }); }
      else finansalGuncellenen++;
    } catch (e) {
      hata = 1;
      hataYakala("halka-arz-cron:finansal", e, { kod });
    }
  }

  return NextResponse.json({ yeni, guncellenen, arzTamamlanan, islemeGecen, finansalGuncellenen, hata, kaynakUyari, sinyalDetay, sure_ms: Date.now() - baslangic });
}
