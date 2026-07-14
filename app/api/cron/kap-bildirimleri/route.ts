import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import { siniflandir, ozetUret, baglamMetni, type KapDetay } from "@/lib/kap-ozet";

export const maxDuration = 60;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const getResend = () => new Resend(process.env.RESEND_API_KEY);

const KAP_API_URL = process.env.KAP_API_URL || "https://apigwdev.mkk.com.tr/api/vyk";
const KAP_AUTH = Buffer.from(`${process.env.KAP_API_KEY}:${process.env.KAP_API_SECRET}`).toString("base64");
const HEADERS = { Authorization: `Basic ${KAP_AUTH}` };

const OZET_BATCH_LIMIT = 5;

type DisclosureListItem = {
  disclosureIndex: string;
  disclosureType: string;
};

function parseKapTarihi(timeStr?: string): string | null {
  if (!timeStr) return null;
  const [datePart, timePart] = timeStr.split(" ");
  if (!datePart || !timePart) return null;
  const [day, month, year] = datePart.split(".");
  const iso = new Date(`${year}-${month}-${day}T${timePart}`);
  if (Number.isNaN(iso.getTime())) return null;
  return iso.toISOString();
}

async function fetchGuncelIndex(): Promise<number> {
  const lastRes = await fetch(`${KAP_API_URL}/lastDisclosureIndex`, { headers: HEADERS, cache: "no-store" });
  if (!lastRes.ok) return 0;
  const { lastDisclosureIndex } = await lastRes.json();
  return parseInt(lastDisclosureIndex, 10) || 0;
}

async function fetchSonIndex(guncelIndex: number): Promise<number> {
  const { data } = await supabase.from("kap_cursor").select("son_index").eq("id", 1).maybeSingle();
  if (data?.son_index !== undefined && data.son_index !== null) return Number(data.son_index);
  return Math.max(guncelIndex - 30, 0);
}

async function fetchYeniBildirimler(sonIndex: number, guncelIndex: number): Promise<{ liste: DisclosureListItem[]; hata: boolean }> {
  if (!guncelIndex || guncelIndex <= sonIndex) return { liste: [], hata: false };

  const listRes = await fetch(`${KAP_API_URL}/disclosures?disclosureIndex=${sonIndex}`, { headers: HEADERS, cache: "no-store" });
  if (!listRes.ok) {
    hataYakala("kap-cron:disclosures", new Error(`KAP liste yaniti ${listRes.status}`), { sonIndex, guncelIndex });
    return { liste: [], hata: true };
  }
  const list = await listRes.json();
  if (!Array.isArray(list)) {
    hataYakala("kap-cron:disclosures", new Error("KAP liste yaniti dizi degil"), { sonIndex });
    return { liste: [], hata: true };
  }
  return { liste: list, hata: false };
}

async function fetchDetay(disclosureIndex: string): Promise<KapDetay | null> {
  try {
    const res = await fetch(`${KAP_API_URL}/disclosureDetail/${disclosureIndex}?fileType=data`, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(`KAP detay hatasi (${disclosureIndex}):`, e);
    return null;
  }
}

type KaydetSonucu = { enYuksekIndex: number; kaydedilen: number };

async function bildirimleriKaydet(items: DisclosureListItem[]): Promise<KaydetSonucu> {
  let enYuksekIndex = 0;
  let kaydedilen = 0;

  for (const item of items) {
    const index = parseInt(item.disclosureIndex, 10);
    if (!Number.isNaN(index) && index > enYuksekIndex) enYuksekIndex = index;
    if (item.disclosureType === "FON") continue;

    const detay = await fetchDetay(item.disclosureIndex);
    if (!detay) continue;
    if (!detay.senderExchCodes?.length) continue;

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

  let ozetlenen = 0;

  for (const bildirim of bekleyenler as BekleyenOzet[]) {
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
      ozetlenen++;
    } catch (e) {
      console.error(`KAP ozet hatasi (${bildirim.disclosure_index}):`, e);
      await supabase.from("kap_bildirimleri").update({ durum: "hata" }).eq("id", bildirim.id);
    }
  }

  return ozetlenen;
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
    const { data: izleyenler } = bildirim.tickerlar?.length
      ? await supabase
          .from("watchlist")
          .select("user_id, profiles(email)")
          .in("ticker", bildirim.tickerlar)
      : { data: [] };

    if (!izleyenler?.length) {
      await supabase.from("kap_bildirimleri").update({ durum: "bildirildi" }).eq("id", bildirim.id);
      continue;
    }

    const gorulenKullanicilar = new Set<string>();

    for (const izleyen of izleyenler as { user_id: string; profiles: { email?: string } | null }[]) {
      if (gorulenKullanicilar.has(izleyen.user_id)) continue;
      gorulenKullanicilar.add(izleyen.user_id);

      const { data: claimed } = await supabase
        .from("kap_bildirim_gonderim")
        .insert({ bildirim_id: bildirim.id, user_id: izleyen.user_id })
        .select("id");
      if (!claimed?.length) continue;

      const ticker = bildirim.ticker || bildirim.tickerlar[0];

      await supabase.from("bildirimler").insert({
        user_id: izleyen.user_id,
        baslik: `📰 ${ticker} KAP bildirimi`,
        aciklama: bildirim.ozet_tek_cumle || bildirim.konu || "",
        detay: bildirim.ozet_ne_demek || "",
        tip: "kap",
        ikon: "📰",
        okundu: false,
      });

      const email = izleyen.profiles?.email;
      if (email && process.env.RESEND_API_KEY) {
        try {
          await getResend().emails.send({
            from: "ParaKonuşur <hello@parakonusur.com>",
            to: email,
            subject: `📰 ${ticker} KAP bildirimi`,
            html: bildirimEpostaHtml(bildirim, ticker),
          });
        } catch (e) {
          console.error(`KAP eposta hatasi (${izleyen.user_id}):`, e);
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
  const guncelIndex = await fetchGuncelIndex();
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
