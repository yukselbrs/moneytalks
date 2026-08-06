import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import { temettuCek, temettuTutarTamamla, aciklananBilancolar, type FrTeshis } from "@/lib/takvim-kaynak";
import { ekonomikTakvimTopla } from "@/lib/ekonomik-takvim-kaynak";
import { bilancoSnapshotlariUret } from "@/lib/bilanco";
import { yeniKotasyonOverlay } from "@/lib/hisse-evren";
import bistSirketler from "@/data/bist-companies.json";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Birlesik takvim cron'u — 3 bagimsiz adim. Bir adimin kaynagi duserse digerleri calisir.
// KALDIRILAN ADIM: KAP "Finansal Takvim" (sirket-beyanli planlanan bilanco tarihleri).
//   attachment-detail yaniti tablo iskeletini veriyor ama deger hucreleri BOS (83/83
//   bildirimde dogrulandi) — kosu basina 83 detay istegi harciyor, 0 satir uretiyor ve
//   ardindan gelen FR liste cagrisini KAP WAF'ina yakiyordu. Bilanco takvimi artik
//   FIILEN aciklanan raporlardan kuruluyor (adim 1).
// `hata` YALNIZ gercek DB yazma basarisizliklarinda artar (isi kirmizi yapar);
// kaynak erisilemezligi `kaynakUyari`dir (halka-arz cron'uyla ayni desen).
// Halka Arz takvimi AYRI cron'da (/api/cron/halka-arz) — buraya karistirilmadi.

type Sayac = { yeni: number; guncellenen: number };

