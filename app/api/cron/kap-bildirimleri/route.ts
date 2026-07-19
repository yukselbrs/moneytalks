import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import { siniflandir, ozetUret, baglamMetni, type KapDetay } from "@/lib/kap-ozet";
import { kapSonIndex, kapListe, kapDetay, type KapListeOgesi } from "@/lib/kap-kaynak";

export const maxDuration = 60;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const getResend = () => new Resend(process.env.RESEND_API_KEY);

// Timeout korumasi (onceki FUNCTION_INVOCATION_TIMEOUT/504 kok nedeni: seri detay cekimi).
const KAYIT_BATCH = 24;      // her kosuda en fazla bu kadar bildirim islenir; kalan sonraki kosuya
const DETAY_ESZAMAN = 8;     // ayni anda en fazla bu kadar detay cagrisi (WAF nezaketi)
const OZET_BATCH_LIMIT = 5;
const OZET_ESZAMAN = 2;      // ayni anda en fazla bu kadar AI ozet cagrisi

// Sinirli-eszamanli map: items'i eszaman'lik gruplar halinde paralel isler.
async function esZamanliIsle<T, R>(items: T[], eszaman: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const sonuclar: R[] = [];
  for (let i = 0; i < items.length; i += eszaman) {
    const grup = await Promise.all(items.slice(i, i + eszaman).map(fn));
    sonuclar.push(...grup);
  }
  return sonuclar;
}

function parseKapTarihi(timeStr?: string): string | null {
  if (!timeStr) return null;
  const [datePart, timePart] = timeStr.split(" ");
  if (!datePart || !timePart) return null;
  const [day, month, year] = datePart.split(".");
  const iso = new Date(`${year}-${month}-${day}T${timePart}`);
  if (Number.isNaN(iso.getTime())) return null;
  return iso.toISOString();
}

async function fetchSonIndex(guncelIndex: number): Promise<number> {
  const { data } = await supabase.from("kap_cursor").select("son_index").eq("id", 1).maybeSingle();
  const kayitli = data?.son_index;
  // son_index=0 = baslatilmamis (seed) kabul edilir: gercek index'ler ~1.6M, asla 0 olmaz.
  // Bu durumda guncele yakin baslat — yoksa 4 gunluk (~500) yigin backfill + eski mail spam'i olur.
  if (kayitli !== undefined && kayitli !== null && Number(kayitli) > 0) return Number(kayitli);
  return Math.max(guncelIndex - 30, 0);
}

async function fetchYeniBildirimler(sonIndex: number, guncelIndex: number): Promise<{ liste: KapListeOgesi[]; hata: boolean }> {
  if (!guncelIndex || guncelIndex <= sonIndex) return { liste: [], hata: false };
  return kapListe({ sonIndex });
}

type KaydetSonucu = { enYuksekIndex: number; kaydedilen: number };

async function bildirimleriKaydet(items: KapListeOgesi[]): Promise<KaydetSonucu> {
  // items artan index sirali. Timeout'a karsi yalniz ilk KAYIT_BATCH islenir; cursor bu dilimin
  // sonuna ilerler, kalan (daha yuksek index) sonraki kosuda cekilir — atlama olmaz.
  const dilim = items.slice(0, KAYIT_BATCH);
  let enYuksekIndex = 0;
  let kaydedilen = 0;

  // Detaylari sinirli-eszamanli cek (seri cekim 504'e sebep oluyordu).
  const detaylar = await esZamanliIsle(dilim, DETAY_ESZAMAN, async (item) => {
    const index = parseInt(item.disclosureIndex, 10);
    if (item.disclosureType === "FON") return { item, index, detay: null as KapDetay | null };
    return { item, index, detay: await kapDetay(item.disclosureIndex) };
  });

  for (const { item, index, detay } of detaylar) {
    // Cursor dilimdeki HER ogeyi gecer (FON/detay-yok dahil) — yoksa kalici takilma olur.
    if (!Number.isNaN(index) && index > enYuksekIndex) enYuksekIndex = index;
    if (!detay || !detay.senderExchCodes?.length) continue;

    const tip = siniflandir(detay);
    const kapZamani = parseKapTarihi(detay.time);

    const { error } = await supabase
      .from("kap_bildirimleri")
      .upsert(
        {
          disclosure_index: index,
          ticker: detay.senderExchCodes[0],
          tickerlar: detay.senderExchCodes,
          bildirim_tipi: tip,
          kap_tipi: detay.disclosureType || item.disclosureType,
          baslik: detay.subject?.tr || null,
          konu: detay.summary?.tr || null,
          kap_zamani: kapZamani,
          kap_link: detay.link || `https://www.kap.org.tr/tr/Bildirim/${item.disclosureIndex}`,
          ham_detay: detay,
          durum: "yeni",
        },
        { onConflict: "disclosure_index", ignoreDuplicates: true }
      );

    if (error) {
      console.error(`KAP kayit hatasi (${item.disclosureIndex}):`, error);
      continue;
    }
    kaydedilen++;
  }

  return { enYuksekIndex, kaydedilen };
}

