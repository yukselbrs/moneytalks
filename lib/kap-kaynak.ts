import { hataYakala } from "@/lib/hata-yakala";
import type { KapDetay } from "@/lib/kap-ozet";

// KAP disclosure kaynak katmani: tek yerden 3 islem (son index, liste, detay).
// Birincil: MKK VYK (sozlesme/anahtarli). Fallback: kap.org.tr'nin kendi acik JSON API'si (anahtarsiz).
// KAP_KAYNAK: "vyk" (yalniz VYK) | "kap" (yalniz ucretsiz site) | "auto" (VYK once, hata olursa siteye dus — varsayilan).
// Site API'si sozlesmesiz oldugundan yalniz yedek: her hata GUVENLE bos/null doner, pipeline kirilmaz.

export type KapListeOgesi = {
  disclosureIndex: string;
  disclosureType: string;
  stockCodes?: string | null;
};

const KAP_KAYNAK = (process.env.KAP_KAYNAK || "auto").toLowerCase();
const VYK_URL = process.env.KAP_API_URL || "https://apigwdev.mkk.com.tr/api/vyk";
const VYK_KIMLIK = !!(process.env.KAP_API_KEY && process.env.KAP_API_SECRET);
const VYK_HEADERS = { Authorization: `Basic ${Buffer.from(`${process.env.KAP_API_KEY}:${process.env.KAP_API_SECRET}`).toString("base64")}` };

const SITE = "https://www.kap.org.tr";
const SITE_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const SITE_LISTE_HEADERS = { "User-Agent": SITE_UA, "Content-Type": "application/json", Referer: `${SITE}/tr/bildirim-sorgu` };
const SITE_LOOKBACK_GUN = 4; // Fallback tarih penceresi: cron 5 dk'da bir kostugundan fazlasiyla yeterli.

function vykBirincil(): boolean {
  return KAP_KAYNAK !== "kap" && VYK_KIMLIK;
}
function siteFallback(): boolean {
  return KAP_KAYNAK !== "vyk";
}

// ---- VYK (birincil) ----

async function vykSonIndex(): Promise<number | null> {
  try {
    const res = await fetch(`${VYK_URL}/lastDisclosureIndex`, { headers: VYK_HEADERS, cache: "no-store" });
    if (!res.ok) return null;
    const { lastDisclosureIndex } = await res.json();
    const n = parseInt(lastDisclosureIndex, 10);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

async function vykListe(sonIndex: number, ticker?: string): Promise<KapListeOgesi[] | null> {
  try {
    const params = new URLSearchParams({ disclosureIndex: String(sonIndex) });
    if (ticker) {
      const id = await vykCompanyId(ticker);
      if (id) params.set("companyId", id);
    }
    const res = await fetch(`${VYK_URL}/disclosures?${params}`, { headers: VYK_HEADERS, cache: "no-store" });
    if (!res.ok) return null;
    const list = await res.json();
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

const vykMemberCache: Record<string, string> = {};
async function vykCompanyId(ticker: string): Promise<string | null> {
  if (vykMemberCache[ticker]) return vykMemberCache[ticker];
  try {
    const res = await fetch(`${VYK_URL}/members`, { headers: VYK_HEADERS, next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    for (const m of Array.isArray(data) ? data : []) {
      if (m?.stockCode && m?.id) vykMemberCache[m.stockCode] = m.id;
    }
    return vykMemberCache[ticker] || null;
  } catch {
    return null;
  }
}

async function vykDetay(index: string): Promise<KapDetay | null> {
  try {
    const res = await fetch(`${VYK_URL}/disclosureDetail/${index}?fileType=data`, { headers: VYK_HEADERS, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as KapDetay;
  } catch {
    return null;
  }
}

// ---- kap.org.tr acik site API'si (fallback) ----

function siteTarih(offsetGun: number): string {
  const d = new Date(Date.now() + offsetGun * 86400_000);
  return d.toISOString().slice(0, 10);
}

// Site publishDate "YYYY.MM.DD HH:MM:SS" -> VYK "DD.MM.YYYY HH:MM:SS" (parseKapTarihi bunu bekler).
function siteZamaniVyk(pd?: string | null): string | undefined {
  if (!pd) return undefined;
  const [tarih, saat] = pd.split(" ");
  if (!tarih || !saat) return undefined;
  const p = tarih.split(".");
  if (p.length !== 3) return undefined;
  // Hem "YYYY.MM.DD" hem "DD.MM.YYYY" gelebilir; yil 4 haneli tarafi bul.
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
      hataYakala("kap-kaynak:site-liste", new Error(`Site byCriteria ${res.status}`));
      return null;
    }
    const list = await res.json();
    return Array.isArray(list) ? list : null;
  } catch (e) {
    hataYakala("kap-kaynak:site-liste", e);
    return null;
  }
}

async function siteSonIndex(): Promise<number | null> {
  const list = await siteByCriteria();
  if (!list?.length) return null;
  return list.reduce((max, x) => (x.disclosureIndex > max ? x.disclosureIndex : max), 0) || null;
}

async function siteListe(sonIndex: number, ticker?: string): Promise<KapListeOgesi[] | null> {
  const list = await siteByCriteria();
  if (!list) return null;
  const t = ticker?.toUpperCase();
  return list
    .filter((x) => x.disclosureIndex > sonIndex)
    .filter((x) => !t || (x.stockCodes || "").toUpperCase().split(/[,\s]+/).includes(t))
    .sort((a, b) => a.disclosureIndex - b.disclosureIndex)
    .map((x) => ({ disclosureIndex: String(x.disclosureIndex), disclosureType: x.disclosureType, stockCodes: x.stockCodes }));
}

type SiteDetayYanit = Array<{
  disclosure?: { disclosureBasic?: Record<string, unknown> };
  disclosureBody?: unknown[];
}>;

async function siteDetay(index: string): Promise<KapDetay | null> {
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
      time: siteZamaniVyk(b.publishDate),
      link: `${SITE}/tr/Bildirim/${index}`,
      flatData: kok?.disclosureBody ?? null,
    };
  } catch (e) {
    hataYakala("kap-kaynak:site-detay", e, { index });
    return null;
  }
}

// ---- Ortak API (birincil + fallback) ----

export async function kapSonIndex(): Promise<number> {
  if (vykBirincil()) {
    const n = await vykSonIndex();
    if (n !== null) return n;
  }
  if (siteFallback()) {
    const n = await siteSonIndex();
    if (n !== null) return n;
  }
  return 0;
}

export async function kapListe(opts: { sonIndex: number; ticker?: string }): Promise<{ liste: KapListeOgesi[]; hata: boolean }> {
  if (vykBirincil()) {
    const l = await vykListe(opts.sonIndex, opts.ticker);
    if (l !== null) return { liste: l, hata: false };
  }
  if (siteFallback()) {
    const l = await siteListe(opts.sonIndex, opts.ticker);
    if (l !== null) return { liste: l, hata: false };
  }
  return { liste: [], hata: true };
}

export async function kapDetay(index: string): Promise<KapDetay | null> {
  if (vykBirincil()) {
    const d = await vykDetay(index);
    if (d) return d;
  }
  if (siteFallback()) {
    const d = await siteDetay(index);
    if (d) return d;
  }
  return null;
}
