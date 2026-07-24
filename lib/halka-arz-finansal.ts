import type { SupabaseClient } from "@supabase/supabase-js";

// Halka arz finansal katmani: izahname bilanco ozeti (halkaarz.info yapisal tablosu) +
// TradingView piyasa degeri ile F/K & PD/DD hesabi. Yeni kotasyonlar TradingView'de
// temel veri (F/K, PD/DD, bilanco) TASIMAZ — haftalar/aylar sonra dolar; bu katman
// izahname verisiyle o boslugu doldurur. Her hata GUVENLE null doner; cron kirilmaz.

const HAI = "https://www.halkaarz.info";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export type IzahnameFinansal = {
  donem: string | null;              // en guncel yil (ornek "2025")
  donen_varlik: number | null;
  duran_varlik: number | null;
  kv_yukumluluk: number | null;
  uv_yukumluluk: number | null;
  ozkaynak: number | null;
  net_kar: number | null;
  odenmis_sermaye: number | null;
  nakit: number | null;
  stoklar: number | null;
  ticari_borclar: number | null;
  cari_oran: number | null;
};

export type HalkaArzFinansal = {
  finansal: IzahnameFinansal | null;
  piyasa_degeri: number | null;      // TradingView market_cap_basic (yalniz islem gorenler)
  fk: number | null;                 // hesaplanan: piyasa degeri / net kar (yillik)
  pddd: number | null;               // hesaplanan: piyasa degeri / ozkaynak
};

function htmlTemizle(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// "8,86 Mr TL" -> 8_860_000_000 | "175,82 Mn TL" -> 175_820_000 | "0,87" -> 0.87 | "" -> null
export function trFinansSayi(ham: string | null | undefined): number | null {
  if (!ham) return null;
  const s = ham.trim();
  if (!s) return null;
  const m = s.match(/(-?[\d.]+(?:,\d+)?)/);
  if (!m) return null;
  const taban = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(taban)) return null;
  if (/\bMr\b|milyar/i.test(s)) return taban * 1e9;
  if (/\bMn\b|milyon/i.test(s)) return taban * 1e6;
  if (/\bBn\b|\bB\b/i.test(s) && /TL/i.test(s)) return taban * 1e9; // guvenlik: bazi kaynaklar "Bn"
  return taban;
}