async function cursorGuncelle(sonIndex: number, enYuksekGorulen: number) {
  if (enYuksekGorulen <= sonIndex) return;
  await supabase.from("kap_cursor").update({ son_index: enYuksekGorulen }).eq("id", 1);
}

type BekleyenOzet = {
  id: string;
  disclosure_index: number;
  ticker: string | null;
  bildirim_tipi: string;
  ham_detay: KapDetay;
};

async function ozetleriUret(): Promise<number> {
  const { data: bekleyenler } = await supabase
    .from("kap_bildirimleri")
    .select("id, disclosure_index, ticker, bildirim_tipi, ham_detay")
    .eq("durum", "yeni")
    .order("kap_zamani", { ascending: true })
    .limit(OZET_BATCH_LIMIT);

  if (!bekleyenler?.length) return 0;

  // Ozetleme sinirli-eszamanli (seri 5 AI cagrisi timeout'a yaklasiyordu).
  const sonuclar = await esZamanliIsle(bekleyenler as BekleyenOzet[], OZET_ESZAMAN, async (bildirim) => {
    try {
      const { ozetTekCumle, ozetNeDemek } = await ozetUret(bildirim.ham_detay, bildirim.bildirim_tipi as Parameters<typeof ozetUret>[1]);
      await supabase
        .from("kap_bildirimleri")
        .update({
          ozet_tek_cumle: ozetTekCumle,
          ozet_ne_demek: ozetNeDemek,
          ozet_uretim_zamani: new Date().toISOString(),
          durum: "ozetlendi",
        })
        .eq("id", bildirim.id);
      return true;
    } catch (e) {
      console.error(`KAP ozet hatasi (${bildirim.disclosure_index}):`, e);
      await supabase.from("kap_bildirimleri").update({ durum: "hata" }).eq("id", bildirim.id);
      return false;
    }
  });

  return sonuclar.filter(Boolean).length;
}

type OzetlenmisBildirim = {
  id: string;
  ticker: string | null;
  tickerlar: string[];
  konu: string | null;
  kap_link: string | null;
  ozet_tek_cumle: string | null;
  ozet_ne_demek: string | null;
};

function kacisHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function bildirimEpostaHtml(bildirim: OzetlenmisBildirim, ticker: string): string {
  const baslik = kacisHtml(bildirim.konu || `${ticker} KAP Bildirimi`);
  return `<div style="font-family:sans-serif;background:#0B1220;color:#F1F5F9;padding:32px;border-radius:12px;max-width:520px;margin:0 auto;">
    <h2 style="color:#3B82F6;margin-bottom:4px;">${kacisHtml(ticker)}</h2>
    <p style="color:#94A3B8;margin-top:0;">${baslik}</p>
    <p style="font-size:16px;font-weight:600;background:#111827;padding:12px 16px;border-radius:8px;border-left:3px solid #3B82F6;">${kacisHtml(bildirim.ozet_tek_cumle || "")}</p>
    <p style="line-height:1.6;">${kacisHtml(bildirim.ozet_ne_demek || "")}</p>
    <p style="color:#94A3B8;font-size:14px;">${baglamMetni(ticker)}</p>
    <a href="${bildirim.kap_link}" style="color:#3B82F6;">KAP bildiriminin aslı →</a>
    <div style="margin-top:20px;">
      <a href="https://parakonusur.com/hisse/${ticker}" style="background:#3B82F6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Hisseyi İncele →</a>
    </div>
    <p style="color:#64748B;font-size:12px;margin-top:24px;">Bu içerik yatırım tavsiyesi değildir; bilgilendirme amaçlıdır.</p>
  </div>`;
}

