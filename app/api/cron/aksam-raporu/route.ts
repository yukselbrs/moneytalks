import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import { SEKTOR_MAP } from "@/lib/karne";
import { ENSTRUMAN_KODLARI } from "@/lib/enstruman-pricing";

// AKSAM RAPORU (Faz 4 C.1, KAP'siz v1): her islem gunu kapanistan sonra portfoy/izleme
// sahibi kullaniciya kisisel gun sonu ozeti — in-app bildirim + e-posta.
// Dil TESHIS dilidir: hareketi tarif eder, "iyi/kotu haber" veya eylem onerisi icermez.
// KAP korelasyon cumlesi BILINCLI olarak yok (A.1 cozulunce ayri is).

export const maxDuration = 60;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const getResend = () => new Resend(process.env.RESEND_API_KEY);

const USER_BATCH = 15;

type PortfoyRow = { user_id: string; ticker: string; adet: number };
type WatchRow = { user_id: string; ticker: string };
type Snap = { ticker: string; fiyat: number | null; degisim_yuzde: number | null };

type Rapor = {
  portfoyDegisim: number | null;
  toplamDeger: number | null;
  enEtkili: { ticker: string; degisim: number; katkiYuzde: number } | null;
  sektorSatiri: string | null;
  izlemeHareketleri: { ticker: string; degisim: number }[];
  endeks: number | null;
};