async function getir(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, accept: "text/html" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// halkaarz.info takvim JSON-LD ItemList -> kod->slug haritasi (5 dk cache).
let slugCache: { ts: number; harita: Map<string, string> } | null = null;
export async function kodSlugHaritasi(): Promise<Map<string, string>> {
  if (slugCache && Date.now() - slugCache.ts < 5 * 60_000) return slugCache.harita;
  const harita = new Map<string, string>();
  const html = await getir(`${HAI}/halka-arz-takvimi/2026`);
  if (html) {
    for (const blok of html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? []) {
      const icerik = blok.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
      try {
        const d = JSON.parse(icerik);
        const me = d.mainEntity ?? d;
        if (me?.["@type"] === "ItemList" && Array.isArray(me.itemListElement)) {
          for (const it of me.itemListElement) {
            const ad: string = it?.name ?? "";
            const kod = ad.split(" - ")[0].trim().toUpperCase();
            const slug = String(it?.url ?? "").replace(/\/$/, "").split("/").pop() ?? "";
            if (/^[A-Z0-9]{2,10}$/.test(kod) && slug) harita.set(kod, slug);
          }
        }
      } catch {
        /* siradaki blok */
      }
    }
  }
  if (harita.size) slugCache = { ts: Date.now(), harita };
  return harita;
}

// halkaarz.info IPO detay -> bilanco ozeti. Tablo: Kalem | <yil1> | <yil2> | <yil3>;
// EN GUNCEL (ilk) veri sutunu alinir. Kalem etiketleri TR; deger hucreleri "X,YZ Mr/Mn TL".
function bilancoParse(html: string): IzahnameFinansal | null {
  const tbl = html.match(/<table[\s\S]*?<\/table>/)?.[0];
  if (!tbl) return null;
  const satirlar = tbl.match(/<tr[\s\S]*?<\/tr>/g) ?? [];
  let donem: string | null = null;
  const oku: Record<string, number | null> = {};
  for (const satir of satirlar) {
    const hucreler = [...satir.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((m) => htmlTemizle(m[1]));
    if (hucreler.length < 2) continue;
    const etiket = hucreler[0].toLocaleLowerCase("tr");
    const ilkDeger = hucreler[1]; // en guncel yil sutunu
    if (etiket === "kalem") {
      const y = ilkDeger.match(/(20\d{2})/);
      donem = y ? y[1] : null;
      continue;
    }
    const sayi = trFinansSayi(ilkDeger);
    const kaydet = (k: string) => { oku[k] = sayi; };
    if (etiket.includes("dönen varl")) kaydet("donen_varlik");
    else if (etiket.includes("duran varl")) kaydet("duran_varlik");
    else if (etiket.includes("kısa vadeli")) kaydet("kv_yukumluluk");
    else if (etiket.includes("uzun vadeli")) kaydet("uv_yukumluluk");
    else if (etiket.includes("özkaynak")) kaydet("ozkaynak");
    else if (etiket.includes("net kar") || etiket.includes("net kâr") || etiket.includes("dönem kar")) kaydet("net_kar");
    else if (etiket.includes("ödenmiş sermaye")) kaydet("odenmis_sermaye");
    else if (etiket === "nakit") kaydet("nakit");
    else if (etiket.includes("stok")) kaydet("stoklar");
    else if (etiket.includes("ticari borç")) kaydet("ticari_borclar");
    else if (etiket.includes("cari oran")) kaydet("cari_oran");
  }
  const doluAlan = Object.values(oku).some((v) => v !== null);
  if (!doluAlan && !donem) return null;
  return {
    donem,
    donen_varlik: oku.donen_varlik ?? null,
    duran_varlik: oku.duran_varlik ?? null,
    kv_yukumluluk: oku.kv_yukumluluk ?? null,
    uv_yukumluluk: oku.uv_yukumluluk ?? null,
    ozkaynak: oku.ozkaynak ?? null,
    net_kar: oku.net_kar ?? null,
    odenmis_sermaye: oku.odenmis_sermaye ?? null,
    nakit: oku.nakit ?? null,
    stoklar: oku.stoklar ?? null,
    ticari_borclar: oku.ticari_borclar ?? null,
    cari_oran: oku.cari_oran ?? null,
  };
}

// TradingView market_cap_basic — yalniz islem goren hisselerde dolu; F/K & PD/DD hesabinin taban carpani.
export async function tvPiyasaDegeri(kod: string): Promise<number | null> {
  try {
    const res = await fetch("https://scanner.tradingview.com/turkey/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ symbols: { tickers: [`BIST:${kod}`] }, columns: ["market_cap_basic"] }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const v = j?.data?.[0]?.d?.[0];
    return typeof v === "number" && v > 0 ? v : null;
  } catch {
    return null;
  }
}

// Bir hissenin halka_arzlar'da kayitli finansali (yeni kotasyonlar TradingView'de temel veri
// tutmadigi icin hisse sayfasi + AI analizi bu kayda dusuyor). Kayit yoksa/hata olursa null.
export type KayitliFinansal = {
  fk: number | null;
  pddd: number | null;
  piyasa_degeri: number | null;
  finansal: IzahnameFinansal | null;
};

export async function halkaArzKayitliFinansal(
  ticker: string,
  supabase: SupabaseClient
): Promise<KayitliFinansal | null> {
  try {
    const { data, error } = await supabase
      .from("halka_arzlar")
      .select("fk, pddd, piyasa_degeri, finansal_ozet")
      .eq("kod", ticker.toUpperCase())
      .maybeSingle();
    if (error || !data) return null;
    const fin = (data.finansal_ozet as IzahnameFinansal | null) ?? null;
    const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : v != null && Number.isFinite(Number(v)) ? Number(v) : null);
    if (num(data.fk) === null && num(data.pddd) === null && !fin) return null;
    return { fk: num(data.fk), pddd: num(data.pddd), piyasa_degeri: num(data.piyasa_degeri), finansal: fin };
  } catch {
    return null;
  }
}

// Ana giris: bir kod icin izahname bilanco + (islem goruyorsa) F/K & PD/DD hesabi.
export async function halkaArzFinansalCek(kod: string, slug: string): Promise<HalkaArzFinansal> {
  const [html, piyasaDegeri] = await Promise.all([
    getir(`${HAI}/halka-arz-takvimi/${slug}`),
    tvPiyasaDegeri(kod),
  ]);
  const finansal = html ? bilancoParse(html) : null;
  // F/K = piyasa degeri / net kar (yillik); PD/DD = piyasa degeri / ozkaynak. Girdiler eksikse null.
  const fk = piyasaDegeri && finansal?.net_kar && finansal.net_kar > 0
    ? Math.round((piyasaDegeri / finansal.net_kar) * 100) / 100
    : null;
  const pddd = piyasaDegeri && finansal?.ozkaynak && finansal.ozkaynak > 0
    ? Math.round((piyasaDegeri / finansal.ozkaynak) * 100) / 100
    : null;
  return { finansal, piyasa_degeri: piyasaDegeri, fk, pddd };
}
