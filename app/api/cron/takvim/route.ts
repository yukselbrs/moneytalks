import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import { bilancoTakvimiCek, temettuCek, aciklananBilancolar } from "@/lib/takvim-kaynak";
import { ekonomikTakvimTopla } from "@/lib/ekonomik-takvim-kaynak";
import { bilancoSnapshotlariUret } from "@/lib/bilanco";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Birlesik takvim cron'u — 4 bagimsiz adim. Bir adimin kaynagi duserse digerleri calisir.
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

  // ---- 1) BILANCO TAKVIMI (KAP "Finansal Takvim") ----
  const bilancoSayac: Sayac = { yeni: 0, guncellenen: 0 };
  const bilanco = await bilancoTakvimiCek();
  if (bilanco === null) kaynakUyari.push("kap-finansal-takvim");
  for (const b of bilanco ?? []) {
    hata += await ustuneYaz(bilancoMevcut, `${b.ticker}|${b.donem}`, `${b.tarih}|bekleniyor|false`, {
      event_type: "bilanco_aciklama",
      ticker: b.ticker,
      tarih: b.tarih,
      tarih_kesin: false,          // sirket beyani — degisebilir
      durum: "bekleniyor",
      donem: b.donem,
      donem_bitis: b.donem_bitis,
      kaynak: "kap",
      kap_disclosure_index: b.kap_disclosure_index,
      kap_link: `https://www.kap.org.tr/tr/Bildirim/${b.kap_disclosure_index}`,
    }, bilancoSayac);
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

  // ---- 3) ACIKLANAN BILANCOLAR -> durum guncelle + Bilanco modulunu tetikle ----
  // (ortak servis: bilancoSnapshotlariUret — kod tekrari yok)
  let aciklandiIsaretlenen = 0;
  let bilancoSnapshotYazilan = 0;
  const aciklanan = await aciklananBilancolar();
  if (aciklanan === null) kaynakUyari.push("kap-finansal-rapor");
  const tetiklenecek = new Set<string>();
  for (const a of aciklanan ?? []) {
    const { data, error } = await supabase.from("sirket_takvim_etkinlikleri")
      .update({ durum: "aciklandi", tarih_kesin: true, tarih: a.tarih, updated_at: new Date().toISOString() })
      .eq("ticker", a.ticker).eq("event_type", "bilanco_aciklama").eq("durum", "bekleniyor")
      .lte("donem_bitis", a.tarih)
      .select("id");
    if (error) { hata = 1; hataYakala("takvim-cron:aciklandi", error, { ticker: a.ticker }); continue; }
    if (data?.length) { aciklandiIsaretlenen += data.length; tetiklenecek.add(a.ticker); }
  }
  if (tetiklenecek.size) {
    try {
      const { satirlar } = await bilancoSnapshotlariUret([...tetiklenecek]);
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

  // ---- 4) EKONOMIK TAKVIM (ForexFactory + Fed + TR kural ureteci) ----
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
    bilanco: bilancoSayac,
    temettu: temettuSayac,
    ekonomik: ekoSayac,
    aciklandiIsaretlenen,
    bilancoSnapshotYazilan,
    hata,
    kaynakUyari,
    sure_ms: Date.now() - baslangic,
  });
}