async function bildirimGonder(): Promise<number> {
  const { data: ozetlenmisler } = await supabase
    .from("kap_bildirimleri")
    .select("id, ticker, tickerlar, konu, kap_link, ozet_tek_cumle, ozet_ne_demek")
    .eq("durum", "ozetlendi")
    .order("kap_zamani", { ascending: true })
    .limit(OZET_BATCH_LIMIT);

  if (!ozetlenmisler?.length) return 0;

  let gonderilen = 0;

  for (const bildirim of ozetlenmisler as OzetlenmisBildirim[]) {
    const tickerlar = bildirim.tickerlar ?? [];
    // Ilgili kullanicilar = hisseyi IZLEYENLER ∪ PORTFOYUNDE TUTANLAR (yalniz hisse pozisyonu).
    const [izlemeRes, portfoyRes] = tickerlar.length
      ? await Promise.all([
          supabase.from("watchlist").select("user_id").in("ticker", tickerlar),
          supabase.from("portfoy").select("user_id").in("ticker", tickerlar).eq("tur", "hisse"),
        ])
      : [{ data: [] as { user_id: string }[] }, { data: [] as { user_id: string }[] }];

    const kullaniciIdleri = [...new Set([
      ...((izlemeRes.data as { user_id: string }[] | null) || []).map((r) => r.user_id),
      ...((portfoyRes.data as { user_id: string }[] | null) || []).map((r) => r.user_id),
    ])];

    if (!kullaniciIdleri.length) {
      await supabase.from("kap_bildirimleri").update({ durum: "bildirildi" }).eq("id", bildirim.id);
      continue;
    }

    const { data: profiller } = await supabase.from("profiles").select("id, email").in("id", kullaniciIdleri);
    const emailMap = new Map(((profiller as { id: string; email: string | null }[] | null) || []).map((p) => [p.id, p.email]));
    const ticker = bildirim.ticker || tickerlar[0];

    for (const userId of kullaniciIdleri) {
      // Idempotency: (bildirim_id, user_id) essiz — es zamanli kosum ayni kullaniciya tekrar gonderemez.
      const { data: claimed } = await supabase
        .from("kap_bildirim_gonderim")
        .insert({ bildirim_id: bildirim.id, user_id: userId })
        .select("id");
      if (!claimed?.length) continue;

      await supabase.from("bildirimler").insert({
        user_id: userId,
        baslik: `📰 ${ticker} KAP bildirimi`,
        aciklama: bildirim.ozet_tek_cumle || bildirim.konu || "",
        detay: bildirim.ozet_ne_demek || "",
        tip: "kap",
        ikon: "📰",
        okundu: false,
      });

      const email = emailMap.get(userId);
      if (email && process.env.RESEND_API_KEY) {
        try {
          await getResend().emails.send({
            from: "ParaKonuşur <hello@parakonusur.com>",
            to: email,
            subject: `📰 ${ticker} KAP bildirimi`,
            html: bildirimEpostaHtml(bildirim, ticker),
          });
        } catch (e) {
          console.error(`KAP eposta hatasi (${userId}):`, e);
        }
      }

      gonderilen++;
    }

    await supabase.from("kap_bildirimleri").update({ durum: "bildirildi" }).eq("id", bildirim.id);
  }

  return gonderilen;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let hata = 0;
  const guncelIndex = await kapSonIndex();
  if (!guncelIndex) {
    hataYakala("kap-cron:lastIndex", new Error("lastDisclosureIndex alinamadi"));
    hata++;
  }
  const sonIndex = await fetchSonIndex(guncelIndex);
  const { liste: yeniListe, hata: listeHata } = await fetchYeniBildirimler(sonIndex, guncelIndex);
  if (listeHata) hata++;

  let yeniBildirim = 0;
  if (yeniListe.length) {
    const { enYuksekIndex, kaydedilen } = await bildirimleriKaydet(yeniListe);
    yeniBildirim = kaydedilen;
    await cursorGuncelle(sonIndex, enYuksekIndex);
  }

  const ozetlenen = await ozetleriUret();
  const { count: ozetHatasi } = await supabase
    .from("kap_bildirimleri")
    .select("id", { count: "exact", head: true })
    .eq("durum", "hata");
  const epostaGonderilen = await bildirimGonder();

  return NextResponse.json({ yeniBildirim, ozetlenen, epostaGonderilen, hata: hata + (ozetHatasi ?? 0) });
}
