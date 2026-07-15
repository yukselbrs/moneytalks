import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import { karneHesapla, fetchEndeksHaftalik, fetchRiskOzetleri, haftaBaslangici, isoHaftaNo, EGITIM_ICERIKLERI, KAP_OLAY_LIMIT, type Karne, type KapOlay, type PortfoyRow, type SnapshotRow } from "@/lib/karne";

export const maxDuration = 60;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const getResend = () => new Resend(process.env.RESEND_API_KEY);

const USER_BATCH = 10;

function kacisHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function yuzdeFmt(deger: number): string {
  const isaret = deger >= 0 ? "+" : "";
  return `${isaret}%${deger.toFixed(2).replace(".", ",")}`;
}

type KarneOzet = { riskSkor: number | null; haftalikGetiri: number | null; toplamDeger: number };

function karneEpostaHtml(karne: Karne, onceki: KarneOzet | null = null): string {
  const riskDelta = onceki?.riskSkor != null && karne.riskSkor !== null && Math.round(karne.riskSkor) !== onceki.riskSkor
    ? `<p style="color:#94A3B8;font-size:13px;">Risk skorun gecen haftaya gore ${onceki.riskSkor} -> ${Math.round(karne.riskSkor)}. Bu bir risk olcusudur, getiri tahmini degildir.</p>`
    : "";
  const egitim = EGITIM_ICERIKLERI[isoHaftaNo() % EGITIM_ICERIKLERI.length];
  const enBuyukSektor = karne.sektorler[0];

  const performansSatiri = karne.haftalikGetiri !== null
    ? `Portföyün bu hafta değer bazında ${kacisHtml(yuzdeFmt(karne.haftalikGetiri))} hareket etti${karne.endeksHaftalik !== null ? ` (XU100: ${kacisHtml(yuzdeFmt(karne.endeksHaftalik))})` : ""}.`
    : "Bu hafta için getiri verisi hesaplanamadı.";

  const konsantrasyonSatiri = enBuyukSektor
    ? (enBuyukSektor.yuzde >= 60
      ? `Portföyünün %${enBuyukSektor.yuzde.toFixed(0)}'i ${kacisHtml(enBuyukSektor.sektor)} sektöründe. Tek sektör ağırlığı yüksek olduğunda o sektöre özgü dalgalanmalar portföyün geneline daha güçlü yansır.`
      : `En yüksek sektör ağırlığın: ${kacisHtml(enBuyukSektor.sektor)} (%${enBuyukSektor.yuzde.toFixed(0)}). Portföyün ${karne.sektorSayisi} farklı sektöre dağılmış durumda.`)
    : "";

  const riskSatiri = karne.riskSkor !== null && karne.riskKapsamYuzde >= 60
    ? `Değer-ağırlıklı risk skorun 100 üzerinden ${karne.riskSkor.toFixed(0)}${karne.beta !== null ? `; portföy betan ${karne.beta.toFixed(2)} — ${karne.beta > 1.15 ? "endeksten daha oynak" : karne.beta < 0.85 ? "endeksten daha yumuşak" : "endekse yakın"} bir profil` : ""}. Bu bir risk ölçüsüdür, getiri tahmini değildir.`
    : "Risk skoru bu hafta yeterli veriyle hesaplanamadı.";

  const sektorBarlari = karne.sektorler.map(s =>
    `<tr>
      <td style="padding:4px 8px 4px 0;color:#94A3B8;font-size:13px;white-space:nowrap;">${kacisHtml(s.sektor)}</td>
      <td style="width:100%;padding:4px 0;">
        <div style="background:#1E293B;border-radius:4px;height:8px;"><div style="background:#3B82F6;border-radius:4px;height:8px;width:${Math.min(s.yuzde, 100).toFixed(0)}%;"></div></div>
      </td>
      <td style="padding:4px 0 4px 8px;color:#F1F5F9;font-size:13px;font-weight:600;">%${s.yuzde.toFixed(0)}</td>
    </tr>`
  ).join("");

  const kapBolumu = karne.kapOlaylar.length
    ? `<h3 style="color:#F1F5F9;font-size:15px;margin:24px 0 8px;">Bu hafta portföyünü ilgilendiren KAP olayları</h3>
      ${karne.kapOlaylar.map(o => `
        <div style="background:#111827;border-radius:8px;padding:10px 14px;margin-bottom:8px;">
          <div style="color:#94A3B8;font-size:12px;">${kacisHtml(o.tickerlar[0] || "")}</div>
          <div style="color:#F1F5F9;font-size:13px;line-height:1.5;">${kacisHtml(o.ozet_tek_cumle || o.baslik || "KAP bildirimi")}</div>
          <a href="https://parakonusur.com/kap/${o.disclosure_index}" style="color:#3B82F6;font-size:12px;">Bildirimi incele →</a>
        </div>`).join("")}`
    : "";

  return `<div style="font-family:sans-serif;background:#0B1220;color:#F1F5F9;padding:32px;border-radius:12px;max-width:560px;margin:0 auto;">
    <h2 style="color:#3B82F6;margin-bottom:4px;">Haftalık Portföy Karnen</h2>
    <p style="color:#94A3B8;margin-top:0;font-size:13px;">Bu karne portföyünün mevcut durumunu tarif eder; ne yapman gerektiğini söylemez.</p>
    <p style="font-size:15px;line-height:1.6;background:#111827;padding:12px 16px;border-radius:8px;border-left:3px solid #3B82F6;">${performansSatiri}</p>
    <h3 style="color:#F1F5F9;font-size:15px;margin:24px 0 8px;">Sektör dağılımın</h3>
    <table style="width:100%;border-collapse:collapse;">${sektorBarlari}</table>
    <p style="color:#CBD5E1;font-size:13px;line-height:1.6;">${konsantrasyonSatiri}</p>
    <h3 style="color:#F1F5F9;font-size:15px;margin:24px 0 8px;">Risk profilin</h3>
    <p style="color:#CBD5E1;font-size:13px;line-height:1.6;">${riskSatiri}</p>
    ${riskDelta}
    ${kapBolumu}
    <h3 style="color:#F1F5F9;font-size:15px;margin:24px 0 8px;">Haftanın kavramı: ${kacisHtml(egitim.baslik)}</h3>
    <p style="color:#CBD5E1;font-size:13px;line-height:1.6;">${kacisHtml(egitim.metin)}</p>
    <div style="margin-top:20px;">
      <a href="https://parakonusur.com/portfoy" style="background:#3B82F6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Portföyünü İncele →</a>
    </div>
    <p style="color:#64748B;font-size:12px;margin-top:24px;line-height:1.5;">Fiyat verileri ~15 dk gecikmelidir. Bu içerik yatırım tavsiyesi değildir; bilgilendirme amaçlıdır. Karne portföyünün yapısını tarif eder, al/sat yönlendirmesi içermez.</p>
  </div>`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const hafta = haftaBaslangici();

  const { data: portfoyRows } = await supabase
    .from("portfoy")
    .select("user_id, ticker, adet")
    .gt("adet", 0);

  let hata = 0;
  if (!portfoyRows?.length) return NextResponse.json({ kullanici: 0, gonderilen: 0, hata });

  const kullaniciPozisyonlari = new Map<string, PortfoyRow[]>();
  for (const row of portfoyRows as PortfoyRow[]) {
    const mevcut = kullaniciPozisyonlari.get(row.user_id) || [];
    mevcut.push(row);
    kullaniciPozisyonlari.set(row.user_id, mevcut);
  }

  const tumKullanicilar = [...kullaniciPozisyonlari.keys()];
  const { data: gonderilmisler } = await supabase
    .from("karne_gonderim")
    .select("user_id")
    .eq("hafta_baslangic", hafta)
    .in("user_id", tumKullanicilar);
  const gonderilmisSet = new Set((gonderilmisler || []).map(g => g.user_id));
  const bekleyenler = tumKullanicilar.filter(u => !gonderilmisSet.has(u)).slice(0, USER_BATCH);

  if (!bekleyenler.length) return NextResponse.json({ kullanici: tumKullanicilar.length, gonderilen: 0, kalan: 0 });

  const batchTickers = [...new Set(bekleyenler.flatMap(u => (kullaniciPozisyonlari.get(u) || []).map(p => p.ticker)))];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://parakonusur.com";
  const yediGunOnce = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [snapshotRes, kapRes, endeksHaftalik] = await Promise.all([
    supabase.from("hisse_snapshots").select("ticker, fiyat, getiri_1h").in("ticker", batchTickers),
    supabase.from("kap_bildirimleri")
      .select("disclosure_index, tickerlar, bildirim_tipi, ozet_tek_cumle, baslik")
      .overlaps("tickerlar", batchTickers)
      .gte("kap_zamani", yediGunOnce)
      .order("kap_zamani", { ascending: false })
      .limit(50),
    fetchEndeksHaftalik(),
  ]);

  const snapshots: Record<string, SnapshotRow> = {};
  for (const s of (snapshotRes.data || []) as SnapshotRow[]) snapshots[s.ticker] = s;
  const kapOlaylarTumu = (kapRes.data || []) as KapOlay[];

  const degerSiralamasi = new Map<string, number>();
  for (const u of bekleyenler) {
    for (const p of kullaniciPozisyonlari.get(u) || []) {
      const fiyat = snapshots[p.ticker]?.fiyat;
      if (fiyat) degerSiralamasi.set(p.ticker, (degerSiralamasi.get(p.ticker) || 0) + p.adet * fiyat);
    }
  }
  const riskHedefleri = [...degerSiralamasi.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const riskler = await fetchRiskOzetleri(appUrl, riskHedefleri);

  const { data: profiller } = await supabase.from("profiles").select("id, email").in("id", bekleyenler);
  const emailMap = new Map((profiller || []).map((p: { id: string; email: string | null }) => [p.id, p.email]));

  const { data: oncekiler } = await supabase
    .from("karne_gonderim")
    .select("user_id, hafta_baslangic, ozet")
    .in("user_id", bekleyenler)
    .lt("hafta_baslangic", hafta)
    .order("hafta_baslangic", { ascending: false });
  const oncekiOzetMap = new Map<string, KarneOzet | null>();
  for (const o of (oncekiler || []) as { user_id: string; ozet: KarneOzet | null }[]) {
    if (!oncekiOzetMap.has(o.user_id)) oncekiOzetMap.set(o.user_id, o.ozet);
  }

  let gonderilen = 0;
  const dryOrnekler: Record<string, Karne | null> = {};

  for (const userId of bekleyenler) {
    const karne = karneHesapla(kullaniciPozisyonlari.get(userId) || [], snapshots, riskler, endeksHaftalik, kapOlaylarTumu);

    if (dryRun) {
      dryOrnekler[userId] = karne;
      continue;
    }

    if (!karne) continue;

    const yeniOzet: KarneOzet = {
      riskSkor: karne.riskSkor === null ? null : Math.round(karne.riskSkor),
      haftalikGetiri: karne.haftalikGetiri,
      toplamDeger: karne.toplamDeger,
    };
    const { data: claimed } = await supabase
      .from("karne_gonderim")
      .insert({ user_id: userId, hafta_baslangic: hafta, ozet: yeniOzet })
      .select("id");
    if (!claimed?.length) continue;

    await supabase.from("bildirimler").insert({
      user_id: userId,
      baslik: "📊 Haftalık portföy karnen hazır",
      aciklama: karne.haftalikGetiri !== null ? `Bu hafta portföyün ${yuzdeFmt(karne.haftalikGetiri)} hareket etti.` : "Haftalık portföy özetin hazır.",
      detay: karne.sektorler[0] ? `En yüksek sektör ağırlığı: ${karne.sektorler[0].sektor} (%${karne.sektorler[0].yuzde.toFixed(0)})` : "",
      tip: "karne",
      ikon: "📊",
      okundu: false,
    });

    const email = emailMap.get(userId);
    if (email && process.env.RESEND_API_KEY) {
      try {
        await getResend().emails.send({
          from: "ParaKonuşur <hello@parakonusur.com>",
          to: email,
          subject: "📊 Haftalık Portföy Karnen",
          html: karneEpostaHtml(karne, oncekiOzetMap.get(userId) ?? null),
        });
      } catch (e) {
        hataYakala("karne-cron:eposta", e, { userId });
        hata++;
      }
    }

    gonderilen++;
  }

  if (dryRun) return NextResponse.json({ dry: true, hafta, kullanici: tumKullanicilar.length, batch: bekleyenler.length, ornekler: dryOrnekler });

  return NextResponse.json({ kullanici: tumKullanicilar.length, gonderilen, kalan: tumKullanicilar.length - gonderilmisSet.size - bekleyenler.length, hata });
}