function trBugun(): string {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function yuzdeMetin(v: number | null): string {
  if (v === null) return "—";
  const s = Math.abs(v).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `−%${s}` : `+%${s}`;
}

async function fetchEndeksGunluk(): Promise<number | null> {
  try {
    const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?interval=1d&range=1d", {
      cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const meta = (await res.json())?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const prev = meta?.chartPreviousClose || meta?.previousClose;
    if (!price || !prev) return null;
    return ((price - prev) / prev) * 100;
  } catch {
    return null;
  }
}

function raporHesapla(
  pozisyonlar: PortfoyRow[],
  izlemeler: string[],
  snaps: Record<string, Snap>,
  endeks: number | null
): Rapor | null {
  type Poz = { ticker: string; deger: number; degisim: number };
  const pozlar: Poz[] = [];
  for (const p of pozisyonlar) {
    const s = snaps[p.ticker];
    if (!s?.fiyat || s.fiyat <= 0 || s.degisim_yuzde === null || !p.adet) continue;
    pozlar.push({ ticker: p.ticker, deger: p.adet * s.fiyat, degisim: s.degisim_yuzde });
  }
  const toplam = pozlar.reduce((a, p) => a + p.deger, 0);

  let portfoyDegisim: number | null = null;
  let enEtkili: Rapor["enEtkili"] = null;
  let sektorSatiri: string | null = null;

  if (toplam > 0) {
    portfoyDegisim = pozlar.reduce((a, p) => a + p.degisim * p.deger, 0) / toplam;
    const etkiSirali = [...pozlar].sort((a, b) => Math.abs(b.degisim * b.deger) - Math.abs(a.degisim * a.deger));
    const e = etkiSirali[0];
    if (e) {
      enEtkili = { ticker: e.ticker, degisim: e.degisim, katkiYuzde: (e.deger / toplam) * 100 };
      const sektor = SEKTOR_MAP[e.ticker];
      if (sektor) sektorSatiri = `${e.ticker}, portföyünün %${((e.deger / toplam) * 100).toFixed(0)}'ini oluşturuyor (${sektor} sektörü).`;
    }
  }

  const izlemeHareketleri = izlemeler
    .map(t => ({ ticker: t, degisim: snaps[t]?.degisim_yuzde }))
    .filter((x): x is { ticker: string; degisim: number } => typeof x.degisim === "number")
    .sort((a, b) => Math.abs(b.degisim) - Math.abs(a.degisim))
    .slice(0, 2);

  if (portfoyDegisim === null && !izlemeHareketleri.length) return null;

  return { portfoyDegisim, toplamDeger: toplam > 0 ? toplam : null, enEtkili, sektorSatiri, izlemeHareketleri, endeks };
}

function kacis(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function raporMetni(r: Rapor): { ozet: string; detay: string } {
  const parcalar: string[] = [];
  if (r.portfoyDegisim !== null) {
    parcalar.push(`Portföyün bugün değer bazında ${yuzdeMetin(r.portfoyDegisim)} hareket etti${r.endeks !== null ? ` (XU100: ${yuzdeMetin(r.endeks)})` : ""}.`);
  } else if (r.endeks !== null) {
    parcalar.push(`XU100 bugün ${yuzdeMetin(r.endeks)} hareket etti.`);
  }
  if (r.enEtkili) {
    parcalar.push(`Portföyünü en çok etkileyen pozisyon ${r.enEtkili.ticker} oldu (${yuzdeMetin(r.enEtkili.degisim)}).`);
  }
  const ozet = parcalar.join(" ") || "Gün sonu özetin hazır.";

  const detayParcalar: string[] = [];
  if (r.sektorSatiri) detayParcalar.push(r.sektorSatiri);
  if (r.izlemeHareketleri.length) {
    detayParcalar.push(`İzleme listende öne çıkanlar: ${r.izlemeHareketleri.map(h => `${h.ticker} ${yuzdeMetin(h.degisim)}`).join(", ")}.`);
  }
  return { ozet, detay: detayParcalar.join(" ") };
}

function raporEpostaHtml(r: Rapor): string {
  const m = raporMetni(r);
  const izlemeSatirlari = r.izlemeHareketleri.map(h => `
    <div style="display:flex;justify-content:space-between;background:#111827;border-radius:8px;padding:9px 14px;margin-bottom:6px;">
      <span style="color:#F1F5F9;font-size:13px;font-weight:600;">${kacis(h.ticker)}</span>
      <span style="color:${h.degisim < 0 ? "#F87171" : "#34D399"};font-size:13px;font-weight:700;">${kacis(yuzdeMetin(h.degisim))}</span>
    </div>`).join("");

  return `<div style="font-family:sans-serif;background:#0B1220;color:#F1F5F9;padding:32px;border-radius:12px;max-width:520px;margin:0 auto;">
    <h2 style="color:#3B82F6;margin-bottom:4px;">Akşam Raporu</h2>
    <p style="color:#94A3B8;margin-top:0;font-size:12px;">Bu rapor günü tarif eder; ne yapman gerektiğini söylemez.</p>
    <p style="font-size:15px;line-height:1.6;background:#111827;padding:12px 16px;border-radius:8px;border-left:3px solid #3B82F6;">${kacis(m.ozet)}</p>
    ${m.detay ? `<p style="color:#CBD5E1;font-size:13px;line-height:1.6;">${kacis(m.detay)}</p>` : ""}
    ${izlemeSatirlari ? `<h3 style="color:#F1F5F9;font-size:14px;margin:18px 0 8px;">İzleme listen</h3>${izlemeSatirlari}` : ""}
    <a href="https://parakonusur.com/dashboard" style="display:inline-block;margin-top:14px;background:#3B82F6;color:#fff;padding:9px 18px;border-radius:8px;text-decoration:none;font-size:13px;">Dashboard'ı aç →</a>
    <p style="color:#64748B;font-size:11px;margin-top:20px;line-height:1.6;">Veriler ~15 dk gecikmelidir. Bu e-posta yatırım tavsiyesi değildir; al/sat yönlendirmesi içermez.</p>
  </div>`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const gun = trBugun();
  let hata = 0;

  const [portfoyRes, watchRes] = await Promise.all([
    supabase.from("portfoy").select("user_id, ticker, adet"),
    supabase.from("watchlist").select("user_id, ticker"),
  ]);
  const pozisyonMap = new Map<string, PortfoyRow[]>();
  // Rapor hisse verisiyle calisir; doviz/maden pozisyonlari kapsam disi (bos satir olmasin diye filtrelenir).
  for (const r of (portfoyRes.data || []) as PortfoyRow[]) {
    if (ENSTRUMAN_KODLARI.has(r.ticker)) continue;
    pozisyonMap.set(r.user_id, [...(pozisyonMap.get(r.user_id) || []), r]);
  }
  const izlemeMap = new Map<string, string[]>();
  for (const r of (watchRes.data || []) as WatchRow[]) {
    izlemeMap.set(r.user_id, [...(izlemeMap.get(r.user_id) || []), r.ticker]);
  }

  const tumKullanicilar = [...new Set([...pozisyonMap.keys(), ...izlemeMap.keys()])];
  if (!tumKullanicilar.length) return NextResponse.json({ kullanici: 0, gonderilen: 0, hata });

  const { data: gonderilmisler } = await supabase
    .from("aksam_raporu_gonderim")
    .select("user_id")
    .eq("gun", gun)
    .in("user_id", tumKullanicilar);
  const gonderilmisSet = new Set((gonderilmisler || []).map(g => g.user_id));
  const bekleyenler = tumKullanicilar.filter(u => !gonderilmisSet.has(u)).slice(0, USER_BATCH);
  if (!bekleyenler.length) return NextResponse.json({ kullanici: tumKullanicilar.length, gonderilen: 0, kalan: 0, hata });

  const tickers = [...new Set(bekleyenler.flatMap(u => [
    ...(pozisyonMap.get(u) || []).map(p => p.ticker),
    ...(izlemeMap.get(u) || []),
  ]))];

  const [snapRes, endeks] = await Promise.all([
    supabase.from("hisse_snapshots").select("ticker, fiyat, degisim_yuzde").in("ticker", tickers),
    fetchEndeksGunluk(),
  ]);
  const snaps: Record<string, Snap> = {};
  for (const s of (snapRes.data || []) as Snap[]) snaps[s.ticker] = s;

  const { data: profiller } = await supabase.from("profiles").select("id, email").in("id", bekleyenler);
  const emailMap = new Map((profiller || []).map((p: { id: string; email: string | null }) => [p.id, p.email]));

  let gonderilen = 0;
  const dryOrnekler: Record<string, Rapor | null> = {};

  for (const userId of bekleyenler) {
    const rapor = raporHesapla(pozisyonMap.get(userId) || [], izlemeMap.get(userId) || [], snaps, endeks);
    if (dryRun) { dryOrnekler[userId] = rapor; continue; }
    if (!rapor) continue;

    const { data: claimed } = await supabase
      .from("aksam_raporu_gonderim")
      .insert({ user_id: userId, gun })
      .select("id");
    if (!claimed?.length) continue;

    const m = raporMetni(rapor);
    await supabase.from("bildirimler").insert({
      user_id: userId,
      baslik: "🌙 Akşam raporun hazır",
      aciklama: m.ozet,
      detay: m.detay,
      tip: "aksam_raporu",
      ikon: "🌙",
      okundu: false,
    });

    const email = emailMap.get(userId);
    if (email && process.env.RESEND_API_KEY) {
      try {
        await getResend().emails.send({
          from: "ParaKonuşur <hello@parakonusur.com>",
          to: email,
          subject: "🌙 Akşam Raporun — bugün portföyünde ne oldu",
          html: raporEpostaHtml(rapor),
        });
      } catch (e) {
        hataYakala("aksam-cron:eposta", e, { userId });
        hata++;
      }
    }
    gonderilen++;
  }

  if (dryRun) return NextResponse.json({ dry: true, gun, kullanici: tumKullanicilar.length, batch: bekleyenler.length, ornekler: dryOrnekler, hata });
  return NextResponse.json({ kullanici: tumKullanicilar.length, gonderilen, kalan: tumKullanicilar.length - gonderilmisSet.size - bekleyenler.length, hata });
}
