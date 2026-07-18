import { hataYakala } from "@/lib/hata-yakala";
import type { KapDetay } from "@/lib/kap-ozet";

// KAP disclosure kaynak katmani: tek yerden 3 islem (son index, liste, detay).
// Kaynak: kap.org.tr'nin kendi acik JSON API'si (anahtarsiz, ucretsiz).
// Eski MKK VYK (apigwdev.mkk.com.tr — demo/dev gateway) 18 Tem 2026'da tamamen kaldirildi.
// Her hata GUVENLE bos/null doner; pipeline kirilmaz (o tur "yeni bildirim yok" gibi davranir).

export type KapListeOgesi = {
  disclosureIndex: string;
  disclosureType: string;
  stockCodes?: string | null;
};

const SITE = "https://www.kap.org.tr";
const SITE_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const SITE_LISTE_HEADERS = { "User-Agent": SITE_UA, "Content-Type": "application/json", Referer: `${SITE}/tr/bildirim-sorgu` };
const SITE_LOOKBACK_GUN = 4; // Tarih penceresi: cron 5 dk'da bir kostugundan fazlasiyla yeterli.

function siteTarih(offsetGun: number): string {
  const d = new Date(Date.now() + offsetGun * 86400_000);
  return d.toISOString().slice(0, 10);
}

// Site publishDate "YYYY.MM.DD HH:MM:SS" -> VYK-uyumlu "DD.MM.YYYY HH:MM:SS" (tuketici parse'i bunu bekler).
function siteZamaniNormalize(pd?: string | null): string | undefined {
  if (!pd) return undefined;
  const [tarih, saat] = pd.split(" ");
  if (!tarih || !saat) return undefined;
  const p = tarih.split(".");
  if (p.length !== 3) return undefined;
  // Hem "YYYY.MM.DD" hem "DD.MM.YYYY" gelebilir; 4 haneli tarafi yil kabul et.
  const [a, b, c] = p;
  const [yil, ay, gun] = a.length === 4 ? [a, b, c] : [c, b, a];
  return `${gun}.${ay}.${yil} ${saat}`;
}

async function siteWarmup(): Promise<void> {
  // WAF ~6 sn'de baglantiyi dusurebiliyor; oturum isindirma en iyi cabayla.
  try {
    await fetch(`${SITE}/tr/bildirim-sorgu`, { headers: { "User-Agent": SITE_UA }, cache: "no-store", signal: AbortSignal.timeout(5000) });
  } catch {
    /* yok say */
  }
}

type SiteListeOgesi = {
  disclosureIndex: number;
  disclosureType: string;
  stockCodes: string | null;
  publishDate?: string;
};

async function siteByCriteria(): Promise<SiteListeOgesi[] | null> {
  await siteWarmup();
  try {
    const body = JSON.stringify({ fromDate: siteTarih(-SITE_LOOKBACK_GUN), toDate: siteTarih(1), mkkMemberOidList: [], subjectList: [] });
    const res = await fetch(`${SITE}/tr/api/disclosure/members/byCriteria`, {
      method: "POST",
      headers: SITE_LISTE_HEADERS,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      hataYakala("kap-kaynak:liste", new Error(`byCriteria ${res.status}`));
      return null;
    }
    const list = await res.json();
    return Array.isArray(list) ? list : null;
  } catch (e) {
    hataYakala("kap-kaynak:liste", e);
    return null;
  }
}

type SiteDetayYanit = Array<{
  disclosure?: { disclosureBasic?: Record<string, unknown> };
  disclosureBody?: unknown[];
}>;

// ---- Ortak API ----

export async function kapSonIndex(): Promise<number> {
  const list = await siteByCriteria();
  if (!list?.length) return 0;
  return list.reduce((max, x) => (x.disclosureIndex > max ? x.disclosureIndex : max), 0);
}

export async function kapListe(opts: { sonIndex: number; ticker?: string }): Promise<{ liste: KapListeOgesi[]; hata: boolean }> {
  const list = await siteByCriteria();
  if (!list) return { liste: [], hata: true };
  const t = opts.ticker?.toUpperCase();
  const liste = list
    .filter((x) => x.disclosureIndex > opts.sonIndex)
    .filter((x) => !t || (x.stockCodes || "").toUpperCase().split(/[,\s]+/).includes(t))
    .sort((a, b) => a.disclosureIndex - b.disclosureIndex)
    .map((x) => ({ disclosureIndex: String(x.disclosureIndex), disclosureType: x.disclosureType, stockCodes: x.stockCodes }));
  return { liste, hata: false };
}

export async function kapDetay(index: string): Promise<KapDetay | null> {
  try {
    const res = await fetch(`${SITE}/tr/api/notification/attachment-detail/${index}`, {
      headers: { "User-Agent": SITE_UA, Referer: `${SITE}/tr/Bildirim/${index}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as SiteDetayYanit;
    const kok = Array.isArray(json) ? json[0] : null;
    const b = kok?.disclosure?.disclosureBasic as Record<string, string | null> | undefined;
    if (!b) return null;

    const stockCode = (b.stockCode || "").trim();
    const senderExchCodes = stockCode ? stockCode.split(/[,\s]+/).filter(Boolean) : [];

    return {
      disclosureIndex: String(b.disclosureIndex ?? index),
      senderTitle: b.companyTitle || undefined,
      senderExchCodes,
      subject: { tr: b.title || undefined },
      summary: { tr: b.summary || undefined },
      disclosureType: b.disclosureType || undefined,
      disclosureClass: b.disclosureClass || undefined,
      time: siteZamaniNormalize(b.publishDate),
      link: `${SITE}/tr/Bildirim/${index}`,
      flatData: kok?.disclosureBody ?? null,
    };
  } catch (e) {
    hataYakala("kap-kaynak:detay", e, { index });
    return null;
  }
}