// Partial unique index'ler ON CONFLICT ile cikarsanamaz -> oku/karsilastir/yaz.
async function ustuneYaz(
  mevcutAnahtar: Map<string, { id: string; imza: string }>,
  anahtar: string,
  imza: string,
  satir: Record<string, unknown>,
  sayac: Sayac,
): Promise<number> {
  const mevcut = mevcutAnahtar.get(anahtar);
  if (!mevcut) {
    const { error } = await supabase.from("sirket_takvim_etkinlikleri").insert(satir);
    if (error) { hataYakala("takvim-cron:insert", error, { anahtar }); return 1; }
    sayac.yeni++;
    return 0;
  }
  if (mevcut.imza === imza) return 0;               // degismemis -> gereksiz yazma yok
  const { error } = await supabase.from("sirket_takvim_etkinlikleri")
    .update({ ...satir, updated_at: new Date().toISOString() }).eq("id", mevcut.id);
  if (error) { hataYakala("takvim-cron:update", error, { anahtar }); return 1; }
  sayac.guncellenen++;
  return 0;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const baslangic = Date.now();
  let hata = 0;
  const kaynakUyari: string[] = [];

  // Mevcut sirket takvimi satirlari (imza ile degisiklik tespiti)
  const { data: mevcutData, error: okumaHatasi } = await supabase
    .from("sirket_takvim_etkinlikleri")
    .select("id, event_type, ticker, tarih, donem, durum, tarih_kesin, net_tutar");
  if (okumaHatasi) {
    hataYakala("takvim-cron:okuma", okumaHatasi);
    return NextResponse.json({ error: okumaHatasi.message, hata: 1 }, { status: 500 });
  }
  const bilancoMevcut = new Map<string, { id: string; imza: string }>();
  const temettuMevcut = new Map<string, { id: string; imza: string }>();
  for (const r of mevcutData ?? []) {
    if (r.event_type === "bilanco_aciklama") {
      bilancoMevcut.set(`${r.ticker}|${r.donem}`, { id: r.id, imza: `${r.tarih}|${r.durum}|${r.tarih_kesin}` });
    } else if (r.event_type === "temettu") {
      temettuMevcut.set(`${r.ticker}|${r.tarih}`, { id: r.id, imza: `${r.net_tutar}|${r.durum}` });
    }
  }

  // ---- 1) ACIKLANAN BILANCOLAR (KAP "Finansal Rapor") -> bilanco takvimi + modul tetikleme ----
  // ONCE calisir: liste cagrisi ucuz ve detay cekimlerinden ONCE yapilmali. Temettu adimi
  // kosu basina 120 detay istegi yapabiliyor; ardindan KAP WAF ayni cagri icinde IP'yi
  // kapatiyor ve FR listesi hep 500 doneyordu.
  // (ortak servis: bilancoSnapshotlariUret — kod tekrari yok)
  let aciklandiIsaretlenen = 0;
  let bilancoSnapshotYazilan = 0;
  const frTeshis: FrTeshis = { toplam: 0, fr: 0, donemsiz: 0 };
  const aciklanan = await aciklananBilancolar(8, frTeshis);
  if (aciklanan === null) kaynakUyari.push("kap-finansal-rapor");
  // KAP'a FR bildiren her kurum BIST HISSESI DEGIL: varlik kiralama sirketleri (DGRVK,
  // BRGFK), faktoring (AKDFA, ALJF), tahvil ihraccilari... Bunlar takvime girerse
  // (a) satirlarin %42'si kullaniciya anlamsiz oluyordu, (b) satir tiklamasi
  // /hisse/[ticker] 404 veriyordu, (c) bilanco snapshot kuyrugunu kalici tikiyorlardi
  // (hisse olmadiklari icin Is Yatirim'da karsiliklari yok). Hisse evrenine suzuluyor;
  // overlay yeni kotasyonlari JSON sync'ini beklemeden kapsar.
  const evren = new Set((bistSirketler as { ticker: string }[]).map((c) => c.ticker));
  for (const o of await yeniKotasyonOverlay()) evren.add(o.ticker);
  let evrenDisi = 0;

  const tetiklenecek = new Set<string>();
  for (const a of aciklanan ?? []) {
    if (!a.donem) continue;                      // donemi cozulemeyen bildirim takvime girmez
    if (!evren.has(a.ticker)) { evrenDisi++; continue; }
    // Bekleyen satir varsa 'aciklandi'ya cevir; yoksa aciklanan raporun KENDISINI yaz.
    // (Beyan edilen planlanan tarihler KAP API'sinde gelmedigi icin takvimin birincil
    //  icerigi budur — fiilen aciklanmis, tarihi kesin raporlar.)
    const anahtar = `${a.ticker}|${a.donem}`;
    const satir = {
      event_type: "bilanco_aciklama",
      ticker: a.ticker,
      tarih: a.tarih,
      tarih_kesin: true,
      durum: "aciklandi",
      donem: a.donem,
      donem_bitis: a.donemBitis,
      kaynak: "kap",
      kap_disclosure_index: a.index,
      kap_link: `https://www.kap.org.tr/tr/Bildirim/${a.index}`,
    };
    const mevcut = bilancoMevcut.get(anahtar);
    if (!mevcut) {
      const { error } = await supabase.from("sirket_takvim_etkinlikleri").insert(satir);
      if (error) { hata = 1; hataYakala("takvim-cron:aciklandi-insert", error, { anahtar }); continue; }
      bilancoMevcut.set(anahtar, { id: "", imza: `${a.tarih}|aciklandi|true` });
      aciklandiIsaretlenen++; tetiklenecek.add(a.ticker);
    } else if (mevcut.imza !== `${a.tarih}|aciklandi|true`) {
      const { error } = await supabase.from("sirket_takvim_etkinlikleri")
        .update({ ...satir, updated_at: new Date().toISOString() })
        .eq("ticker", a.ticker).eq("event_type", "bilanco_aciklama").eq("donem", a.donem);
      if (error) { hata = 1; hataYakala("takvim-cron:aciklandi", error, { anahtar }); continue; }
      mevcut.imza = `${a.tarih}|aciklandi|true`;
      aciklandiIsaretlenen++; tetiklenecek.add(a.ticker);
    }
  }
  // Bilanco modulu tetikleme — kosu basina tavan. Ilk kosuda 80+ rapor birden gelebiliyor;
  // hepsini tek istekte cekmek 60sn butcesini asar.
  //
  // KENDINI ONARAN GERI-DOLDURMA: tavan yuzunden atlananlar SONRAKI kosuda yeniden
  // denenmeli. Yalniz "bu kosuda degisen satirlar"a bakmak yetmiyordu — satir bir kez
  // yazildiktan sonra imzasi sabitleniyor ve o ticker bir daha hic tetiklenmiyordu
  // (ilk kosuda 94 ticker atlandi, 66'si snapshot'siz kaldi). Bu yuzden takvimde satiri
  // olup bilanco_snapshots'ta KAYDI OLMAYAN ticker'lar da kuyruga ekleniyor; kuyruk
  // kosu kosu eriyor.
  const { data: snapVar, error: snapHata } = await supabase.from("bilanco_snapshots").select("ticker");
  if (snapHata) hataYakala("takvim-cron:snapshot-okuma", snapHata);
  const snapSet = new Set((snapVar ?? []).map((s) => s.ticker));
  const { data: takvimTicker } = await supabase
    .from("sirket_takvim_etkinlikleri").select("ticker").eq("event_type", "bilanco_aciklama");
  for (const r of takvimTicker ?? []) if (!snapSet.has(r.ticker) && evren.has(r.ticker)) tetiklenecek.add(r.ticker);

  const TETIK_TAVAN = 20;
  const tetikLIstesi = [...tetiklenecek].slice(0, TETIK_TAVAN);
  const tetikAtlanan = tetiklenecek.size - tetikLIstesi.length;
  if (tetikLIstesi.length) {
    try {
      const { satirlar } = await bilancoSnapshotlariUret(tetikLIstesi);
      const yazilacak = satirlar.filter((s) => s.toplam_varlik !== null || s.hasilat !== null || s.net_kar !== null);
      if (yazilacak.length) {
        const { error } = await supabase.from("bilanco_snapshots")
          .upsert(yazilacak.map((s) => ({ ...s, updated_at: new Date().toISOString() })), { onConflict: "ticker" });
        if (error) { hata = 1; hataYakala("takvim-cron:bilanco-tetik", error); }
        else bilancoSnapshotYazilan = yazilacak.length;
      }
    } catch (e) {
      hata = 1;
      hataYakala("takvim-cron:bilanco-tetik", e);
    }
  }

  // ---- 2) TEMETTU (KAP "Kar Payi Dagitimi", yalniz odeme yapanlar) ----
  const temettuSayac: Sayac = { yeni: 0, guncellenen: 0 };
  const temettu = await temettuCek();
  if (temettu === null) kaynakUyari.push("kap-kar-payi");
  for (const t of temettu ?? []) {
    hata += await ustuneYaz(temettuMevcut, `${t.ticker}|${t.tarih}`, `${t.net_tutar}|bekleniyor`, {
      event_type: "temettu",
      ticker: t.ticker,
      tarih: t.tarih,
      tarih_kesin: true,           // odeme tarihi genel kurulda kesinlesir
      durum: "bekleniyor",
      brut_tutar: t.brut_tutar,
      net_tutar: t.net_tutar,
      stopaj_orani: t.stopaj_orani,
      para_birimi: t.para_birimi,
      odeme_sekli: t.odeme_sekli,
      genel_kurul_tarihi: t.genel_kurul_tarihi,
      karar_tarihi: t.karar_tarihi,
      kaynak: "kap",
      kap_disclosure_index: t.kap_disclosure_index,
      kap_link: `https://www.kap.org.tr/tr/Bildirim/${t.kap_disclosure_index}`,
      ham_alanlar: t.ham_alanlar,
    }, temettuSayac);
  }

  // Tutari bos kalmis ESKI temettu satirlarini onar. Bu satirlar canli 45 gunluk
  // pencerenin disinda kaldigi icin yukaridaki dongu onlara hic ugramiyor; saklanan
  // kap_disclosure_index ile bildirimi dogrudan cekip duzeltilmis matris parser'iyla
  // cozuyoruz. Kosu basina tavan — kuyruk kosu kosu eriyor.
  // Kosul YALNIZ net_tutar: "genel kurul tarihi bos" olanlari da kuyruga alinca,
  // bildirimde gercekten genel kurul tarihi OLMAYAN satirlar (yonetim kurulu karari
  // verilmis, GK henuz toplanmamis) her kosuda bosuna yeniden cekiliyordu.
  let temettuOnarilan = 0;
  const { data: bosTutarlar } = await supabase
    .from("sirket_takvim_etkinlikleri")
    .select("id, ticker, kap_disclosure_index")
    .eq("event_type", "temettu").is("net_tutar", null).not("kap_disclosure_index", "is", null)
    .limit(12);
  if (bosTutarlar?.length) {
    const onarim = await temettuTutarTamamla(
      bosTutarlar.map((r) => ({ ticker: r.ticker, index: r.kap_disclosure_index as number })),
    );
    const idHarita = new Map(bosTutarlar.map((r) => [r.kap_disclosure_index as number, r.id]));
    for (const { index, kayit } of onarim) {
      const id = idHarita.get(index);
      if (!id) continue;
      const { error } = await supabase.from("sirket_takvim_etkinlikleri").update({
        brut_tutar: kayit.brut_tutar,
        net_tutar: kayit.net_tutar,
        stopaj_orani: kayit.stopaj_orani,
        odeme_sekli: kayit.odeme_sekli ?? undefined,
        genel_kurul_tarihi: kayit.genel_kurul_tarihi ?? undefined,
        karar_tarihi: kayit.karar_tarihi ?? undefined,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) { hata = 1; hataYakala("takvim-cron:temettu-onarim", error, { index }); continue; }
      temettuOnarilan++;
    }
  }

  // ---- 3) EKONOMIK TAKVIM (ForexFactory + Fed + TR kural ureteci) ----
  const ekoSayac: Sayac = { yeni: 0, guncellenen: 0 };
  const { olaylar, uyari } = await ekonomikTakvimTopla(new Date().getUTCFullYear());
  kaynakUyari.push(...uyari.map((u) => `ekonomik:${u}`));
  if (olaylar.length) {
    const { data: ekoMevcutData, error: ekoOkuma } = await supabase
      .from("ekonomik_takvim").select("id, ulke_kod, olay, tarih, gerceklesen, beklenti");
    if (ekoOkuma) { hata = 1; hataYakala("takvim-cron:eko-okuma", ekoOkuma); }
    const ekoMevcut = new Map((ekoMevcutData ?? []).map((r) => [`${r.ulke_kod}|${r.olay}|${r.tarih}`, r]));
    for (const o of olaylar) {
      const anahtar = `${o.ulke_kod}|${o.olay}|${o.tarih}`;
      const mevcut = ekoMevcut.get(anahtar);
      if (!mevcut) {
        const { error } = await supabase.from("ekonomik_takvim").insert(o);
        if (error) { hata = 1; hataYakala("takvim-cron:eko-insert", error, { anahtar }); }
        else ekoSayac.yeni++;
      } else if ((o.gerceklesen ?? null) !== (mevcut.gerceklesen ?? null) || (o.beklenti ?? null) !== (mevcut.beklenti ?? null)) {
        // Yalniz gerceklesen/beklenti degistiyse guncelle (olay saatinden sonra dolar)
        const { error } = await supabase.from("ekonomik_takvim")
          .update({ gerceklesen: o.gerceklesen, beklenti: o.beklenti, onceki: o.onceki, updated_at: new Date().toISOString() })
          .eq("id", mevcut.id);
        if (error) { hata = 1; hataYakala("takvim-cron:eko-update", error, { anahtar }); }
        else ekoSayac.guncellenen++;
      }
    }
  }

  return NextResponse.json({
    bilanco: { aciklandiIsaretlenen, snapshotYazilan: bilancoSnapshotYazilan, tetikAtlanan, evrenDisi, ...frTeshis },
    temettu: { ...temettuSayac, onarilan: temettuOnarilan },
    ekonomik: ekoSayac,
    hata,
    kaynakUyari,
    sure_ms: Date.now() - baslangic,
  });
}
