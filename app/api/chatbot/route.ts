import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { BIST_HISSELER } from "@/lib/bist-hisseler";
import { requireUser } from "@/lib/auth";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// In-memory rate limit: user başına son istek zamanları
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 20;       // max istek
const RATE_WINDOW = 60000;   // 1 dakika (ms)
const KAP_API_URL = process.env.KAP_API_URL || "https://apigwdev.mkk.com.tr/api/vyk";
const KAP_AUTH = Buffer.from(`${process.env.KAP_API_KEY}:${process.env.KAP_API_SECRET}`).toString("base64");
const KAP_HEADERS = { Authorization: `Basic ${KAP_AUTH}` };
const HISSE_AD_ESLESMELERI = BIST_HISSELER.map((h) => ({
  ticker: h.ticker,
  ad: hisseAdiNormalize(h.ad),
  fullName: hisseAdiNormalize(h.fullName ?? ""),
  kapTitle: hisseAdiNormalize(h.kapTitle ?? ""),
})).filter((h) => h.ad.length > 0);
const BIST_TICKER_SET = new Set(BIST_HISSELER.map((h) => h.ticker));

const YASAKLI_IFADELER = [
  /(hisseyi?|bu hisseyi?|şimdi|hemen)\s+(al|sat)\b/i,
  /\b(sat[ıi]n al|kesinlikle al|kesinlikle sat|mutlaka al|mutlaka sat)\b/i,
  /kesin(likle)?\s*(yüksel|düş)/i,
  /yatırım tavsiyesi (öner(irim|iyorum|ir)?|tavsiye eder(im)?)/i,
  /\bgaranti\s+(getiri|kazanç|kazan[ıi]r|k[aâ]r|yükseliş|düşmez|verir)\b/i,
  /\bhedef\s+fiyat\s*[:=]?\s*\d+/i,
  /\b\d+\s*(gün|hafta|ay)\s+içinde\s+%?\d+\s*(getiri|kazanç|yükselecek|düşecek)\b/i,
];

function yasakliMiKontrol(text: string): boolean {
  return YASAKLI_IFADELER.some((re) => re.test(text));
}

const YATIRIM_TAVSIYESI_UYARISI = "Bu analiz yatırım tavsiyesi değildir.";
const RAKIP_KAYNAK_IFADELERI = [
  /borsa\s*istanbul/iu,
  /borsaistanbul\.com/iu,
  /mynet\s*finans/iu,
  /investing(?:\.com)?/iu,
  /tradingview/iu,
  /fintables/iu,
  /finnet/iu,
  /matriks/iu,
  /foreks/iu,
  /aracı kurum/iu,
  /araci kurum/iu,
];

function cevabiTemizle(rawReply: string) {
  const temiz = rawReply
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/g, "")
    .trim();

  if (!temiz) {
    return `Bu soruyu yanıtlamak için yeterli bilgiye sahip değilim.\n\n${YATIRIM_TAVSIYESI_UYARISI}`;
  }

  const uyariRegex = /bu analiz yatırım tavsiyesi değildir\.?/gi;
  const uyariVar = uyariRegex.test(temiz);
  const tekUyarili = temiz.replace(uyariRegex, "").replace(/\n{3,}/g, "\n\n").trim();

  return uyariVar
    ? `${tekUyarili}\n\n${YATIRIM_TAVSIYESI_UYARISI}`.trim()
    : `${tekUyarili}\n\n${YATIRIM_TAVSIYESI_UYARISI}`;
}

function kaliteBayraklari(reply: string, intent: ChatIntent) {
  const flags: string[] = [];
  if (reply.length > 1800) flags.push("uzun_cevap");
  if (!reply.includes(YATIRIM_TAVSIYESI_UYARISI)) flags.push("uyari_eksik");
  if (yasakliMiKontrol(reply)) flags.push("yasakli_ifade");
  if (RAKIP_KAYNAK_IFADELERI.some((re) => re.test(reply))) flags.push("rakip_kaynak_yonlendirme");
  if (/\b(canlı|anlık|gerçek zamanlı)\s+(veri|fiyat|piyasa|takip|görünüm|gorunum)\b/i.test(reply)) flags.push("canli_veri_iddiasi");
  if (intent === "haber_neden" && /\bkesin nedeni\b|\btek nedeni\b/i.test(reply)) flags.push("kesin_neden_dili");
  if (intent === "karsilastirma" && /\bnet kazanan\b|\bkesinlikle daha iyi\b/i.test(reply)) flags.push("kesin_karsilastirma_dili");
  return flags;
}

function cevabiGuvenliDileCevir(reply: string, flags: string[]) {
  let duzeltilmis = reply;
  let rakipSatirSilindi = false;

  if (flags.includes("canli_veri_iddiasi")) {
    duzeltilmis = duzeltilmis
      .replace(/\bcanlı\s+(veri|fiyat|piyasa|takip)\b/gi, "gecikmeli $1")
      .replace(/\banlık\s+(veri|fiyat|piyasa|takip)\b/gi, "gecikmeli $1")
      .replace(/\bgerçek zamanlı\s+(veri|fiyat|piyasa|takip)\b/gi, "gecikmeli $1")
      .replace(/\b(canlı|anlık|gerçek zamanlı)\s+(görünüm|gorunum)\b/gi, "mevcut görünüm");
  }

  if (flags.includes("kesin_neden_dili")) {
    duzeltilmis = duzeltilmis
      .replace(/\bkesin nedeni\b/gi, "olası nedenlerinden biri")
      .replace(/\btek nedeni\b/gi, "olası nedenlerinden biri");
  }

  if (flags.includes("kesin_karsilastirma_dili")) {
    duzeltilmis = duzeltilmis
      .replace(/\bnet kazanan\b/gi, "bu metriklerde öne çıkan taraf")
      .replace(/\bkesinlikle daha iyi\b/gi, "bu metriklerde daha güçlü görünüyor");
  }

  if (flags.includes("rakip_kaynak_yonlendirme")) {
    const satirlar = duzeltilmis.split("\n").filter((satir) => {
      const rakipSatir = RAKIP_KAYNAK_IFADELERI.some((re) => re.test(satir));
      if (rakipSatir) rakipSatirSilindi = true;
      return !rakipSatir;
    });
    duzeltilmis = satirlar.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  if (rakipSatirSilindi) {
    duzeltilmis = `${duzeltilmis}\n\nParaKonuşur içinde sağlanan veriyle yorum yapabilirim; eksik veri varsa bunu açıkça belirtirim.`;
  }

  return cevabiTemizle(duzeltilmis);
}

function chatbotTelemetryLogla(event: {
  userId: string;
  intent: ChatIntent;
  ticker?: string;
  portfoySayisi: number;
  qualityFlags: string[];
  alarmTaslakVar: boolean;
  engellendi: boolean;
  sureMs: number;
  inputTokens?: number;
  outputTokens?: number;
}) {
  console.info("chatbot_response", {
    userId: event.userId,
    intent: event.intent,
    ticker: event.ticker ?? null,
    portfoySayisi: event.portfoySayisi,
    qualityFlags: event.qualityFlags,
    alarmTaslakVar: event.alarmTaslakVar,
    engellendi: event.engellendi,
    sureMs: event.sureMs,
    inputTokens: event.inputTokens ?? null,
    outputTokens: event.outputTokens ?? null,
  });
}

type PortfoyPromptItem = {
  ticker: string;
  adet: number;
  maliyet: number;
  guncelFiyat?: number;
  guncelDeger?: number;
  karZarar?: number;
  karZararYuzde?: number;
  degisimYuzde?: number;
  alis_fiyati?: number;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatIntent =
  | "kavram"
  | "hisse_analizi"
  | "teknik_tarama"
  | "portfoy"
  | "karsilastirma"
  | "haber_neden"
  | "alarm_aksiyon"
  | "piyasa_genel"
  | "genel";

type HissePromptVeri = {
  fiyat?: number;
  oncekiKapanis?: number;
  degisimYuzde?: number | null;
  gunlukYuksek?: number;
  gunlukDusuk?: number;
  yillikYuksek?: number;
  yillikDusuk?: number;
  hacim?: number;
  sirketAdi?: string;
};

type HisseSektorBilgisi = {
  sektor?: string;
  endustri?: string;
};

type TeknikMetrikler = {
  sektor?: string;
  endustri?: string;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  ema20?: number;
  ema50?: number;
  ema200?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  bollingerUst?: number;
  bollingerAlt?: number;
  atr?: number;
  volatiliteGunluk?: number;
  beta1Yil?: number;
  performans1H?: number;
  performans1A?: number;
  performans3A?: number;
  performans1Y?: number;
  piyasaDegeri?: number;
  hacim?: number;
  ortalamaHacim10G?: number;
  ortalamaHacim30G?: number;
  relatifHacim10G?: number;
  yillikYuksek?: number;
  yillikDusuk?: number;
  pivotS3?: number;
  pivotS2?: number;
  pivotS1?: number;
  pivotOrta?: number;
  pivotR1?: number;
  pivotR2?: number;
  pivotR3?: number;
};

type TemelMetrikler = {
  fk?: number;
  pddd?: number;
  pdSatis?: number;
  firmaDegeri?: number;
  fdFavok?: number;
  gelir?: number;
  brutKar?: number;
  netKar?: number;
  netKarTtm?: number;
  favok?: number;
  brutMarj?: number;
  faaliyetMarji?: number;
  netMarj?: number;
  aktifKarlilik?: number;
  ozkaynakKarlilik?: number;
  toplamVarlik?: number;
  toplamYukumluluk?: number;
  ozkaynak?: number;
  toplamBorc?: number;
  nakitBenzerleri?: number;
  borcOzkaynak?: number;
  hisseBasinaDefterDegeri?: number;
  temettuVerimi?: number;
  sonTemettuVerimi?: number;
  temettuOdemeOrani?: number;
  halkaAcikPay?: number;
  toplamPay?: number;
  halkaAciklikOrani?: number;
  halkaAcikPiyasaDegeri?: number;
  paraBirimi?: string;
  hissedarSayisi?: number;
};

type TemettuOdemesi = {
  tarih: string;
  tutar: number;
};

type TemettuGecmisi = {
  ticker: string;
  odemeler: TemettuOdemesi[];
  sonOdeme?: TemettuOdemesi;
  son12AyToplam?: number;
  sonYilToplam?: number;
  odemeSayisi5Yil: number;
  yaklasikSon12AyVerim?: number;
};

type EndeksKiyasItem = {
  kod: string;
  ad: string;
  fiyat?: number;
  gunlukDegisim?: number;
  performans1H?: number;
  performans1A?: number;
  performans3A?: number;
  performans1Y?: number;
};

type PiyasaKiyasBaglami = {
  xu100?: EndeksKiyasItem;
  xu030?: EndeksKiyasItem;
  sektorEndeksi?: EndeksKiyasItem;
  sektorEndeksKodu?: string;
  sektorEndeksAdi?: string;
};

type GenelPiyasaHisse = {
  ticker: string;
  sirketAdi?: string;
  sektor?: string;
  fiyat?: number;
  degisimYuzde?: number;
  relatifHacim?: number;
  hacim?: number;
};

type GenelPiyasaBaglami = {
  endeksler: EndeksKiyasItem[];
  kapsam: number;
  veriSayisi: number;
  yukselenSayisi: number;
  dusenSayisi: number;
  yataySayisi: number;
  ortalamaDegisim?: number;
  enCokYukselenler: GenelPiyasaHisse[];
  enCokDusenler: GenelPiyasaHisse[];
  yuksekRelatifHacim: GenelPiyasaHisse[];
  sektorEndeksleri: EndeksKiyasItem[];
};

type YahooChartMeta = {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketVolume?: number;
  longName?: string;
  shortName?: string;
};

function tlFormatla(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;
}

function yuzdeFormatla(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const isaret = value >= 0 ? "+" : "-";
  return `${isaret}%${Math.abs(value).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sayiFormatla(value?: number, maximumFractionDigits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("tr-TR", { maximumFractionDigits })
    : null;
}

function teknikYuzde(value?: number) {
  return yuzdeFormatla(value) ?? "veri yok";
}

function ortalamaUzaklik(fiyat?: number, ortalama?: number) {
  return fiyat !== undefined && ortalama !== undefined && ortalama > 0
    ? ((fiyat - ortalama) / ortalama) * 100
    : undefined;
}

type KarsilastirmaHisse = {
  ticker: string;
  sektor?: string;
  endustri?: string;
  teknik?: TeknikMetrikler;
  temel?: TemelMetrikler;
  temettu?: TemettuGecmisi;
  piyasaKiyas?: PiyasaKiyasBaglami;
  fiyat?: number;
  degisimYuzde?: number;
  hacim?: number;
  yillikYuksek?: number;
  yillikDusuk?: number;
  hafta52Konum?: number;
};

type TeknikTaramaIstegi = {
  tip:
    | "rsi"
    | "hacim_artis"
    | "hafta52_yakin"
    | "gunluk_hareket"
    | "momentum_guclenen"
    | "macd_pozitif"
    | "ema_trend"
    | "bollinger_yakin"
    | "hacim_kirilim"
    | "volatilite_yuksek";
  gosterge?: "RSI";
  kosul: "asagi" | "yukari";
  esik: number;
};

type TeknikTaramaHisse = {
  ticker: string;
  sirketAdi?: string;
  sektor?: string;
  endustri?: string;
  fiyat?: number;
  degisimYuzde?: number;
  rsi?: number;
  hacim?: number;
  relatifHacim?: number;
  hafta52Konum?: number;
  teknik?: TeknikMetrikler;
};

type KapHaber = {
  baslik: string;
  tarih?: string;
  kaynakUrl?: string;
  bildirimIndex?: string;
  olayTipi: string;
  etkiEtiketi: "olumlu_olabilir" | "olumsuz_olabilir" | "notr_belirsiz" | "risk_uyarisi";
  detayOzeti?: string;
  anahtarNoktalar: string[];
  detayGoruldu: boolean;
};

type AlarmTaslak = {
  ticker?: string;
  tip?: "fiyat_seviye" | "fiyat_yuzde" | "gosterge";
  kosul?: "yukari" | "asagi";
  hedef_deger?: number;
  hedef_yuzde?: number;
  gosterge_tipi?: string;
  gosterge_esik?: number;
  eksikler: string[];
  ozet: string;
};

const TICKER_STOPWORDS = new Set([
  "BIST",
  "KAP",
  "RSI",
  "MACD",
  "FAVOK",
  "FAVÖK",
  "USD",
  "TRY",
  "EUR",
  "PDD",
  "PDDD",
  "PD",
  "DD",
]);

const kapMemberCache: Record<string, string> = {};

function hisseAdiNormalize(text: string) {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/\b(a\.?s\.?|anonim sirketi|holding|holdıng)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sirketAdindanTickerAdaylari(text: string) {
  const normalized = hisseAdiNormalize(text);
  if (normalized.length < 3) return [];

  return HISSE_AD_ESLESMELERI
    .filter((h) => {
      const adaylar = [h.ad, h.fullName, h.kapTitle].filter(Boolean);
      return adaylar.some((ad) => {
        if (ad.length < 3) return false;
        return normalized.includes(ad) || ad.includes(normalized);
      });
    })
    .sort((a, b) => {
      const aExact = [a.ad, a.fullName, a.kapTitle].some((ad) => ad === normalized) ? 0 : 1;
      const bExact = [b.ad, b.fullName, b.kapTitle].some((ad) => ad === normalized) ? 0 : 1;
      return aExact - bExact || a.ticker.localeCompare(b.ticker, "tr");
    })
    .map((h) => h.ticker)
    .slice(0, 4);
}

async function kapCompanyId(ticker: string): Promise<string | null> {
  if (kapMemberCache[ticker]) return kapMemberCache[ticker];

  try {
    const res = await fetch(`${KAP_API_URL}/members`, { headers: KAP_HEADERS, next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    for (const member of Array.isArray(data) ? data : []) {
      if (member?.stockCode && member?.id) kapMemberCache[member.stockCode] = member.id;
    }
    return kapMemberCache[ticker] || null;
  } catch {
    return null;
  }
}

function kapTarihParse(timeStr?: string): string | undefined {
  if (!timeStr) return undefined;
  const [datePart, timePart] = timeStr.split(" ");
  const [day, month, year] = datePart.split(".");
  if (!day || !month || !year || !timePart) return undefined;
  return new Date(`${year}-${month}-${day}T${timePart}`).toISOString();
}

function metinTemizle(text?: string) {
  return String(text ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function kapDetayMetniCikar(value: unknown, depth = 0): string[] {
  if (depth > 4 || value === null || value === undefined) return [];
  if (typeof value === "string") {
    const temiz = metinTemizle(value);
    return temiz.length >= 20 ? [temiz] : [];
  }
  if (typeof value === "number" || typeof value === "boolean") return [];
  if (Array.isArray(value)) return value.flatMap((item) => kapDetayMetniCikar(item, depth + 1));
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const oncelikliAlanlar = [
      "value",
      "text",
      "description",
      "explanation",
      "summary",
      "subject",
      "title",
      "tr",
      "content",
      "header",
    ];
    const parcalar = oncelikliAlanlar.flatMap((key) => kapDetayMetniCikar(obj[key], depth + 1));
    if (parcalar.length > 0) return parcalar;
    return Object.values(obj).flatMap((item) => kapDetayMetniCikar(item, depth + 1));
  }
  return [];
}

function kapOlayTipiSiniflandir(text: string) {
  const q = text.toLocaleLowerCase("tr-TR");
  if (/\b(temettü|kar payı|k[aâ]r payı|dividend)\b/.test(q)) return "Temettü / kâr payı";
  if (/\b(bilanço|finansal rapor|finansal tablo|faaliyet raporu|gelir tablosu|net dönem k[aâ]rı)\b/.test(q)) return "Finansal sonuç / bilanço";
  if (/\b(ihale|sözleşme|sozlesme|sipariş|siparis|kontrat|anlaşma|anlasma)\b/.test(q)) return "İhale / sözleşme";
  if (/\b(sermaye artırımı|sermaye artirimi|bedelli|bedelsiz|tahsisli)\b/.test(q)) return "Sermaye işlemi";
  if (/\b(pay alım|pay alim|geri alım|geri alim|payların geri|buyback)\b/.test(q)) return "Pay geri alım";
  if (/\b(yönetim kurulu|yonetim kurulu|genel kurul|atama|istifa)\b/.test(q)) return "Yönetim / genel kurul";
  if (/\b(kredi derecelendirme|rating|not görünümü|not gorunumu)\b/.test(q)) return "Kredi derecelendirme";
  if (/\b(dava|soruşturma|sorusturma|ceza|idari para|tedbir|uyarı|uyari)\b/.test(q)) return "Hukuki / düzenleyici süreç";
  if (/\b(üretim|uretim|yatırım|yatirim|kapasite|tesis|fabrika)\b/.test(q)) return "Yatırım / operasyon";
  return "Genel KAP bildirimi";
}

function kapEtkiEtiketiCikar(text: string): KapHaber["etkiEtiketi"] {
  const q = text.toLocaleLowerCase("tr-TR");
  if (/\b(ceza|dava|soruşturma|sorusturma|tedbir|iptal|red|zarar|azalış|azalis|düşüş|dusus|negatif)\b/.test(q)) return "risk_uyarisi";
  if (/\b(zarar|net zarar|satışların azalması|satislarin azalmasi|fesih)\b/.test(q)) return "olumsuz_olabilir";
  if (/\b(temettü|kar payı|k[aâ]r payı|ihale kazan|sözleşme imzalan|sipariş|yatırım|kapasite art|geri alım|k[aâ]r art|olumlu)\b/.test(q)) return "olumlu_olabilir";
  return "notr_belirsiz";
}

function kapAnahtarNoktalariCikar(text: string) {
  const cumleler = metinTemizle(text)
    .split(/(?<=[.!?])\s+| [-•]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 240);
  return Array.from(new Set(cumleler)).slice(0, 4);
}

function kapHaberOlustur(d: Record<string, unknown>): KapHaber | null {
  const baslik = metinTemizle(
    (d.summary as { tr?: string } | undefined)?.tr
    || (d.subject as { tr?: string } | undefined)?.tr
    || String(d.title ?? "")
  );
  if (!baslik) return null;

  const detayMetinleri = kapDetayMetniCikar(d)
    .filter((parca) => parca !== baslik)
    .slice(0, 12);
  const detayHam = detayMetinleri.join(" ");
  const detayOzeti = detayHam ? detayHam.slice(0, 700).trim() : undefined;
  const sinifMetni = `${baslik} ${detayOzeti ?? ""}`;
  const disclosureIndex = String(d.disclosureIndex ?? d.id ?? "");

  return {
    baslik,
    tarih: kapTarihParse(String(d.time ?? "")),
    kaynakUrl: typeof d.link === "string" && d.link
      ? d.link
      : disclosureIndex
        ? `https://www.kap.org.tr/tr/Bildirim/${disclosureIndex}`
        : undefined,
    bildirimIndex: disclosureIndex || undefined,
    olayTipi: kapOlayTipiSiniflandir(sinifMetni),
    etkiEtiketi: kapEtkiEtiketiCikar(sinifMetni),
    detayOzeti,
    anahtarNoktalar: kapAnahtarNoktalariCikar(detayOzeti ?? baslik),
    detayGoruldu: Boolean(detayOzeti),
  };
}

async function kapHaberleriCek(ticker?: string): Promise<KapHaber[]> {
  try {
    const lastRes = await fetch(`${KAP_API_URL}/lastDisclosureIndex`, { headers: KAP_HEADERS, cache: "no-store" });
    if (!lastRes.ok) return [];
    const { lastDisclosureIndex } = await lastRes.json();
    const startIndex = Math.max(parseInt(lastDisclosureIndex) - 250, 0);
    const params = new URLSearchParams({ disclosureIndex: String(startIndex) });

    if (ticker) {
      const companyId = await kapCompanyId(ticker);
      if (companyId) params.set("companyId", companyId);
    }

    const listRes = await fetch(`${KAP_API_URL}/disclosures?${params}`, { headers: KAP_HEADERS, cache: "no-store" });
    if (!listRes.ok) return [];
    const list = await listRes.json();
    const odaList = (Array.isArray(list) ? list : [])
      .filter((d) => d?.disclosureType === "ODA")
      .slice(-5)
      .reverse();

    const detaylar = await Promise.all(
      odaList.map(async (d) => {
        try {
          const res = await fetch(`${KAP_API_URL}/disclosureDetail/${d.disclosureIndex}?fileType=data`, {
            headers: KAP_HEADERS,
            cache: "no-store",
          });
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      })
    );

    return detaylar
      .filter(Boolean)
      .map((d) => kapHaberOlustur(d as Record<string, unknown>))
      .filter((h): h is KapHaber => Boolean(h));
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function haberNedenPromptu(tickers: string[]) {
  const hedefTicker = tickers[0];
  const haberler = await kapHaberleriCek(hedefTicker);

  if (!hedefTicker) {
    return `HABER/NEDEN BAĞLAMI:
- Kullanıcı fiyat hareketinin nedenini soruyor ama net bir ticker tespit edilmedi.
- Önce hangi hisse veya endeks için sorduğunu netleştir.`;
  }

  const satirlar = haberler.map((h) => {
    const tarih = h.tarih ? new Date(h.tarih).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "tarih yok";
    const noktalar = h.anahtarNoktalar.length > 0 ? `\n  Anahtar noktalar: ${h.anahtarNoktalar.join(" | ")}` : "";
    const detay = h.detayOzeti ? `\n  Detay özeti: ${h.detayOzeti}` : "\n  Detay özeti: veri yok; yalnızca başlık/metadata görüldü.";
    return `- ${tarih}: ${h.baslik}${h.kaynakUrl ? ` (${h.kaynakUrl})` : ""}
  Olay tipi: ${h.olayTipi} | Olası etki etiketi: ${h.etkiEtiketi} | Detay görüldü: ${h.detayGoruldu ? "evet" : "hayır"}${noktalar}${detay}`;
  }).join("\n");

  return `HABER/NEDEN BAĞLAMI:
- İncelenen ticker: ${hedefTicker}
- Son KAP başlıkları: ${haberler.length > 0 ? `\n${satirlar}` : "Bu istek sırasında ilgili yakın KAP başlığı bulunamadı veya KAP verisi alınamadı."}

NEDEN YORUM KILAVUZU:
- KAP başlığı varsa bile fiyat hareketini kesin olarak buna bağlama; "etkili olmuş olabilir" gibi olasılık dili kullan.
- Olay tipini belirt: finansal sonuç, temettü, ihale/sözleşme, sermaye işlemi, geri alım, hukuki süreç, yönetim/genel kurul veya genel bildirim.
- Etki etiketini sadece ön sınıflandırma olarak kullan; "kesin olumlu/olumsuz" deme.
- Detay görüldü "hayır" ise KAP metninin tamamını okumuş gibi davranma; yalnızca başlık/metadata üzerinden sınırlı yorum yaptığını söyle.
- Detay özeti varsa bile tam metnin tamamını aktarma; anahtar noktaları kısa özetle.
- KAP/haber yoksa bunu açıkça söyle ve fiyat hareketini fiyat, hacim, piyasa geneli, teknik seviye ve haber akışı çerçevesinde değerlendir.
- Kullanıcının kontrol etmesi gerekenleri kısa listele: KAP detayı, fiyatın haberden önce/sonra hareketi, hacim anomalisi, endeks yönü, sektör hareketi, destek/direnç.
- Haber linki varsa kullanıcıyı ParaKonuşur/KAP bağlamında tut; rakip finans platformu önerme.`;
}

function tickerAdaylari(text: string, aktifTicker?: string): string[] {
  const matches = text.match(/\b[A-ZÇĞİÖŞÜ]{3,6}\b/gi) ?? [];
  const sirketTickers = sirketAdindanTickerAdaylari(text);
  const tickers = [...matches, ...sirketTickers, aktifTicker ?? ""]
    .map((t) => t.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ]/g, ""))
    .filter((t) => t.length >= 3 && !TICKER_STOPWORDS.has(t) && BIST_TICKER_SET.has(t));

  return Array.from(new Set(tickers)).slice(0, 4);
}

function sayiParse(value?: string | null) {
  if (!value) return undefined;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function tradingViewSektorBilgisiCek(tickers: string[]): Promise<Record<string, HisseSektorBilgisi>> {
  const uniqueTickers = Array.from(new Set(tickers.map((t) => t.toLocaleUpperCase("tr-TR")).filter(Boolean)));
  if (uniqueTickers.length === 0) return {};

  const result: Record<string, HisseSektorBilgisi> = {};
  for (let i = 0; i < uniqueTickers.length; i += 180) {
    const chunk = uniqueTickers.slice(i, i + 180);
    try {
      const res = await fetch("https://scanner.tradingview.com/turkey/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: { tickers: chunk.map((ticker) => `BIST:${ticker}`), query: { types: [] } },
          columns: ["name", "sector", "industry"],
        }),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const row of (data?.data ?? []) as Array<{ s?: string; d?: unknown[] }>) {
        const [name, sector, industry] = row.d ?? [];
        const ticker = String(name || row.s?.split(":")[1] || "").replace("BIST:", "").toLocaleUpperCase("tr-TR");
        if (!ticker) continue;
        result[ticker] = {
          sektor: typeof sector === "string" && sector.trim() ? sector : undefined,
          endustri: typeof industry === "string" && industry.trim() ? industry : undefined,
        };
      }
    } catch {
      continue;
    }
  }

  return result;
}

const TRADINGVIEW_TEKNIK_KOLONLARI = [
  "name",
  "description",
  "sector",
  "industry",
  "close",
  "change",
  "RSI",
  "MACD.macd",
  "MACD.signal",
  "MACD.hist",
  "EMA20",
  "EMA50",
  "EMA200",
  "SMA20",
  "SMA50",
  "SMA200",
  "BB.upper",
  "BB.lower",
  "ATR",
  "Volatility.D",
  "beta_1_year",
  "Perf.W",
  "Perf.1M",
  "Perf.3M",
  "Perf.Y",
  "market_cap_basic",
  "volume",
  "average_volume_10d_calc",
  "average_volume_30d_calc",
  "relative_volume_10d_calc",
  "price_52_week_high",
  "price_52_week_low",
  "Pivot.M.Classic.S3",
  "Pivot.M.Classic.S2",
  "Pivot.M.Classic.S1",
  "Pivot.M.Classic.Middle",
  "Pivot.M.Classic.R1",
  "Pivot.M.Classic.R2",
  "Pivot.M.Classic.R3",
];

const TRADINGVIEW_TEMEL_KOLONLARI = [
  "price_earnings_ttm",
  "price_book_ratio",
  "price_sales_current",
  "enterprise_value_fq",
  "enterprise_value_ebitda_ttm",
  "total_revenue",
  "gross_profit",
  "net_income",
  "net_income_ttm",
  "ebitda",
  "gross_margin",
  "operating_margin",
  "net_margin",
  "return_on_assets",
  "return_on_equity",
  "total_assets",
  "total_liabilities_fq",
  "total_equity_fq",
  "total_debt_fq",
  "cash_n_short_term_invest_fq",
  "debt_to_equity_fq",
  "book_value_per_share_fq",
  "dividends_yield_current",
  "dividend_yield_recent",
  "dividend_payout_ratio_ttm",
  "float_shares_outstanding",
  "total_shares_outstanding_fundamental",
  "market_cap_calc",
  "fundamental_currency_code",
  "number_of_shareholders",
];

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

type TradingViewTeknikSatir = {
  ticker: string;
  sirketAdi?: string;
  fiyat?: number;
  degisimYuzde?: number;
  sektor?: string;
  endustri?: string;
  teknik: TeknikMetrikler;
  temel: TemelMetrikler;
};

function tradingViewTeknikSatirCoz(row: { s?: string; d?: unknown[] }): TradingViewTeknikSatir | null {
  const [
    name,
    description,
    sector,
    industry,
    close,
    change,
    rsi,
    macd,
    macdSignal,
    macdHistogram,
    ema20,
    ema50,
    ema200,
    sma20,
    sma50,
    sma200,
    bollingerUst,
    bollingerAlt,
    atr,
    volatiliteGunluk,
    beta1Yil,
    performans1H,
    performans1A,
    performans3A,
    performans1Y,
    piyasaDegeri,
    volume,
    ortalamaHacim10G,
    ortalamaHacim30G,
    relatifHacim10G,
    yillikYuksek,
    yillikDusuk,
    pivotS3,
    pivotS2,
    pivotS1,
    pivotOrta,
    pivotR1,
    pivotR2,
    pivotR3,
    fk,
    pddd,
    pdSatis,
    firmaDegeri,
    fdFavok,
    gelir,
    brutKar,
    netKar,
    netKarTtm,
    favok,
    brutMarj,
    faaliyetMarji,
    netMarj,
    aktifKarlilik,
    ozkaynakKarlilik,
    toplamVarlik,
    toplamYukumluluk,
    ozkaynak,
    toplamBorc,
    nakitBenzerleri,
    borcOzkaynak,
    hisseBasinaDefterDegeri,
    temettuVerimi,
    sonTemettuVerimi,
    temettuOdemeOrani,
    halkaAcikPay,
    toplamPay,
    halkaAcikPiyasaDegeri,
    paraBirimi,
    hissedarSayisi,
  ] = row.d ?? [];
  const ticker = String(name || row.s?.split(":")[1] || "").replace("BIST:", "").toLocaleUpperCase("tr-TR");
  if (!ticker) return null;

  const fiyat = finiteNumber(close);
  const teknik: TeknikMetrikler = {
    sektor: typeof sector === "string" && sector.trim() ? sector : undefined,
    endustri: typeof industry === "string" && industry.trim() ? industry : undefined,
    rsi: finiteNumber(rsi),
    macd: finiteNumber(macd),
    macdSignal: finiteNumber(macdSignal),
    macdHistogram: finiteNumber(macdHistogram),
    ema20: finiteNumber(ema20),
    ema50: finiteNumber(ema50),
    ema200: finiteNumber(ema200),
    sma20: finiteNumber(sma20),
    sma50: finiteNumber(sma50),
    sma200: finiteNumber(sma200),
    bollingerUst: finiteNumber(bollingerUst),
    bollingerAlt: finiteNumber(bollingerAlt),
    atr: finiteNumber(atr),
    volatiliteGunluk: finiteNumber(volatiliteGunluk),
    beta1Yil: finiteNumber(beta1Yil),
    performans1H: finiteNumber(performans1H),
    performans1A: finiteNumber(performans1A),
    performans3A: finiteNumber(performans3A),
    performans1Y: finiteNumber(performans1Y),
    piyasaDegeri: finiteNumber(piyasaDegeri),
    hacim: finiteNumber(volume),
    ortalamaHacim10G: finiteNumber(ortalamaHacim10G),
    ortalamaHacim30G: finiteNumber(ortalamaHacim30G),
    relatifHacim10G: finiteNumber(relatifHacim10G),
    yillikYuksek: finiteNumber(yillikYuksek),
    yillikDusuk: finiteNumber(yillikDusuk),
    pivotS3: finiteNumber(pivotS3),
    pivotS2: finiteNumber(pivotS2),
    pivotS1: finiteNumber(pivotS1),
    pivotOrta: finiteNumber(pivotOrta),
    pivotR1: finiteNumber(pivotR1),
    pivotR2: finiteNumber(pivotR2),
    pivotR3: finiteNumber(pivotR3),
  };
  const halkaAcikPayDeger = finiteNumber(halkaAcikPay);
  const toplamPayDeger = finiteNumber(toplamPay);
  const temel: TemelMetrikler = {
    fk: finiteNumber(fk),
    pddd: finiteNumber(pddd),
    pdSatis: finiteNumber(pdSatis),
    firmaDegeri: finiteNumber(firmaDegeri),
    fdFavok: finiteNumber(fdFavok),
    gelir: finiteNumber(gelir),
    brutKar: finiteNumber(brutKar),
    netKar: finiteNumber(netKar),
    netKarTtm: finiteNumber(netKarTtm),
    favok: finiteNumber(favok),
    brutMarj: finiteNumber(brutMarj),
    faaliyetMarji: finiteNumber(faaliyetMarji),
    netMarj: finiteNumber(netMarj),
    aktifKarlilik: finiteNumber(aktifKarlilik),
    ozkaynakKarlilik: finiteNumber(ozkaynakKarlilik),
    toplamVarlik: finiteNumber(toplamVarlik),
    toplamYukumluluk: finiteNumber(toplamYukumluluk),
    ozkaynak: finiteNumber(ozkaynak),
    toplamBorc: finiteNumber(toplamBorc),
    nakitBenzerleri: finiteNumber(nakitBenzerleri),
    borcOzkaynak: finiteNumber(borcOzkaynak),
    hisseBasinaDefterDegeri: finiteNumber(hisseBasinaDefterDegeri),
    temettuVerimi: finiteNumber(temettuVerimi),
    sonTemettuVerimi: finiteNumber(sonTemettuVerimi),
    temettuOdemeOrani: finiteNumber(temettuOdemeOrani),
    halkaAcikPay: halkaAcikPayDeger,
    toplamPay: toplamPayDeger,
    halkaAciklikOrani: halkaAcikPayDeger !== undefined && toplamPayDeger !== undefined && toplamPayDeger > 0
      ? (halkaAcikPayDeger / toplamPayDeger) * 100
      : undefined,
    halkaAcikPiyasaDegeri: finiteNumber(halkaAcikPiyasaDegeri),
    paraBirimi: typeof paraBirimi === "string" && paraBirimi.trim() ? paraBirimi : undefined,
    hissedarSayisi: finiteNumber(hissedarSayisi),
  };

  return {
    ticker,
    sirketAdi: typeof description === "string" ? description : undefined,
    fiyat,
    degisimYuzde: finiteNumber(change),
    sektor: teknik.sektor,
    endustri: teknik.endustri,
    teknik,
    temel,
  };
}

async function tradingViewTeknikMetrikleriCek(tickers: string[]): Promise<Record<string, TradingViewTeknikSatir>> {
  const uniqueTickers = Array.from(new Set(tickers.map((t) => t.toLocaleUpperCase("tr-TR")).filter(Boolean)));
  const result: Record<string, NonNullable<ReturnType<typeof tradingViewTeknikSatirCoz>>> = {};
  if (uniqueTickers.length === 0) return result;

  for (let i = 0; i < uniqueTickers.length; i += 180) {
    const chunk = uniqueTickers.slice(i, i + 180);
    try {
      const res = await fetch("https://scanner.tradingview.com/turkey/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: { tickers: chunk.map((ticker) => `BIST:${ticker}`), query: { types: [] } },
          columns: [...TRADINGVIEW_TEKNIK_KOLONLARI, ...TRADINGVIEW_TEMEL_KOLONLARI],
        }),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const row of (data?.data ?? []) as Array<{ s?: string; d?: unknown[] }>) {
        const parsed = tradingViewTeknikSatirCoz(row);
        if (parsed) result[parsed.ticker] = parsed;
      }
    } catch {
      continue;
    }
  }

  return result;
}

async function temettuGecmisiCek(ticker: string, fiyat?: number): Promise<TemettuGecmisi | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?events=dividends&range=5y&interval=1d`,
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const divs: Record<string, { amount?: number; date?: number }> = data?.chart?.result?.[0]?.events?.dividends || {};
    const odemeler = Object.values(divs)
      .map((d): TemettuOdemesi | null => {
        if (typeof d.amount !== "number" || typeof d.date !== "number") return null;
        return {
          tarih: new Date(d.date * 1000).toISOString().slice(0, 10),
          tutar: Math.round(d.amount * 10000) / 10000,
        };
      })
      .filter((d): d is TemettuOdemesi => Boolean(d))
      .sort((a, b) => b.tarih.localeCompare(a.tarih));

    const now = Date.now();
    const birYilMs = 365 * 24 * 60 * 60 * 1000;
    const son12AyOdemeler = odemeler.filter((d) => now - new Date(d.tarih).getTime() <= birYilMs);
    const son12AyToplam = son12AyOdemeler.reduce((acc, d) => acc + d.tutar, 0);
    const sonYil = odemeler[0]?.tarih.slice(0, 4);
    const sonYilToplam = sonYil
      ? odemeler.filter((d) => d.tarih.startsWith(sonYil)).reduce((acc, d) => acc + d.tutar, 0)
      : undefined;
    const yaklasikSon12AyVerim = fiyat && fiyat > 0 && son12AyToplam > 0 ? (son12AyToplam / fiyat) * 100 : undefined;

    return {
      ticker,
      odemeler,
      sonOdeme: odemeler[0],
      son12AyToplam: son12AyToplam > 0 ? son12AyToplam : undefined,
      sonYilToplam,
      odemeSayisi5Yil: odemeler.length,
      yaklasikSon12AyVerim,
    };
  } catch {
    return null;
  }
}

async function temettuGecmisleriCek(tickers: string[], fiyatlar: Record<string, number | undefined> = {}) {
  const uniqueTickers = Array.from(new Set(tickers.map((t) => t.toLocaleUpperCase("tr-TR")).filter(Boolean)));
  const entries = await Promise.all(uniqueTickers.map(async (ticker) => [ticker, await temettuGecmisiCek(ticker, fiyatlar[ticker])] as const));
  return Object.fromEntries(entries.filter(([, value]) => value !== null)) as Record<string, TemettuGecmisi>;
}

function sektorEndeksiEsle(sektor?: string, endustri?: string): { kod: string; ad: string } | null {
  const metin = `${sektor ?? ""} ${endustri ?? ""}`.toLocaleLowerCase("tr-TR");
  const eslesmeler: Array<[RegExp, { kod: string; ad: string }]> = [
    [/\b(finance|bank|banks|major banks|bankac)/, { kod: "XBANK.IS", ad: "BIST Banka" }],
    [/\b(insurance|sigorta)/, { kod: "XSGRT.IS", ad: "BIST Sigorta" }],
    [/\b(technology|electronic|software|teknoloji|elektronik)/, { kod: "XUTEK.IS", ad: "BIST Teknoloji" }],
    [/\b(transportation|airlines|ulaştırma|ulas|hava)/, { kod: "XULAS.IS", ad: "BIST Ulaştırma" }],
    [/\b(consumer non-durables|food|beverage|gıda|gida|icecek|içecek)/, { kod: "XGIDA.IS", ad: "BIST Gıda İçecek" }],
    [/\b(utilities|electric|elektrik)/, { kod: "XELKT.IS", ad: "BIST Elektrik" }],
    [/\b(energy minerals|oil|gas|petrol|kimya|chemical|plastics)/, { kod: "XKMYA.IS", ad: "BIST Kimya Petrol Plastik" }],
    [/\b(producer manufacturing|machinery|metal fabric|makina|metal eşya|metal esya)/, { kod: "XMESY.IS", ad: "BIST Metal Eşya Makina" }],
    [/\b(non-energy minerals|steel|demir|çelik|celik|metal ana)/, { kod: "XMANA.IS", ad: "BIST Metal Ana" }],
    [/\b(industrial services|construction|inşaat|insaat)/, { kod: "XINSA.IS", ad: "BIST İnşaat" }],
    [/\b(real estate|gyo|gayrimenkul)/, { kod: "XGMYO.IS", ad: "BIST GYO" }],
    [/\b(retail|distribution services|trade|ticaret|perakende)/, { kod: "XTCRT.IS", ad: "BIST Ticaret" }],
    [/\b(holding|investment trusts|yatırım|yatirim)/, { kod: "XHOLD.IS", ad: "BIST Holding ve Yatırım" }],
    [/\b(consumer durables|durables|household|tüketim|tuketim)/, { kod: "XUSIN.IS", ad: "BIST Sınai" }],
  ];
  return eslesmeler.find(([re]) => re.test(metin))?.[1] ?? null;
}

function performansHesapla(closes: number[], geriGun: number) {
  if (closes.length < 2) return undefined;
  const son = closes.at(-1);
  const onceki = closes[Math.max(0, closes.length - 1 - geriGun)];
  return son !== undefined && onceki !== undefined && onceki > 0 ? ((son - onceki) / onceki) * 100 : undefined;
}

async function endeksVerisiCek(kod: string, ad: string): Promise<EndeksKiyasItem | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${kod}?interval=1d&range=1y`, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta as YahooChartMeta | undefined;
    const closes = ((result?.indicators?.quote?.[0]?.close ?? []) as unknown[])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const fiyat = typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : closes.at(-1);
    const oncekiKapanisAdayi = closes.length >= 2
      ? closes[closes.length - 2]
      : typeof meta?.previousClose === "number"
        ? meta.previousClose
        : typeof meta?.chartPreviousClose === "number"
          ? meta.chartPreviousClose
          : undefined;
    const onceki = oncekiKapanisAdayi;
    const gunlukDegisim = fiyat !== undefined && onceki !== undefined && onceki > 0 ? ((fiyat - onceki) / onceki) * 100 : undefined;

    return {
      kod,
      ad,
      fiyat,
      gunlukDegisim,
      performans1H: performansHesapla(closes, 5),
      performans1A: performansHesapla(closes, 21),
      performans3A: performansHesapla(closes, 63),
      performans1Y: performansHesapla(closes, 252),
    };
  } catch {
    return null;
  }
}

async function piyasaKiyasBaglamiCek(sektor?: string, endustri?: string): Promise<PiyasaKiyasBaglami> {
  const sektorEndeksi = sektorEndeksiEsle(sektor, endustri);
  const [xu100, xu030, sektorItem] = await Promise.all([
    endeksVerisiCek("XU100.IS", "BIST 100"),
    endeksVerisiCek("XU030.IS", "BIST 30"),
    sektorEndeksi ? endeksVerisiCek(sektorEndeksi.kod, sektorEndeksi.ad) : Promise.resolve(null),
  ]);

  return {
    xu100: xu100 ?? undefined,
    xu030: xu030 ?? undefined,
    sektorEndeksi: sektorItem ?? undefined,
    sektorEndeksKodu: sektorEndeksi?.kod,
    sektorEndeksAdi: sektorEndeksi?.ad,
  };
}

const GENEL_PIYASA_ENDEKSLERI = [
  { kod: "XU100.IS", ad: "BIST 100" },
  { kod: "XU030.IS", ad: "BIST 30" },
  { kod: "XBANK.IS", ad: "BIST Banka" },
  { kod: "XUSIN.IS", ad: "BIST Sınai" },
  { kod: "XUTEK.IS", ad: "BIST Teknoloji" },
  { kod: "XHOLD.IS", ad: "BIST Holding ve Yatırım" },
  { kod: "XULAS.IS", ad: "BIST Ulaştırma" },
  { kod: "XKMYA.IS", ad: "BIST Kimya Petrol Plastik" },
  { kod: "XGIDA.IS", ad: "BIST Gıda İçecek" },
  { kod: "XTCRT.IS", ad: "BIST Ticaret" },
];

async function genelPiyasaBaglamiCek(): Promise<GenelPiyasaBaglami> {
  const tickers = BIST_HISSELER
    .filter((h) => h.listed !== false && h.priceAvailable !== false)
    .map((h) => `BIST:${h.ticker}`);
  const chunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += 180) chunks.push(tickers.slice(i, i + 180));

  const endeksPromise = Promise.all(GENEL_PIYASA_ENDEKSLERI.map((item) => endeksVerisiCek(item.kod, item.ad)));
  const scannerPromises = Promise.all(chunks.map(async (chunk) => {
    try {
      const res = await fetch("https://scanner.tradingview.com/turkey/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: { tickers: chunk, query: { types: [] } },
          columns: ["name", "description", "sector", "close", "change", "volume", "relative_volume_10d_calc"],
        }),
        cache: "no-store",
      });
      if (!res.ok) return [] as Array<{ s?: string; d?: unknown[] }>;
      const data = await res.json();
      return (data?.data ?? []) as Array<{ s?: string; d?: unknown[] }>;
    } catch {
      return [] as Array<{ s?: string; d?: unknown[] }>;
    }
  }));
  const [endeksSonuclari, scannerSonuclari] = await Promise.all([endeksPromise, scannerPromises]);

  const hisseler = scannerSonuclari.flat().map((row): GenelPiyasaHisse | null => {
    const [name, description, sector, close, change, volume, relatifHacim] = row.d ?? [];
    const ticker = String(name || row.s?.split(":")[1] || "").replace("BIST:", "").toLocaleUpperCase("tr-TR");
    if (!ticker) return null;
    return {
      ticker,
      sirketAdi: typeof description === "string" ? description : undefined,
      sektor: typeof sector === "string" && sector.trim() ? sector : undefined,
      fiyat: finiteNumber(close),
      degisimYuzde: finiteNumber(change),
      hacim: finiteNumber(volume),
      relatifHacim: finiteNumber(relatifHacim),
    };
  }).filter((row): row is GenelPiyasaHisse => Boolean(row));

  const degisimli = hisseler.filter((h) => h.degisimYuzde !== undefined);
  const yukselenSayisi = degisimli.filter((h) => (h.degisimYuzde ?? 0) > 0.05).length;
  const dusenSayisi = degisimli.filter((h) => (h.degisimYuzde ?? 0) < -0.05).length;
  const yataySayisi = degisimli.length - yukselenSayisi - dusenSayisi;
  const ortalamaDegisim = degisimli.length > 0
    ? degisimli.reduce((sum, h) => sum + (h.degisimYuzde ?? 0), 0) / degisimli.length
    : undefined;

  const endeksler = endeksSonuclari.filter((item): item is EndeksKiyasItem => item !== null);
  const anaEndeksKodlari = new Set(["XU100.IS", "XU030.IS"]);

  return {
    endeksler: endeksler.filter((item) => anaEndeksKodlari.has(item.kod)),
    sektorEndeksleri: endeksler.filter((item) => !anaEndeksKodlari.has(item.kod)),
    kapsam: tickers.length,
    veriSayisi: hisseler.length,
    yukselenSayisi,
    dusenSayisi,
    yataySayisi,
    ortalamaDegisim,
    enCokYukselenler: [...degisimli].sort((a, b) => (b.degisimYuzde ?? 0) - (a.degisimYuzde ?? 0)).slice(0, 8),
    enCokDusenler: [...degisimli].sort((a, b) => (a.degisimYuzde ?? 0) - (b.degisimYuzde ?? 0)).slice(0, 8),
    yuksekRelatifHacim: hisseler
      .filter((h) => h.relatifHacim !== undefined)
      .sort((a, b) => (b.relatifHacim ?? 0) - (a.relatifHacim ?? 0))
      .slice(0, 8),
  };
}

function alarmTaslagiCikar(text: string, aktifTicker?: string, veri?: HissePromptVeri | null): AlarmTaslak {
  const q = text.toLocaleLowerCase("tr-TR");
  const ticker = tickerAdaylari(text, aktifTicker)[0];
  const yuzdeMatch = text.match(/%?\s*(\d+(?:[.,]\d+)?)\s*%|yüzde\s+(\d+(?:[.,]\d+)?)/i);
  const paraMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:₺|tl|lira)\b/i);
  const rsiMatch = q.match(/rsi[^\d]*(\d+(?:[.,]\d+)?)/i);
  const hedefYuzde = sayiParse(yuzdeMatch?.[1] ?? yuzdeMatch?.[2]);
  const hedefDeger = sayiParse(paraMatch?.[1]);
  const rsiEsik = sayiParse(rsiMatch?.[1]);

  const yukari = /\b(üstüne|üzerine|geçerse|çıkarsa|yükselirse|artarsa|aşarsa|yukarı)\b/i.test(q);
  const asagi = /\b(altına|aşağı|düşerse|düşünce|inerse|azalırsa|kırarsa)\b/i.test(q);
  const kosul = yukari ? "yukari" : asagi ? "asagi" : undefined;
  const fiyat = typeof veri?.fiyat === "number" ? veri.fiyat : undefined;
  const cikarilmisKosul = kosul ?? (hedefDeger !== undefined && fiyat !== undefined ? (hedefDeger >= fiyat ? "yukari" : "asagi") : undefined);

  const gostergeMi = /\b(rsi|macd|ma50|ortalama|hacim)\b/i.test(q);
  const tip: AlarmTaslak["tip"] = gostergeMi
    ? "gosterge"
    : hedefYuzde !== undefined
      ? "fiyat_yuzde"
      : hedefDeger !== undefined
        ? "fiyat_seviye"
        : undefined;

  const gosterge_tipi = gostergeMi
    ? rsiMatch
      ? (cikarilmisKosul === "yukari" ? "rsi_yukari" : "rsi_asagi")
      : q.includes("macd")
        ? (cikarilmisKosul === "asagi" ? "macd_negatif" : "macd_pozitif")
        : q.includes("ma50") || q.includes("50")
          ? (cikarilmisKosul === "asagi" ? "ma50_asagi" : "ma50_yukari")
          : q.includes("hacim")
            ? "hacim_artis"
            : undefined
    : undefined;

  const eksikler: string[] = [];
  if (!ticker) eksikler.push("hisse kodu");
  if (!tip) eksikler.push("alarm tipi veya hedef");
  if (!cikarilmisKosul) eksikler.push("yön/koşul");
  if (tip === "fiyat_seviye" && hedefDeger === undefined) eksikler.push("hedef fiyat");
  if (tip === "fiyat_yuzde" && hedefYuzde === undefined) eksikler.push("hedef yüzde");
  if (tip === "gosterge" && !gosterge_tipi) eksikler.push("gösterge koşulu");
  if (tip === "gosterge" && gosterge_tipi?.startsWith("rsi") && rsiEsik === undefined) eksikler.push("RSI eşik değeri");

  const hedefMetni = tip === "fiyat_seviye"
    ? `${hedefDeger} ₺`
    : tip === "fiyat_yuzde"
      ? `%${hedefYuzde}`
      : gosterge_tipi
        ? `${gosterge_tipi}${rsiEsik !== undefined ? ` ${rsiEsik}` : ""}`
        : "hedef belirsiz";

  return {
    ticker,
    tip,
    kosul: cikarilmisKosul,
    hedef_deger: tip === "fiyat_seviye" ? hedefDeger : undefined,
    hedef_yuzde: tip === "fiyat_yuzde" ? hedefYuzde : undefined,
    gosterge_tipi,
    gosterge_esik: gosterge_tipi?.startsWith("rsi") ? rsiEsik : undefined,
    eksikler,
    ozet: `${ticker ?? "Hisse"} için ${hedefMetni} ${cikarilmisKosul === "yukari" ? "üstü/yukarı" : cikarilmisKosul === "asagi" ? "altı/aşağı" : "koşulu belirsiz"} alarmı`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function alarmPromptu(taslak: AlarmTaslak) {
  return `ALARM TASLAĞI:
- Ticker: ${taslak.ticker ?? "eksik"}
- Tip: ${taslak.tip ?? "eksik"}
- Koşul: ${taslak.kosul ?? "eksik"}
- Hedef fiyat: ${taslak.hedef_deger !== undefined ? `${taslak.hedef_deger} ₺` : "yok"}
- Hedef yüzde: ${taslak.hedef_yuzde !== undefined ? `%${taslak.hedef_yuzde}` : "yok"}
- Gösterge: ${taslak.gosterge_tipi ?? "yok"}
- Gösterge eşiği: ${taslak.gosterge_esik ?? "yok"}
- Eksikler: ${taslak.eksikler.length > 0 ? taslak.eksikler.join(", ") : "yok"}

ALARM YANIT KILAVUZU:
- Eksik bilgi varsa tek kısa soruyla tamamlat.
- Eksik yoksa "Şöyle bir alarm taslağı anladım" diye özetle ve kullanıcının onay vermesi gerektiğini söyle.
- Şu anda sohbet içinde otomatik alarm oluşturduğunu söyleme; yalnızca alarm kurulabilir taslak olarak anlat.
- Al/sat amacı ima etme; bunu takip ve bildirim aracı olarak konumlandır.`;
}

async function karsilastirmaVerisiCek(ticker: string): Promise<KarsilastirmaHisse | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta as YahooChartMeta | undefined;
    if (!meta) return null;

    const fiyat = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : undefined;
    const oncekiKapanis = typeof meta.chartPreviousClose === "number"
      ? meta.chartPreviousClose
      : typeof meta.previousClose === "number"
        ? meta.previousClose
        : undefined;
    const degisimYuzde = typeof meta.regularMarketChangePercent === "number"
      ? meta.regularMarketChangePercent
      : fiyat !== undefined && oncekiKapanis !== undefined && oncekiKapanis > 0
        ? ((fiyat - oncekiKapanis) / oncekiKapanis) * 100
        : undefined;
    const yillikYuksek = typeof meta.fiftyTwoWeekHigh === "number" ? meta.fiftyTwoWeekHigh : undefined;
    const yillikDusuk = typeof meta.fiftyTwoWeekLow === "number" ? meta.fiftyTwoWeekLow : undefined;
    const hafta52Konum = fiyat !== undefined && yillikYuksek !== undefined && yillikDusuk !== undefined && yillikYuksek > yillikDusuk
      ? ((fiyat - yillikDusuk) / (yillikYuksek - yillikDusuk)) * 100
      : undefined;

    return {
      ticker,
      fiyat,
      degisimYuzde,
      hacim: typeof meta.regularMarketVolume === "number" ? meta.regularMarketVolume : undefined,
      yillikYuksek,
      yillikDusuk,
      hafta52Konum,
    };
  } catch {
    return null;
  }
}

async function hisseVerisiCek(ticker: string): Promise<HissePromptVeri | null> {
  try {
    const [res1d, res5d] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=1d`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      }),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=5d`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      }),
    ]);
    if (!res1d.ok && !res5d.ok) return null;

    const data1d = res1d.ok ? await res1d.json() : null;
    const data5d = res5d.ok ? await res5d.json() : null;
    const meta1d = data1d?.chart?.result?.[0]?.meta as YahooChartMeta | undefined;
    const meta5d = data5d?.chart?.result?.[0]?.meta as YahooChartMeta | undefined;
    const meta = meta1d ?? meta5d;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;

    const oncekiKapanis = typeof meta1d?.chartPreviousClose === "number"
      ? meta1d.chartPreviousClose
      : typeof meta1d?.previousClose === "number"
        ? meta1d.previousClose
        : typeof meta5d?.chartPreviousClose === "number"
          ? meta5d.chartPreviousClose
          : typeof meta5d?.previousClose === "number"
            ? meta5d.previousClose
            : undefined;

    const degisimYuzde = typeof meta1d?.regularMarketChangePercent === "number"
      ? meta1d.regularMarketChangePercent
      : oncekiKapanis && oncekiKapanis > 0
        ? ((meta.regularMarketPrice - oncekiKapanis) / oncekiKapanis) * 100
        : typeof meta5d?.regularMarketChangePercent === "number"
          ? meta5d.regularMarketChangePercent
          : undefined;

    return {
      fiyat: meta.regularMarketPrice,
      oncekiKapanis,
      degisimYuzde,
      gunlukYuksek: typeof meta1d?.regularMarketDayHigh === "number" ? meta1d.regularMarketDayHigh : meta5d?.regularMarketDayHigh,
      gunlukDusuk: typeof meta1d?.regularMarketDayLow === "number" ? meta1d.regularMarketDayLow : meta5d?.regularMarketDayLow,
      yillikYuksek: typeof meta5d?.fiftyTwoWeekHigh === "number" ? meta5d.fiftyTwoWeekHigh : meta.fiftyTwoWeekHigh,
      yillikDusuk: typeof meta5d?.fiftyTwoWeekLow === "number" ? meta5d.fiftyTwoWeekLow : meta.fiftyTwoWeekLow,
      hacim: typeof meta1d?.regularMarketVolume === "number" ? meta1d.regularMarketVolume : meta5d?.regularMarketVolume,
      sirketAdi: meta.longName || meta.shortName,
    };
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function karsilastirmaPromptu(tickers: string[]) {
  if (tickers.length < 2) {
    return tickers.length === 1
      ? `KARŞILAŞTIRMA BAĞLAMI:
- Yalnızca ${tickers[0]} tespit edildi. Karşılaştırma için ikinci hisse eksikse kullanıcıdan netleştirme iste.`
      : "";
  }

  const [verilerRaw, teknikBilgileri] = await Promise.all([
    Promise.all(tickers.map(karsilastirmaVerisiCek)),
    tradingViewTeknikMetrikleriCek(tickers),
  ]);
  const verilerBaz = verilerRaw.filter(Boolean) as KarsilastirmaHisse[];
  const temettuBilgileri = await temettuGecmisleriCek(
    verilerBaz.map((h) => h.ticker),
    Object.fromEntries(verilerBaz.map((h) => [h.ticker, h.fiyat]))
  );
  const sektorEndeksleri = await Promise.all(
    verilerBaz.map(async (h) => {
      const teknik = teknikBilgileri[h.ticker]?.teknik;
      return [h.ticker, await piyasaKiyasBaglamiCek(teknik?.sektor, teknik?.endustri)] as const;
    })
  );
  const piyasaKiyaslari = Object.fromEntries(sektorEndeksleri);
  const veriler = verilerBaz.map((h) => ({
    ...h,
    sektor: teknikBilgileri[h.ticker]?.sektor,
    endustri: teknikBilgileri[h.ticker]?.endustri,
    teknik: teknikBilgileri[h.ticker]?.teknik,
    temel: teknikBilgileri[h.ticker]?.temel,
    temettu: temettuBilgileri[h.ticker],
    piyasaKiyas: piyasaKiyaslari[h.ticker],
  }));
  if (veriler.length === 0) {
    return `KARŞILAŞTIRMA BAĞLAMI:
- Kullanıcının kıyaslamak istediği hisseler: ${tickers.join(", ")}
- Güncel karşılaştırma verisi alınamadı. Veri eksikliğini açıkça belirt.`;
  }

  const satirlar = veriler.map((h) => {
    const fiyat = tlFormatla(h.fiyat);
    const degisim = yuzdeFormatla(h.degisimYuzde);
    const konum52 = h.hafta52Konum !== undefined ? `%${h.hafta52Konum.toFixed(0)}` : "veri yok";
    const hacim = h.hacim !== undefined && h.hacim > 0 ? h.hacim.toLocaleString("tr-TR") : "veri yok";
    const sektor = h.sektor ? `${h.sektor}${h.endustri ? ` / ${h.endustri}` : ""}` : "veri yok";
    const momentumPuan = h.degisimYuzde === undefined ? 50 : Math.max(0, Math.min(100, 50 + h.degisimYuzde * 8));
    const konumPuan = h.hafta52Konum === undefined ? 50 : h.hafta52Konum >= 80 ? 65 : h.hafta52Konum <= 20 ? 45 : 55;
    const likiditePuan = h.hacim === undefined ? 50 : Math.max(35, Math.min(85, Math.log10(Math.max(h.hacim, 1)) * 10));
    const karsilastirmaPuani = Math.round(momentumPuan * 0.45 + konumPuan * 0.25 + likiditePuan * 0.30);
    const teknik = h.teknik;
    const temel = h.temel;
    const macd = teknik?.macdHistogram !== undefined ? `MACD hist ${sayiFormatla(teknik.macdHistogram, 3)}` : "MACD veri yok";
    const ortalama = teknik?.ema50 !== undefined ? `EMA50 uzaklık ${teknikYuzde(ortalamaUzaklik(h.fiyat, teknik.ema50))}` : "EMA50 veri yok";
    const performans = `1H ${teknikYuzde(teknik?.performans1H)} | 1A ${teknikYuzde(teknik?.performans1A)} | 3A ${teknikYuzde(teknik?.performans3A)} | 1Y ${teknikYuzde(teknik?.performans1Y)}`;
    const degerleme = `F/K ${sayiFormatla(temel?.fk) ?? "veri yok"} | PD/DD ${sayiFormatla(temel?.pddd) ?? "veri yok"} | FD/FAVÖK ${sayiFormatla(temel?.fdFavok) ?? "veri yok"}`;
    const karlilik = `net marj ${teknikYuzde(temel?.netMarj)} | ROE ${teknikYuzde(temel?.ozkaynakKarlilik)}`;
    const payYapisi = `halka açıklık ${teknikYuzde(temel?.halkaAciklikOrani)} | halka açık pay ${sayiFormatla(temel?.halkaAcikPay, 0) ?? "veri yok"} | yabancı takas veri yok`;
    const temettu = h.temettu;
    const temettuSatiri = temettu
      ? `son ödeme ${temettu.sonOdeme ? `${temettu.sonOdeme.tarih} ${tlFormatla(temettu.sonOdeme.tutar) ?? temettu.sonOdeme.tutar} ₺` : "yok"} | son 12 ay ${tlFormatla(temettu.son12AyToplam) ?? "veri yok"} ₺ | yaklaşık verim ${teknikYuzde(temettu.yaklasikSon12AyVerim)} | 5Y ödeme ${temettu.odemeSayisi5Yil}`
      : "veri yok";
    const piyasa = (h as KarsilastirmaHisse & { piyasaKiyas?: PiyasaKiyasBaglami }).piyasaKiyas;
    const goreli = piyasa ? `${goreliPerformansSatiri(teknik?.performans1A, piyasa.xu100, "XU100")} | ${goreliPerformansSatiri(teknik?.performans1A, piyasa.sektorEndeksi, "sektör")}` : "veri yok";
    return `- ${h.ticker}: sektör ${sektor} | fiyat ${fiyat ? `${fiyat} ₺` : "veri yok"} | günlük ${degisim ?? "veri yok"} | 52H konum ${konum52} | hacim ${hacim} | RSI ${sayiFormatla(teknik?.rsi) ?? "veri yok"} | ${macd} | ${ortalama} | performans ${performans} | değerleme ${degerleme} | kârlılık ${karlilik} | pay yapısı ${payYapisi} | temettü ${temettuSatiri} | göreli ${goreli} | metrik skoru ${karsilastirmaPuani}/100`;
  }).join("\n");

  return `KARŞILAŞTIRMA BAĞLAMI:
${satirlar}

KARŞILAŞTIRMA KILAVUZU:
- Bu veriler fiyat, günlük momentum, hacim, 52 hafta konumu ve teknik göstergeler içerir; bilanço ve haber/KAP analizi değildir.
- Yanıtta "net kazanan" ilan etme. Hangi metrikte hangi hissenin öne çıktığını belirt.
- Teknik metriklerde RSI, MACD, EMA/SMA, Bollinger, ATR, beta, performans, piyasa değeri, ortalama hacim ve pivot verisi varsa kullan.
- Temel metriklerde F/K, PD/DD, PD/Satış, FD/FAVÖK, gelir, net kâr, FAVÖK, marjlar, borç/özkaynak ve temettü verimi varsa kullan.
- Takas/yabancı sorusunda gerçek yabancı takas veya kurum dağılımı verisi yoksa bunu söyle; halka açıklık/pay yapısı verisini yabancı takas gibi sunma.
- Temettü geçmişinde son ödeme, son 12 ay toplamı, yaklaşık verim ve ödeme sürekliliği varsa kullan; temettüyü garanti gelir gibi sunma.
- Endeks/sektör kıyasında XU100, XU030 ve varsa sektör endeksiyle göreli performansı belirt.
- Metrik skoru yalnızca bu sınırlı verilerden türetilmiş yardımcı sıralamadır; yatırım kararı veya kalite puanı değildir.
- Kıyaslamayı kısa bir tablo mantığıyla yap: momentum, orta vadeli konum, likidite/veri kalitesi, risk.`;
}

function teknikTaramaIstegiCikar(text: string): TeknikTaramaIstegi | null {
  const q = text.toLocaleLowerCase("tr-TR");
  const taramaDili = /\b(hisseler|hisse|olan|olanlar|neler|liste|tara|tarama|bul|göster|goster|aday)\b/.test(q);

  if (/\brsi\b/.test(q)) {
    const esikMatch = q.match(/rsi[^0-9]{0,20}(\d{1,2}(?:[,.]\d+)?)/) ?? q.match(/(\d{1,2}(?:[,.]\d+)?)[^0-9]{0,20}rsi/);
    const esik = esikMatch ? sayiParse(esikMatch[1]) : 30;
    if (esik === undefined || esik <= 0 || esik >= 100) return null;

    const asagi = /\b(alt[ıi]nda|alt[ıi]na|aşağ[ıi]|asagi|düşen|dusen|küçük|kucuk|az|<)\b/.test(q);
    const yukari = /\b(üstünde|ustunde|üzerinde|uzerinde|yukar[ıi]|büyük|buyuk|fazla|>)\b/.test(q);

    if (!taramaDili && !asagi && !yukari) return null;
    return { tip: "rsi", gosterge: "RSI", kosul: yukari && !asagi ? "yukari" : "asagi", esik };
  }

  if (!taramaDili) return null;

  const yuzdeMatch = q.match(/%?\s*(\d{1,2}(?:[,.]\d+)?)\s*%|yüzde\s+(\d{1,2}(?:[,.]\d+)?)/i);
  const yuzdeEsik = sayiParse(yuzdeMatch?.[1] ?? yuzdeMatch?.[2]);

  if (/\b(hacim|hacmi|hacimli|volume|anomal)\b/.test(q) && /\b(artan|artış|artis|yüksek|yuksek|fazla|patlayan|sıçrayan|sicrayan)\b/.test(q)) {
    return { tip: "hacim_artis", kosul: "yukari", esik: yuzdeEsik ?? 1.5 };
  }

  if (/\bmacd\b/.test(q) && /\b(pozitif|signal|sinyal|kesen|üstünde|ustunde|yukar[ıi]|histogram)\b/.test(q)) {
    return { tip: "macd_pozitif", kosul: "yukari", esik: 0 };
  }

  if (/\b(ema|ortalama|trend)\b/.test(q) && /\b(20|50|200|dizilim|sıralı|sirali|üstünde|ustunde|trend)\b/.test(q)) {
    const dusus = /\b(ayı|ayi|negatif|düşüş|dusus|ters|zayıf|zayif)\b/.test(q);
    return { tip: "ema_trend", kosul: dusus ? "asagi" : "yukari", esik: 0 };
  }

  if (/\b(bollinger|band)\b/.test(q) && /\b(alt|üst|ust|yakın|yakin|dib|tepe|sıkış|sikis)\b/.test(q)) {
    const yukari = /\b(üst|ust|tepe|zirve)\b/.test(q);
    return { tip: "bollinger_yakin", kosul: yukari ? "yukari" : "asagi", esik: yuzdeEsik ?? 15 };
  }

  if (/\b(hacim|relatif|volume)\b/.test(q) && /\b(kırılım|kirilim|breakout|fiyat|yükseliş|yukselis|trend|ivme)\b/.test(q)) {
    return { tip: "hacim_kirilim", kosul: "yukari", esik: yuzdeEsik ?? 1.5 };
  }

  if (/\b(atr|volatil\w*|oynak|volatilite)\b/.test(q) && /\b(yüksek|yuksek|fazla|hareketli|sert)\b/.test(q)) {
    return { tip: "volatilite_yuksek", kosul: "yukari", esik: yuzdeEsik ?? 5 };
  }

  if (/\b(52|elli iki)\b/.test(q) && /\b(dip|dibe|düşük|dusuk|alt|yakın|yakin|zirve|yüksek|yuksek|tepe)\b/.test(q)) {
    const yukari = /\b(zirve|yüksek|yuksek|tepe|üst|ust)\b/.test(q);
    return { tip: "hafta52_yakin", kosul: yukari ? "yukari" : "asagi", esik: yuzdeEsik ?? 10 };
  }

  if (/\b(momentum|güçlenen|guclenen|toparlanan|ivme)\b/.test(q)) {
    return { tip: "momentum_guclenen", kosul: "yukari", esik: yuzdeEsik ?? 2 };
  }

  if (/\b(günlük|gunluk|bugün|bugun)\b/.test(q) && /\b(düşen|dusen|düştü|dustu|yükselen|yukselen|artan|çıkan|cikan)\b/.test(q)) {
    const yukari = /\b(yükselen|yukselen|artan|çıkan|cikan)\b/.test(q);
    return { tip: "gunluk_hareket", kosul: yukari ? "yukari" : "asagi", esik: yuzdeEsik ?? 3 };
  }

  return null;
}

async function rsiTaramasiCek(istek: TeknikTaramaIstegi): Promise<{
  sonuclar: TeknikTaramaHisse[];
  kapsam: number;
  veriSayisi: number;
}> {
  const tickers = BIST_HISSELER
    .filter((h) => h.listed !== false && h.priceAvailable !== false)
    .map((h) => `BIST:${h.ticker}`);
  const chunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += 180) chunks.push(tickers.slice(i, i + 180));

  const rows: Array<{ s?: string; d?: unknown[] }> = [];
  for (const chunk of chunks) {
    try {
      const res = await fetch("https://scanner.tradingview.com/turkey/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: { tickers: chunk, query: { types: [] } },
          columns: TRADINGVIEW_TEKNIK_KOLONLARI,
        }),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = await res.json();
      rows.push(...((data?.data ?? []) as Array<{ s?: string; d?: unknown[] }>));
    } catch {
      continue;
    }
  }

  const sonuclar = rows
    .map((row): TeknikTaramaHisse | null => {
      const parsed = tradingViewTeknikSatirCoz(row);
      if (!parsed) return null;
      const { ticker, sirketAdi, fiyat, degisimYuzde, sektor, endustri, teknik } = parsed;
      const yillikYuksek = teknik.yillikYuksek;
      const yillikDusuk = teknik.yillikDusuk;
      const hafta52Konum = fiyat !== undefined && yillikYuksek !== undefined && yillikDusuk !== undefined && yillikYuksek > yillikDusuk
        ? ((fiyat - yillikDusuk) / (yillikYuksek - yillikDusuk)) * 100
        : undefined;

      return {
        ticker,
        sirketAdi,
        sektor,
        endustri,
        fiyat,
        degisimYuzde,
        rsi: teknik.rsi,
        hacim: teknik.hacim,
        relatifHacim: teknik.relatifHacim10G,
        hafta52Konum,
        teknik,
      };
    })
    .filter((row): row is TeknikTaramaHisse => {
      if (!row) return false;
      if (istek.tip === "rsi") {
        if (row.rsi === undefined) return false;
        return istek.kosul === "asagi" ? row.rsi < istek.esik : row.rsi > istek.esik;
      }
      if (istek.tip === "hacim_artis") return (row.relatifHacim ?? 0) >= istek.esik;
      if (istek.tip === "hafta52_yakin") {
        if (row.hafta52Konum === undefined) return false;
        return istek.kosul === "asagi" ? row.hafta52Konum <= istek.esik : row.hafta52Konum >= 100 - istek.esik;
      }
      if (istek.tip === "gunluk_hareket") {
        if (row.degisimYuzde === undefined) return false;
        return istek.kosul === "asagi" ? row.degisimYuzde <= -istek.esik : row.degisimYuzde >= istek.esik;
      }
      if (istek.tip === "macd_pozitif") {
        const t = row.teknik;
        return (t?.macdHistogram ?? -Infinity) > 0 && (t?.macd ?? -Infinity) > (t?.macdSignal ?? Infinity);
      }
      if (istek.tip === "ema_trend") {
        const t = row.teknik;
        if (row.fiyat === undefined || t?.ema20 === undefined || t.ema50 === undefined || t.ema200 === undefined) return false;
        return istek.kosul === "asagi"
          ? row.fiyat < t.ema20 && t.ema20 < t.ema50 && t.ema50 < t.ema200
          : row.fiyat > t.ema20 && t.ema20 > t.ema50 && t.ema50 > t.ema200;
      }
      if (istek.tip === "bollinger_yakin") {
        const t = row.teknik;
        if (row.fiyat === undefined || t?.bollingerAlt === undefined || t.bollingerUst === undefined || t.bollingerUst <= t.bollingerAlt) return false;
        const konum = ((row.fiyat - t.bollingerAlt) / (t.bollingerUst - t.bollingerAlt)) * 100;
        return istek.kosul === "asagi" ? konum <= istek.esik : konum >= 100 - istek.esik;
      }
      if (istek.tip === "hacim_kirilim") {
        return (row.relatifHacim ?? 0) >= istek.esik
          && (row.degisimYuzde ?? 0) > 0
          && row.fiyat !== undefined
          && row.teknik?.ema20 !== undefined
          && row.fiyat > row.teknik.ema20;
      }
      if (istek.tip === "volatilite_yuksek") {
        const atrYuzde = row.fiyat !== undefined && row.fiyat > 0 && row.teknik?.atr !== undefined
          ? (row.teknik.atr / row.fiyat) * 100
          : undefined;
        return (row.teknik?.volatiliteGunluk ?? 0) >= istek.esik || (atrYuzde ?? 0) >= istek.esik;
      }
      return (row.degisimYuzde ?? 0) >= istek.esik && (row.rsi ?? 0) >= 50 && (row.rsi ?? 100) <= 70 && (row.relatifHacim ?? 0) >= 1.2;
    })
    .sort((a, b) => {
      if (istek.tip === "rsi") return istek.kosul === "asagi" ? (a.rsi ?? 100) - (b.rsi ?? 100) : (b.rsi ?? 0) - (a.rsi ?? 0);
      if (istek.tip === "hacim_artis") return (b.relatifHacim ?? 0) - (a.relatifHacim ?? 0);
      if (istek.tip === "hafta52_yakin") return istek.kosul === "asagi" ? (a.hafta52Konum ?? 100) - (b.hafta52Konum ?? 100) : (b.hafta52Konum ?? 0) - (a.hafta52Konum ?? 0);
      if (istek.tip === "macd_pozitif") return (b.teknik?.macdHistogram ?? 0) - (a.teknik?.macdHistogram ?? 0);
      if (istek.tip === "ema_trend") return istek.kosul === "asagi"
        ? (ortalamaUzaklik(a.fiyat, a.teknik?.ema20) ?? 0) - (ortalamaUzaklik(b.fiyat, b.teknik?.ema20) ?? 0)
        : (ortalamaUzaklik(b.fiyat, b.teknik?.ema20) ?? 0) - (ortalamaUzaklik(a.fiyat, a.teknik?.ema20) ?? 0);
      if (istek.tip === "bollinger_yakin") return istek.kosul === "asagi"
        ? (a.rsi ?? 100) - (b.rsi ?? 100)
        : (b.rsi ?? 0) - (a.rsi ?? 0);
      if (istek.tip === "hacim_kirilim") return (b.relatifHacim ?? 0) - (a.relatifHacim ?? 0);
      if (istek.tip === "volatilite_yuksek") return (b.teknik?.volatiliteGunluk ?? 0) - (a.teknik?.volatiliteGunluk ?? 0);
      return istek.kosul === "asagi" ? (a.degisimYuzde ?? 0) - (b.degisimYuzde ?? 0) : (b.degisimYuzde ?? 0) - (a.degisimYuzde ?? 0);
    });

  return { sonuclar, kapsam: tickers.length, veriSayisi: rows.length };
}

function teknikTaramaBasligi(istek: TeknikTaramaIstegi) {
  if (istek.tip === "rsi") return `RSI(14) ${istek.kosul === "asagi" ? "<" : ">"} ${istek.esik}`;
  if (istek.tip === "hacim_artis") return `relatif hacim >= ${istek.esik.toLocaleString("tr-TR")}x`;
  if (istek.tip === "hafta52_yakin") return istek.kosul === "asagi"
    ? `52 hafta dibine en fazla %${istek.esik} uzak`
    : `52 hafta zirvesine en fazla %${istek.esik} uzak`;
  if (istek.tip === "gunluk_hareket") return istek.kosul === "asagi"
    ? `günlük değişim <= -%${istek.esik}`
    : `günlük değişim >= +%${istek.esik}`;
  if (istek.tip === "macd_pozitif") return "MACD çizgisi signal üstünde ve histogram pozitif";
  if (istek.tip === "ema_trend") return istek.kosul === "asagi"
    ? "negatif EMA trend dizilimi: fiyat < EMA20 < EMA50 < EMA200"
    : "pozitif EMA trend dizilimi: fiyat > EMA20 > EMA50 > EMA200";
  if (istek.tip === "bollinger_yakin") return istek.kosul === "asagi"
    ? `Bollinger alt bandına en yakın %${istek.esik} bölge`
    : `Bollinger üst bandına en yakın %${istek.esik} bölge`;
  if (istek.tip === "hacim_kirilim") return `hacim destekli pozitif kırılım: relatif hacim >= ${istek.esik.toLocaleString("tr-TR")}x, fiyat EMA20 üstü`;
  if (istek.tip === "volatilite_yuksek") return `yüksek volatilite: günlük volatilite veya ATR/fiyat >= %${istek.esik}`;
  return `momentumu güçlenen: günlük >= +%${istek.esik}, RSI 50-70, relatif hacim >= 1.2x`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function teknikTaramaPromptu(text: string) {
  const istek = teknikTaramaIstegiCikar(text);
  if (!istek) return "";

  const { sonuclar, kapsam, veriSayisi } = await rsiTaramasiCek(istek);
  const liste = sonuclar.slice(0, 20).map((h) => {
    const fiyat = tlFormatla(h.fiyat);
    const degisim = yuzdeFormatla(h.degisimYuzde);
    const rsi = h.rsi !== undefined ? h.rsi.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "veri yok";
    const relatifHacim = h.relatifHacim !== undefined ? `${h.relatifHacim.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}x` : "veri yok";
    const konum52 = h.hafta52Konum !== undefined ? `%${h.hafta52Konum.toFixed(0)}` : "veri yok";
    const sektor = h.sektor ? `${h.sektor}${h.endustri ? ` / ${h.endustri}` : ""}` : "veri yok";
    const teknik = h.teknik;
    const ema20Uzaklik = teknikYuzde(ortalamaUzaklik(h.fiyat, teknik?.ema20));
    const ema50Uzaklik = teknikYuzde(ortalamaUzaklik(h.fiyat, teknik?.ema50));
    const bollingerKonum = h.fiyat !== undefined && teknik?.bollingerAlt !== undefined && teknik.bollingerUst !== undefined && teknik.bollingerUst > teknik.bollingerAlt
      ? `%${(((h.fiyat - teknik.bollingerAlt) / (teknik.bollingerUst - teknik.bollingerAlt)) * 100).toFixed(0)}`
      : "veri yok";
    return `- ${h.ticker}: sektör ${sektor} | fiyat ${fiyat ? `${fiyat} ₺` : "veri yok"} | günlük ${degisim ?? "veri yok"} | RSI ${rsi} | MACD hist ${sayiFormatla(teknik?.macdHistogram, 3) ?? "veri yok"} | EMA20 uzaklık ${ema20Uzaklik} | EMA50 uzaklık ${ema50Uzaklik} | Bollinger konum ${bollingerKonum} | ATR ${sayiFormatla(teknik?.atr) ?? "veri yok"} | beta ${sayiFormatla(teknik?.beta1Yil) ?? "veri yok"} | relatif hacim ${relatifHacim} | 52H konum ${konum52}`;
  }).join("\n");

  return `TEKNİK TARAMA BAĞLAMI:
- Tarama: ${teknikTaramaBasligi(istek)}
- Kapsam: ${kapsam} BIST hissesi denendi; ${veriSayisi} hisseden teknik veri döndü.
- Eşik koşulunu sağlayan hisse sayısı: ${sonuclar.length}
${liste || "- Bu koşulu sağlayan hisse bulunamadı."}

TEKNİK TARAMA KILAVUZU:
- Kullanıcı liste istiyorsa yukarıdaki tarama sonucunu ver; "BIST'i tarayamıyorum" veya "bu listeyi veremem" deme.
- RSI < 30 genellikle aşırı satım bölgesini gösterir; tek başına alım sinyali değildir.
- RSI > 70 genellikle aşırı alım bölgesini gösterir; tek başına satış sinyali değildir.
- Relatif hacim artışı ilgi artışını gösterebilir ama tek başına yön sinyali değildir.
- MACD pozitif kesişim, EMA trend dizilimi, Bollinger bandı yakınlığı, hacim destekli kırılım ve yüksek volatilite taramaları yardımcı teknik bağlamdır; tek başına al/sat sinyali değildir.
- MACD, EMA/SMA, Bollinger, ATR, beta, performans, piyasa değeri, ortalama hacim ve pivotlar yardımcı teknik bağlamdır; tek başına al/sat sinyali değildir.
- 52 hafta dibine/zirvesine yakınlık destek, direnç veya trend bağlamı gerektirir.
- Fiyat ve teknik veriler gecikmeli olabilir; kesin al/sat önerisi verme.`;
}

function teknikMetrikOzeti(fiyat?: number, teknik?: TeknikMetrikler) {
  if (!teknik) {
    return `TEKNİK METRİKLER:
- TradingView teknik metrikleri: veri yok`;
  }

  const ema20Uzaklik = teknikYuzde(ortalamaUzaklik(fiyat, teknik.ema20));
  const ema50Uzaklik = teknikYuzde(ortalamaUzaklik(fiyat, teknik.ema50));
  const ema200Uzaklik = teknikYuzde(ortalamaUzaklik(fiyat, teknik.ema200));
  const bollingerKonum = fiyat !== undefined && teknik.bollingerAlt !== undefined && teknik.bollingerUst !== undefined && teknik.bollingerUst > teknik.bollingerAlt
    ? `%${(((fiyat - teknik.bollingerAlt) / (teknik.bollingerUst - teknik.bollingerAlt)) * 100).toFixed(0)}`
    : "veri yok";

  return `TEKNİK METRİKLER:
- RSI: ${sayiFormatla(teknik.rsi) ?? "veri yok"}
- MACD: ${sayiFormatla(teknik.macd, 3) ?? "veri yok"} | signal ${sayiFormatla(teknik.macdSignal, 3) ?? "veri yok"} | histogram ${sayiFormatla(teknik.macdHistogram, 3) ?? "veri yok"}
- EMA20/50/200: ${tlFormatla(teknik.ema20) ?? "veri yok"} / ${tlFormatla(teknik.ema50) ?? "veri yok"} / ${tlFormatla(teknik.ema200) ?? "veri yok"}
- SMA20/50/200: ${tlFormatla(teknik.sma20) ?? "veri yok"} / ${tlFormatla(teknik.sma50) ?? "veri yok"} / ${tlFormatla(teknik.sma200) ?? "veri yok"}
- Ortalamalara uzaklık: EMA20 ${ema20Uzaklik} | EMA50 ${ema50Uzaklik} | EMA200 ${ema200Uzaklik}
- Bollinger: alt ${tlFormatla(teknik.bollingerAlt) ?? "veri yok"} | üst ${tlFormatla(teknik.bollingerUst) ?? "veri yok"} | bant konumu ${bollingerKonum}
- ATR: ${sayiFormatla(teknik.atr) ?? "veri yok"} | günlük volatilite: ${teknikYuzde(teknik.volatiliteGunluk)} | beta 1Y: ${sayiFormatla(teknik.beta1Yil) ?? "veri yok"}
- Performans: 1H ${teknikYuzde(teknik.performans1H)} | 1A ${teknikYuzde(teknik.performans1A)} | 3A ${teknikYuzde(teknik.performans3A)} | 1Y ${teknikYuzde(teknik.performans1Y)}
- Hacim: ${sayiFormatla(teknik.hacim, 0) ?? "veri yok"} | 10G ort. ${sayiFormatla(teknik.ortalamaHacim10G, 0) ?? "veri yok"} | 30G ort. ${sayiFormatla(teknik.ortalamaHacim30G, 0) ?? "veri yok"} | relatif 10G ${sayiFormatla(teknik.relatifHacim10G) ?? "veri yok"}x
- Piyasa değeri: ${sayiFormatla(teknik.piyasaDegeri, 0) ?? "veri yok"} ₺
- Pivotlar: S1 ${tlFormatla(teknik.pivotS1) ?? "veri yok"} | Pivot ${tlFormatla(teknik.pivotOrta) ?? "veri yok"} | R1 ${tlFormatla(teknik.pivotR1) ?? "veri yok"}`;
}

function temelMetrikOzeti(temel?: TemelMetrikler) {
  if (!temel) {
    return `TEMEL ANALİZ METRİKLERİ:
- TradingView temel metrikleri: veri yok`;
  }

  return `TEMEL ANALİZ METRİKLERİ:
- Değerleme: F/K ${sayiFormatla(temel.fk) ?? "veri yok"} | PD/DD ${sayiFormatla(temel.pddd) ?? "veri yok"} | PD/Satış ${sayiFormatla(temel.pdSatis) ?? "veri yok"} | FD/FAVÖK ${sayiFormatla(temel.fdFavok) ?? "veri yok"}
- Büyüklük: piyasa/firma değeri ${sayiFormatla(temel.firmaDegeri, 0) ?? "veri yok"} ₺ firma değeri
- Gelir/kâr: gelir ${sayiFormatla(temel.gelir, 0) ?? "veri yok"} ₺ | brüt kâr ${sayiFormatla(temel.brutKar, 0) ?? "veri yok"} ₺ | net kâr ${sayiFormatla(temel.netKar, 0) ?? "veri yok"} ₺ | FAVÖK ${sayiFormatla(temel.favok, 0) ?? "veri yok"} ₺
- Marjlar: brüt ${teknikYuzde(temel.brutMarj)} | faaliyet ${teknikYuzde(temel.faaliyetMarji)} | net ${teknikYuzde(temel.netMarj)}
- Karlılık: ROA ${teknikYuzde(temel.aktifKarlilik)} | ROE ${teknikYuzde(temel.ozkaynakKarlilik)}
- Bilanço: varlık ${sayiFormatla(temel.toplamVarlik, 0) ?? "veri yok"} ₺ | yükümlülük ${sayiFormatla(temel.toplamYukumluluk, 0) ?? "veri yok"} ₺ | özkaynak ${sayiFormatla(temel.ozkaynak, 0) ?? "veri yok"} ₺
- Borç/nakit: toplam borç ${sayiFormatla(temel.toplamBorc, 0) ?? "veri yok"} ₺ | nakit/benzeri ${sayiFormatla(temel.nakitBenzerleri, 0) ?? "veri yok"} ₺ | borç/özkaynak ${sayiFormatla(temel.borcOzkaynak) ?? "veri yok"}
- Hisse başı defter değeri: ${tlFormatla(temel.hisseBasinaDefterDegeri) ?? "veri yok"} ₺
- Temettü: güncel verim ${teknikYuzde(temel.temettuVerimi)} | son verim ${teknikYuzde(temel.sonTemettuVerimi)} | ödeme oranı ${teknikYuzde(temel.temettuOdemeOrani)}`;
}

function takasYabanciKapsamiOzeti(temel?: TemelMetrikler) {
  return `TAKAS/YABANCI VERİ KAPSAMI:
- Gerçek MKK/takas saklama dağılımı: veri yok
- Yabancı takas oranı ve günlük/haftalık değişimi: veri yok
- Erişilebilen pay yapısı: halka açık pay ${sayiFormatla(temel?.halkaAcikPay, 0) ?? "veri yok"} | toplam pay ${sayiFormatla(temel?.toplamPay, 0) ?? "veri yok"} | yaklaşık halka açıklık ${teknikYuzde(temel?.halkaAciklikOrani)}
- Halka açık piyasa değeri: ${sayiFormatla(temel?.halkaAcikPiyasaDegeri, 0) ?? "veri yok"} ${temel?.paraBirimi ?? "₺"}
- Hissedar sayısı: ${sayiFormatla(temel?.hissedarSayisi, 0) ?? "veri yok"}
- Yorum kuralı: Bu alanlar yabancı takası veya kurum dağılımı değildir; yabancı alımı/satımı varmış gibi konuşma. Sadece halka açıklık, likidite ve pay yapısı bağlamı olarak kullan.`;
}

function temettuGecmisiOzeti(temettu?: TemettuGecmisi | null) {
  if (!temettu) {
    return `TEMETTÜ GEÇMİŞİ:
- Yahoo temettü geçmişi: veri yok`;
  }

  const sonOdemeler = temettu.odemeler.slice(0, 5).map((d) => `- ${d.tarih}: ${tlFormatla(d.tutar) ?? d.tutar} ₺`).join("\n");
  return `TEMETTÜ GEÇMİŞİ:
- Son ödeme: ${temettu.sonOdeme ? `${temettu.sonOdeme.tarih} | ${tlFormatla(temettu.sonOdeme.tutar) ?? temettu.sonOdeme.tutar} ₺` : "yok"}
- Son 12 ay toplam temettü: ${tlFormatla(temettu.son12AyToplam) ?? "veri yok"} ₺
- Son takvim yılı toplamı: ${tlFormatla(temettu.sonYilToplam) ?? "veri yok"} ₺
- Yaklaşık son 12 ay temettü verimi: ${teknikYuzde(temettu.yaklasikSon12AyVerim)}
- 5 yıldaki ödeme sayısı: ${temettu.odemeSayisi5Yil}
- Son ödemeler:
${sonOdemeler || "- Ödeme bulunamadı."}
- Temettü yorumu yaparken geçmiş ödemenin gelecekte garanti olmadığını belirt; verimi fiyat ve kârlılıkla birlikte değerlendir.`;
}

function endeksSatiri(item?: EndeksKiyasItem) {
  if (!item) return "veri yok";
  return `${item.ad}: ${tlFormatla(item.fiyat) ?? "veri yok"} | günlük ${teknikYuzde(item.gunlukDegisim)} | 1H ${teknikYuzde(item.performans1H)} | 1A ${teknikYuzde(item.performans1A)} | 3A ${teknikYuzde(item.performans3A)} | 1Y ${teknikYuzde(item.performans1Y)}`;
}

function endeksToolSatiri(item: EndeksKiyasItem) {
  return {
    kod: item.kod,
    ad: item.ad,
    seviye: tlFormatla(item.fiyat) ?? null,
    gunlukDegisimYuzde: yuzdeFormatla(item.gunlukDegisim) ?? null,
    performans1H: yuzdeFormatla(item.performans1H) ?? null,
    performans1A: yuzdeFormatla(item.performans1A) ?? null,
    performans3A: yuzdeFormatla(item.performans3A) ?? null,
    performans1Y: yuzdeFormatla(item.performans1Y) ?? null,
  };
}

function genelPiyasaToolCevabi(baglami: GenelPiyasaBaglami) {
  return {
    formatKurali: "Yüzde alanları formatlı stringdir. Ham 0.61 değeri +%0,61 demektir; asla tekrar 100 ile çarpma.",
    anaEndeksler: baglami.endeksler.map(endeksToolSatiri),
    sektorEndeksleri: baglami.sektorEndeksleri.map(endeksToolSatiri),
    piyasaGenisligi: {
      kapsam: baglami.kapsam,
      veriSayisi: baglami.veriSayisi,
      yukselen: baglami.yukselenSayisi,
      dusen: baglami.dusenSayisi,
      yatay: baglami.yataySayisi,
      ortalamaGunlukDegisim: yuzdeFormatla(baglami.ortalamaDegisim) ?? null,
    },
    enCokYukselenler: baglami.enCokYukselenler.slice(0, 8).map((h) => ({
      ticker: h.ticker,
      fiyat: tlFormatla(h.fiyat),
      gunlukDegisimYuzde: yuzdeFormatla(h.degisimYuzde),
      relatifHacim: h.relatifHacim !== undefined ? `${sayiFormatla(h.relatifHacim)}x` : null,
      sektor: h.sektor ?? null,
    })),
    enCokDusenler: baglami.enCokDusenler.slice(0, 8).map((h) => ({
      ticker: h.ticker,
      fiyat: tlFormatla(h.fiyat),
      gunlukDegisimYuzde: yuzdeFormatla(h.degisimYuzde),
      relatifHacim: h.relatifHacim !== undefined ? `${sayiFormatla(h.relatifHacim)}x` : null,
      sektor: h.sektor ?? null,
    })),
    yuksekRelatifHacim: baglami.yuksekRelatifHacim.slice(0, 8).map((h) => ({
      ticker: h.ticker,
      fiyat: tlFormatla(h.fiyat),
      gunlukDegisimYuzde: yuzdeFormatla(h.degisimYuzde),
      relatifHacim: h.relatifHacim !== undefined ? `${sayiFormatla(h.relatifHacim)}x` : null,
      sektor: h.sektor ?? null,
    })),
  };
}

function goreliPerformansSatiri(hissePerf?: number, item?: EndeksKiyasItem, etiket = "endeks") {
  if (typeof hissePerf !== "number" || typeof item?.performans1A !== "number") return `${etiket}: hesaplanamadı`;
  const fark = hissePerf - item.performans1A;
  return `${etiket}: 1A göreli ${teknikYuzde(fark)}`;
}

function piyasaKiyasOzeti(teknik?: TeknikMetrikler, piyasa?: PiyasaKiyasBaglami) {
  if (!piyasa) {
    return `PİYASA/SEKTÖR KIYASI:
- Endeks ve sektör kıyası: veri yok`;
  }

  return `PİYASA/SEKTÖR KIYASI:
- XU100: ${endeksSatiri(piyasa.xu100)}
- XU030: ${endeksSatiri(piyasa.xu030)}
- Sektör endeksi: ${piyasa.sektorEndeksAdi ? endeksSatiri(piyasa.sektorEndeksi) : "sektör endeksi eşleşmedi"}
- Hissenin 1A göreli performansı: ${goreliPerformansSatiri(teknik?.performans1A, piyasa.xu100, "XU100")} | ${goreliPerformansSatiri(teknik?.performans1A, piyasa.sektorEndeksi, "sektör")}
- Yorum kuralı: hisse düşerken sektör/endeks de düşüyorsa piyasa baskısı olasılığını, hisse sektöründen ayrışıyorsa şirket/özel haber/teknik neden olasılığını ayrı belirt.`;
}

function genelPiyasaSatiri(item: GenelPiyasaHisse) {
  const fiyat = tlFormatla(item.fiyat);
  const degisim = yuzdeFormatla(item.degisimYuzde);
  const relatif = item.relatifHacim !== undefined
    ? `${item.relatifHacim.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}x`
    : "veri yok";
  return `- ${item.ticker}: ${fiyat ? `${fiyat} ₺` : "fiyat veri yok"} | günlük ${degisim ?? "veri yok"} | relatif hacim ${relatif}${item.sektor ? ` | sektör ${item.sektor}` : ""}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function genelPiyasaPromptu(baglami?: GenelPiyasaBaglami | null) {
  if (!baglami) {
    return `GENEL PİYASA BAĞLAMI:
- Genel endeks ve piyasa tarama verisi alınamadı.

GENEL PİYASA KILAVUZU:
- Kullanıcı "piyasa nasıl" diye sorarsa veri yoksa bunu açıkça söyle; portföy verisini genel piyasa yerine koyma.
- Eksik veri için rakip/harici platforma yönlendirme; ParaKonuşur içindeki piyasa ve izleme ekranlarından bahsedebilirsin.`;
  }

  const endeksler = baglami.endeksler.map((item) => `- ${item.ad}: ${endeksSatiri(item)}`).join("\n") || "- Ana endeks verisi yok";
  const sektorler = baglami.sektorEndeksleri
    .slice()
    .sort((a, b) => (b.gunlukDegisim ?? -999) - (a.gunlukDegisim ?? -999))
    .map((item) => `- ${item.ad}: ${endeksSatiri(item)}`)
    .join("\n") || "- Sektör endeksi verisi yok";

  return `GENEL PİYASA BAĞLAMI:
- Ana endeksler:
${endeksler}
- Sektör endeksleri:
${sektorler}
- BIST hisse taraması: ${baglami.kapsam} hisse denendi; ${baglami.veriSayisi} hisseden veri döndü.
- Piyasa genişliği: ${baglami.yukselenSayisi} yükselen, ${baglami.dusenSayisi} düşen, ${baglami.yataySayisi} yatay; ortalama günlük değişim ${teknikYuzde(baglami.ortalamaDegisim)}.
- En çok yükselenler:
${baglami.enCokYukselenler.map(genelPiyasaSatiri).join("\n") || "- veri yok"}
- En çok düşenler:
${baglami.enCokDusenler.map(genelPiyasaSatiri).join("\n") || "- veri yok"}
- Relatif hacmi yüksek hisseler:
${baglami.yuksekRelatifHacim.map(genelPiyasaSatiri).join("\n") || "- veri yok"}

GENEL PİYASA KILAVUZU:
- Kullanıcı "bugün piyasa nasıl" diye sorarsa portföyü değil önce ana endeksler, sektör endeksleri, piyasa genişliği ve hacim canlılığını yorumla.
- "Genel piyasa verisine erişimim yok" deme; yukarıdaki gecikmeli endeks ve tarama verisini kapsamıyla birlikte kullan.
- Portföy verisi varsa yalnızca kullanıcı özellikle portföyünü sorarsa ek bağlam yap; genel piyasa sorusunu portföy cevabına çevirmeme.
- En çok yükselen/düşen listesini yatırım önerisi gibi sunma; piyasanın nerede yoğunlaştığını göstermek için kullan.
- Veriler gecikmeli olabilir; kesin yön ve garanti getiri dili kurma.`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function hissePromptu(ticker: string, veri?: HissePromptVeri | null, analiz?: string, teknik?: TeknikMetrikler, temel?: TemelMetrikler, temettu?: TemettuGecmisi | null, piyasaKiyas?: PiyasaKiyasBaglami) {
  if (!veri) {
    return `HİSSE BAĞLAMI:
- Ticker: ${ticker}
- Sektör: ${teknik?.sektor ?? "veri yok"}${teknik?.endustri ? ` / ${teknik.endustri}` : ""}
- Güncel fiyat verisi sağlanmadı.
${teknikMetrikOzeti(undefined, teknik)}
${temelMetrikOzeti(temel)}
${takasYabanciKapsamiOzeti(temel)}
${temettuGecmisiOzeti(temettu)}
${piyasaKiyasOzeti(teknik, piyasaKiyas)}
${analiz ? `\nÖNCEKİ AI ANALİZ ÖZETİ:\n${analiz}` : ""}`;
  }

  const fiyat = typeof veri.fiyat === "number" ? veri.fiyat : undefined;
  const oncekiKapanis = typeof veri.oncekiKapanis === "number" ? veri.oncekiKapanis : undefined;
  const gunlukYuksek = typeof veri.gunlukYuksek === "number" ? veri.gunlukYuksek : undefined;
  const gunlukDusuk = typeof veri.gunlukDusuk === "number" ? veri.gunlukDusuk : undefined;
  const yillikYuksek = typeof veri.yillikYuksek === "number" ? veri.yillikYuksek : undefined;
  const yillikDusuk = typeof veri.yillikDusuk === "number" ? veri.yillikDusuk : undefined;
  const hacim = typeof veri.hacim === "number" ? veri.hacim : undefined;

  const gunlukDegisim = typeof veri.degisimYuzde === "number"
    ? veri.degisimYuzde
    : fiyat && oncekiKapanis && oncekiKapanis > 0
      ? ((fiyat - oncekiKapanis) / oncekiKapanis) * 100
      : undefined;

  const gunIciKonum = fiyat !== undefined && gunlukYuksek !== undefined && gunlukDusuk !== undefined && gunlukYuksek > gunlukDusuk
    ? ((fiyat - gunlukDusuk) / (gunlukYuksek - gunlukDusuk)) * 100
    : undefined;

  const hafta52Konum = fiyat !== undefined && yillikYuksek !== undefined && yillikDusuk !== undefined && yillikYuksek > yillikDusuk
    ? ((fiyat - yillikDusuk) / (yillikYuksek - yillikDusuk)) * 100
    : undefined;

  const gunIciEtiket = gunIciKonum === undefined
    ? "hesaplanamadı"
    : gunIciKonum >= 75
      ? "gün içi bandın üst tarafında"
      : gunIciKonum <= 25
        ? "gün içi bandın alt tarafında"
        : "gün içi bandın orta bölgesinde";

  const hafta52Etiket = hafta52Konum === undefined
    ? "hesaplanamadı"
    : hafta52Konum >= 80
      ? "52 hafta aralığının üst bölgesinde"
      : hafta52Konum <= 20
        ? "52 hafta aralığının alt bölgesinde"
      : "52 hafta aralığının orta bölgesinde";
  const fiyatText = tlFormatla(fiyat);
  const oncekiText = tlFormatla(oncekiKapanis);
  const gunlukYuksekText = tlFormatla(gunlukYuksek);
  const gunlukDusukText = tlFormatla(gunlukDusuk);
  const yillikYuksekText = tlFormatla(yillikYuksek);
  const yillikDusukText = tlFormatla(yillikDusuk);
  const gunlukDegisimText = yuzdeFormatla(gunlukDegisim);

  return `HİSSE BAĞLAMI:
- Ticker: ${ticker}
${veri.sirketAdi ? `- Şirket: ${veri.sirketAdi}` : ""}
- Sektör: ${teknik?.sektor ?? "veri yok"}${teknik?.endustri ? ` / ${teknik.endustri}` : ""}
- Fiyat: ${fiyatText ? `${fiyatText} ₺` : "veri yok"}
- Günlük değişim: ${gunlukDegisimText ?? "hesaplanamadı"}
- Önceki kapanış: ${oncekiText ? `${oncekiText} ₺` : "veri yok"}
- Günlük yüksek/düşük: ${gunlukYuksekText && gunlukDusukText ? `${gunlukDusukText} ₺ - ${gunlukYuksekText} ₺` : "veri yok"}
- Gün içi konum: ${gunIciKonum !== undefined ? `%${gunIciKonum.toFixed(0)} (${gunIciEtiket})` : gunIciEtiket}
- 52 hafta yüksek/düşük: ${yillikYuksekText && yillikDusukText ? `${yillikDusukText} ₺ - ${yillikYuksekText} ₺` : "veri yok"}
- 52 hafta konumu: ${hafta52Konum !== undefined ? `%${hafta52Konum.toFixed(0)} (${hafta52Etiket})` : hafta52Etiket}
- Hacim: ${hacim !== undefined && hacim > 0 ? `${hacim.toLocaleString("tr-TR")} adet` : "veri yok"}
- Hazır fiyat cevabı: ${fiyatText ? `${ticker} ${fiyatText} ₺${gunlukDegisimText ? ` (${gunlukDegisimText})` : ""}` : "veri yok"}

HİSSE YORUM KILAVUZU:
- Kullanıcı yalnızca fiyat soruyorsa "Hazır fiyat cevabı" satırını aynen kullan; fiyat ve günlük değişim için yeni hesap/format üretme.
- Fiyat ve TL değerlerini her zaman virgülden sonra 2 basamakla göster.
- Gün içi konum, fiyatın o günkü düşük-yüksek bandında nerede olduğunu gösterir; tek başına trend kanıtı değildir.
- 52 hafta konumu, hissenin orta vadeli fiyat aralığındaki yerini gösterir; yeni arz veya split sonrası yanıltıcı olabilir.
- Cevap verirken fiyat, bant konumu, hacim ve varsa önceki analiz özetini birlikte yorumla.
- Teknik metrik varsa RSI, MACD histogramı, ortalamalara uzaklık, Bollinger konumu, ATR/beta, performans, hacim ortalamaları ve pivotları birlikte değerlendir; tek bir göstergeden sonuç çıkarma.
- Temel metrik varsa değerleme, marjlar, kârlılık, bilanço, borç/nakit ve temettü verimini birlikte değerlendir; tek bir çarpandan "ucuz/pahalı" sonucu çıkarma.
- Takas/yabancı veri kapsamı varsa gerçek yabancı takas oranı ile halka açıklık/pay yapısını karıştırma; yabancı işlemi verisi yoksa açıkça söyle.
- Temettü geçmişi varsa son ödeme, son 12 ay toplamı, yaklaşık verim ve ödeme sürekliliğini yorumla; gelecekte aynı temettünün garanti olduğunu söyleme.
- Piyasa/sektör kıyası varsa hisse hareketini XU100, XU030 ve sektör endeksiyle ayrıştır; endeks/sektör baskısını şirket özelinden ayrı tut.
${teknikMetrikOzeti(fiyat, teknik)}
${temelMetrikOzeti(temel)}
${takasYabanciKapsamiOzeti(temel)}
${temettuGecmisiOzeti(temettu)}
${piyasaKiyasOzeti(teknik, piyasaKiyas)}
${analiz ? `\nÖNCEKİ AI ANALİZ ÖZETİ:\n${analiz}` : ""}`;
}

async function portfoyPromptu(portfoy?: PortfoyPromptItem[]) {
  if (!portfoy || portfoy.length === 0) return "";
  const portfoyTickerlari = portfoy.map((p) => p.ticker);
  const [sektorBilgileri, teknikBilgileri] = await Promise.all([
    tradingViewSektorBilgisiCek(portfoyTickerlari),
    tradingViewTeknikMetrikleriCek(portfoyTickerlari),
  ]);

  const para = (value?: number) => typeof value === "number" && Number.isFinite(value)
    ? `${value > 0 ? "+" : ""}${value.toFixed(0)} ₺`
    : "hesaplanamadı";
  const yuzde = (value?: number) => typeof value === "number" && Number.isFinite(value)
    ? `%${value.toFixed(2)}`
    : "hesaplanamadı";

  const zenginPortfoy = portfoy.map((p) => {
    const maliyet = p.maliyet ?? p.alis_fiyati;
    const maliyetDeger = p.adet * (maliyet ?? 0);
    const guncelDeger = p.guncelDeger ?? (p.guncelFiyat !== undefined ? p.guncelFiyat * p.adet : maliyetDeger);
    const karZarar = p.karZarar ?? (guncelDeger > 0 && maliyetDeger > 0 ? guncelDeger - maliyetDeger : undefined);
    const gunlukKatki = p.degisimYuzde !== undefined ? guncelDeger - guncelDeger / (1 + p.degisimYuzde / 100) : undefined;
    return { ...p, maliyet, maliyetDeger, guncelDeger, karZarar, gunlukKatki };
  });

  const toplamMaliyet = zenginPortfoy.reduce((acc, p) => acc + p.maliyetDeger, 0);
  const toplamDeger = zenginPortfoy.reduce((acc, p) => acc + p.guncelDeger, 0);
  const toplamKarZarar = toplamDeger - toplamMaliyet;
  const toplamKarZararYuzde = toplamMaliyet > 0 ? (toplamKarZarar / toplamMaliyet) * 100 : 0;
  const gunlukKatkiToplam = zenginPortfoy.reduce((acc, p) => acc + (p.gunlukKatki ?? 0), 0);
  const siraliAgirlik = [...zenginPortfoy].sort((a, b) => b.guncelDeger - a.guncelDeger);
  const enBuyuk = siraliAgirlik[0];
  const ilkUcAgirlik = toplamDeger > 0 ? (siraliAgirlik.slice(0, 3).reduce((acc, p) => acc + p.guncelDeger, 0) / toplamDeger) * 100 : undefined;
  const enBuyukAgirlik = enBuyuk && toplamDeger > 0 ? (enBuyuk.guncelDeger / toplamDeger) * 100 : undefined;
  const enCokKazandiran = [...zenginPortfoy].filter((p) => p.karZarar !== undefined).sort((a, b) => (b.karZarar ?? 0) - (a.karZarar ?? 0))[0];
  const enCokZarar = [...zenginPortfoy].filter((p) => p.karZarar !== undefined).sort((a, b) => (a.karZarar ?? 0) - (b.karZarar ?? 0))[0];
  const gunlukLider = [...zenginPortfoy].filter((p) => p.gunlukKatki !== undefined).sort((a, b) => (b.gunlukKatki ?? 0) - (a.gunlukKatki ?? 0))[0];
  const gunlukNegatif = [...zenginPortfoy].filter((p) => p.gunlukKatki !== undefined).sort((a, b) => (a.gunlukKatki ?? 0) - (b.gunlukKatki ?? 0))[0];
  const temaDagilimi = new Map<string, number>();
  for (const p of zenginPortfoy) {
    const sektor = teknikBilgileri[p.ticker]?.teknik?.sektor ?? sektorBilgileri[p.ticker]?.sektor;
    const tema = sektor ?? "Sektör verisi yok";
    temaDagilimi.set(tema, (temaDagilimi.get(tema) ?? 0) + p.guncelDeger);
  }
  const enBuyukSektor = [...temaDagilimi.entries()].sort((a, b) => b[1] - a[1])[0];
  const enBuyukSektorAgirlik = enBuyukSektor && toplamDeger > 0 ? (enBuyukSektor[1] / toplamDeger) * 100 : undefined;
  const temaSatirlari = [...temaDagilimi.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tema, deger]) => `- ${tema}: %${toplamDeger > 0 ? ((deger / toplamDeger) * 100).toFixed(1) : "0.0"}`);
  const agirlikliOrtalama = (selector: (ticker: string) => number | undefined) => {
    if (toplamDeger <= 0) return undefined;
    let toplam = 0;
    let toplamAgirlik = 0;
    for (const p of zenginPortfoy) {
      const value = selector(p.ticker);
      if (value === undefined) continue;
      const agirlik = p.guncelDeger / toplamDeger;
      toplam += value * agirlik;
      toplamAgirlik += agirlik;
    }
    return toplamAgirlik > 0 ? toplam / toplamAgirlik : undefined;
  };
  const agirlikliBeta = agirlikliOrtalama((ticker) => teknikBilgileri[ticker]?.teknik?.beta1Yil);
  const agirlikliVolatilite = agirlikliOrtalama((ticker) => teknikBilgileri[ticker]?.teknik?.volatiliteGunluk);
  const agirlikliRelatifHacim = agirlikliOrtalama((ticker) => teknikBilgileri[ticker]?.teknik?.relatifHacim10G);
  const negatifGunlukPozisyonSayisi = zenginPortfoy.filter((p) => (p.degisimYuzde ?? 0) < 0).length;
  const yuksekBetaPozisyonlari = zenginPortfoy
    .filter((p) => (teknikBilgileri[p.ticker]?.teknik?.beta1Yil ?? 0) >= 1.2)
    .map((p) => p.ticker);
  const yuksekVolatilPozisyonlari = zenginPortfoy
    .filter((p) => (teknikBilgileri[p.ticker]?.teknik?.volatiliteGunluk ?? 0) >= 5)
    .map((p) => p.ticker);
  const riskBayraklari = [
    enBuyuk && enBuyukAgirlik !== undefined && enBuyukAgirlik >= 35
      ? `Tek pozisyon yoğunlaşması yüksek: ${enBuyuk.ticker} portföyün %${enBuyukAgirlik.toFixed(1)}'i.`
      : null,
    ilkUcAgirlik !== undefined && ilkUcAgirlik >= 70
      ? `İlk 3 pozisyon yoğunlaşması yüksek: toplam %${ilkUcAgirlik.toFixed(1)}.`
      : null,
    enBuyukSektor && enBuyukSektorAgirlik !== undefined && enBuyukSektorAgirlik >= 50
      ? `Tek sektör yoğunlaşması yüksek: ${enBuyukSektor[0]} portföyün %${enBuyukSektorAgirlik.toFixed(1)}'i.`
      : null,
    agirlikliBeta !== undefined && agirlikliBeta >= 1.15
      ? `Ağırlıklı beta yüksek: ${agirlikliBeta.toFixed(2)}; portföy endekse göre daha oynak davranabilir.`
      : null,
    agirlikliVolatilite !== undefined && agirlikliVolatilite >= 5
      ? `Ağırlıklı günlük volatilite yüksek: %${agirlikliVolatilite.toFixed(2)}.`
      : null,
    negatifGunlukPozisyonSayisi >= Math.ceil(zenginPortfoy.length * 0.6)
      ? `Pozisyonların çoğu günü negatif geçiriyor: ${negatifGunlukPozisyonSayisi}/${zenginPortfoy.length}.`
      : null,
    enCokZarar && (enCokZarar.karZarar ?? 0) < 0
      ? `En büyük açık zarar ${enCokZarar.ticker} tarafında: ${para(enCokZarar.karZarar)}.`
      : null,
    gunlukNegatif && (gunlukNegatif.gunlukKatki ?? 0) < 0
      ? `Günlük negatif katkıda öne çıkan pozisyon ${gunlukNegatif.ticker}: ${para(gunlukNegatif.gunlukKatki)}.`
      : null,
    toplamMaliyet > 0 && toplamKarZararYuzde <= -10
      ? `Toplam portföy zararı %${Math.abs(toplamKarZararYuzde).toFixed(1)} seviyesinde; zarar kaynağı ve ağırlık birlikte incelenmeli.`
      : null,
  ].filter(Boolean);
  const gucNoktalari = [
    toplamMaliyet > 0 && toplamKarZararYuzde > 0
      ? `Portföy toplamda artıda: ${para(toplamKarZarar)} (${yuzde(toplamKarZararYuzde)}).`
      : null,
    gunlukLider && (gunlukLider.gunlukKatki ?? 0) > 0
      ? `Günlük pozitif katkıyı en çok ${gunlukLider.ticker} taşıyor: ${para(gunlukLider.gunlukKatki)}.`
      : null,
    enCokKazandiran && (enCokKazandiran.karZarar ?? 0) > 0
      ? `Toplam kâr lideri ${enCokKazandiran.ticker}: ${para(enCokKazandiran.karZarar)}.`
      : null,
  ].filter(Boolean);
  const doktorSkoru = Math.max(0, Math.min(100,
    100
    - (enBuyukAgirlik !== undefined && enBuyukAgirlik >= 35 ? 20 : 0)
    - (ilkUcAgirlik !== undefined && ilkUcAgirlik >= 70 ? 20 : 0)
    - (toplamKarZararYuzde <= -10 ? 20 : 0)
    - (riskBayraklari.length * 5)
    - (enBuyukSektorAgirlik !== undefined && enBuyukSektorAgirlik >= 50 ? 10 : 0)
    - (agirlikliBeta !== undefined && agirlikliBeta >= 1.15 ? 10 : 0)
    - (agirlikliVolatilite !== undefined && agirlikliVolatilite >= 5 ? 10 : 0)
    + (toplamKarZararYuzde > 0 ? 5 : 0)
  ));
  const doktorSeviyesi = doktorSkoru >= 75 ? "Dengeli görünüyor" : doktorSkoru >= 50 ? "İzleme gerektiriyor" : "Risk yoğun";

  const satirlar = zenginPortfoy.map((p) => {
    const agirlik = toplamDeger > 0 ? ` | Ağırlık: %${((p.guncelDeger / toplamDeger) * 100).toFixed(1)}` : "";
    const teknikSatir = teknikBilgileri[p.ticker];
    const sektorBilgisi = teknikSatir?.teknik ?? sektorBilgileri[p.ticker];
    const sektor = sektorBilgisi?.sektor ? `${sektorBilgisi.sektor}${sektorBilgisi.endustri ? ` / ${sektorBilgisi.endustri}` : ""}` : "veri yok";
    const teknikRisk = teknikSatir?.teknik
      ? ` | Beta ${sayiFormatla(teknikSatir.teknik.beta1Yil) ?? "veri yok"} | Volatilite ${teknikYuzde(teknikSatir.teknik.volatiliteGunluk)} | RSI ${sayiFormatla(teknikSatir.teknik.rsi) ?? "veri yok"}`
      : "";
    return `- ${p.ticker}: ${p.adet} lot | Sektör: ${sektor}${p.maliyet ? ` | Maliyet: ${p.maliyet} ₺` : ""}${p.guncelFiyat ? ` | Güncel: ${p.guncelFiyat} ₺` : ""} | Değer: ${p.guncelDeger.toFixed(0)} ₺${agirlik}${p.karZarar !== undefined ? ` | Toplam K/Z: ${p.karZarar > 0 ? "+" : ""}${p.karZarar.toFixed(0)} ₺ (%${p.karZararYuzde?.toFixed(1) ?? (p.maliyetDeger > 0 ? (p.karZarar / p.maliyetDeger * 100).toFixed(1) : "0")})` : ""}${p.degisimYuzde !== undefined ? ` | Günlük: ${p.degisimYuzde > 0 ? "+" : ""}%${p.degisimYuzde}${p.gunlukKatki !== undefined ? ` (${p.gunlukKatki > 0 ? "+" : ""}${p.gunlukKatki.toFixed(0)} ₺)` : ""}` : ""}${teknikRisk}`;
  }).join("\n");

  return `KULLANICININ PORTFÖY VERİSİ:
ÖZET:
- Pozisyon sayısı: ${portfoy.length}
- Toplam maliyet: ${toplamMaliyet > 0 ? `${toplamMaliyet.toFixed(0)} ₺` : "hesaplanamadı"}
- Toplam yaklaşık değer: ${toplamDeger > 0 ? `${toplamDeger.toFixed(0)} ₺` : "hesaplanamadı"}
- Toplam K/Z: ${toplamMaliyet > 0 ? `${para(toplamKarZarar)} (${yuzde(toplamKarZararYuzde)})` : "hesaplanamadı"}
- Yaklaşık günlük katkı: ${gunlukKatkiToplam !== 0 ? para(gunlukKatkiToplam) : "veri yok veya 0"}
- En büyük pozisyon: ${enBuyuk && enBuyukAgirlik !== undefined ? `${enBuyuk.ticker} (%${enBuyukAgirlik.toFixed(1)})` : "hesaplanamadı"}
- İlk 3 pozisyon ağırlığı: ${ilkUcAgirlik !== undefined ? `%${ilkUcAgirlik.toFixed(1)}` : "hesaplanamadı"}
- En çok kâr yazan: ${enCokKazandiran ? `${enCokKazandiran.ticker} (${para(enCokKazandiran.karZarar)})` : "veri yok"}
- En çok zarar yazan: ${enCokZarar ? `${enCokZarar.ticker} (${para(enCokZarar.karZarar)})` : "veri yok"}
- Günlük en büyük pozitif katkı: ${gunlukLider ? `${gunlukLider.ticker} (${para(gunlukLider.gunlukKatki)})` : "veri yok"}
- Günlük en büyük negatif katkı: ${gunlukNegatif ? `${gunlukNegatif.ticker} (${para(gunlukNegatif.gunlukKatki)})` : "veri yok"}

PORTFÖY DOKTORU:
- Doktor skoru: ${doktorSkoru}/100 (${doktorSeviyesi})
- Güçlü noktalar: ${gucNoktalari.length > 0 ? gucNoktalari.join(" ") : "Belirgin güçlü nokta hesaplanamadı."}
- Risk bayrakları: ${riskBayraklari.length > 0 ? riskBayraklari.join(" ") : "Belirgin yoğunlaşma veya zarar bayrağı hesaplanamadı."}
- PORTFÖY RİSK MOTORU:
  - Konsantrasyon: en büyük pozisyon ${enBuyuk && enBuyukAgirlik !== undefined ? `${enBuyuk.ticker} %${enBuyukAgirlik.toFixed(1)}` : "hesaplanamadı"} | ilk 3 ${ilkUcAgirlik !== undefined ? `%${ilkUcAgirlik.toFixed(1)}` : "veri yok"} | en büyük sektör ${enBuyukSektor && enBuyukSektorAgirlik !== undefined ? `${enBuyukSektor[0]} %${enBuyukSektorAgirlik.toFixed(1)}` : "veri yok"}
  - Piyasa duyarlılığı: ağırlıklı beta ${sayiFormatla(agirlikliBeta) ?? "veri yok"} | ağırlıklı günlük volatilite ${teknikYuzde(agirlikliVolatilite)} | ağırlıklı relatif hacim ${sayiFormatla(agirlikliRelatifHacim) ?? "veri yok"}x
  - Günlük baskı: negatif pozisyon sayısı ${negatifGunlukPozisyonSayisi}/${zenginPortfoy.length} | yüksek beta pozisyonları ${yuksekBetaPozisyonlari.length > 0 ? yuksekBetaPozisyonlari.join(", ") : "yok"} | yüksek volatil pozisyonlar ${yuksekVolatilPozisyonlari.length > 0 ? yuksekVolatilPozisyonlari.join(", ") : "yok"}
  - Yorum kuralı: risk skorunu yatırım kararı gibi değil; yoğunlaşma, piyasa duyarlılığı, oynaklık ve günlük katkı kontrol listesi gibi anlat.
- Sektör dağılımı:
${temaSatirlari.length > 0 ? temaSatirlari.join("\n") : "- Sektör dağılımı hesaplanamadı."}
- Doktor yorumu yaparken al/sat önerme; ağırlık, katkı, zarar kaynağı, veri eksikleri ve takip edilecek metrikleri söyle.

POZİSYON DETAYLARI:
${satirlar}`;
}

function sonKullaniciMesaji(messages: ChatMessage[]): string {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

function niyetSiniflandir(text: string, aktifTicker?: string): ChatIntent {
  const q = text.toLocaleLowerCase("tr-TR");
  const tickerVar = tickerAdaylari(text, aktifTicker).length > 0 || Boolean(aktifTicker);
  const portfoyDisiReferans = /\b(portföy|portfoy)\s+(dışında|disinda)\b/.test(q);
  const portfoyReferansi = !portfoyDisiReferans && /\b(portföy|portfoy|portföyüm|portfoyum|portföyümde|portfoyumde|pozisyon|pozisyonlarım|pozisyonlarim|k\/z|getirim|getiri|kar|kâr|zarar)\b/.test(q);
  const genelPiyasaReferansi = /\b(piyasa|bist|bıst|endeks|endeksi|xu100|xu030|sektör|sektor)\b/.test(q);
  const bugunReferansi = /\b(bugün|bugun|gün|gun|günlük|gunluk)\b/.test(q);
  const piyasaNedenReferansi = /\b(neden|niye|sebep|haber|kap|düştü|dustu|düştük|dustuk|düşüyor|dusuyor|düşüş|dusus|sert|satış|satis|baskı|baski|negatif)\b/.test(q);

  if (/\b(alarm|bildir|uyar|takip et|hat[ıi]rlat)\b/.test(q)) return "alarm_aksiyon";
  if (RAKIP_KAYNAK_IFADELERI.some((re) => re.test(text))) return "genel";
  if (/(hisseyi?|bu hisseyi?|şimdi|hemen)\s+(al|sat)\b/i.test(text)) return "hisse_analizi";
  if (!tickerVar && !portfoyReferansi && bugunReferansi && piyasaNedenReferansi) return "piyasa_genel";
  if (genelPiyasaReferansi
    && /\b(bugün|bugun|nasıl|nasil|durum|görünüm|gorunum|genel|özet|ozet|dışında|disinda|ne durumda|neden|niye|sebep|haber|düştü|dustu|düşüş|dusus|sert)\b/.test(q)
    && !portfoyReferansi) return "piyasa_genel";
  if (/\b(portföy|portfoy|pozisyon|dağılım|agirlik|ağırlık|kar etmişim|zarar|k\/z|getirim|getiri)\b/.test(q)) return "portfoy";
  if (/\b(karşılaştır|kıyasla|hangisi|m[ıiuü]\s+.*\s+m[ıiuü]|versus|vs\.?|farkı ne)\b/.test(q)) return "karsilastirma";
  if (tickerVar && /\b(kaç tl|fiyat|fiyatı|fiyati)\b/.test(q)) return "hisse_analizi";
  if (teknikTaramaIstegiCikar(text)) return "teknik_tarama";
  if (/\b(nedir|ne demek|nasıl hesaplanır|yorumlanır|anlama gelir|f\/k|fk|pd\/dd|rsi|beta|volatilite|momentum|temettü|hacim anomalisi)\b/.test(q)) return "kavram";
  if (/\b(neden|niye|sebep|haber|kap|düştü|düşüyor|yükseldi|yükseliyor)\b/.test(q)) return "haber_neden";
  if (tickerVar && /\b(nasıl|yorumla|analiz|risk|teknik|temel|ucuz|pahalı|pahali|görünüm|durum|kaç tl|fiyat)\b/.test(q)) return "hisse_analizi";

  return tickerVar ? "hisse_analizi" : "genel";
}

function niyetPromptu(intent: ChatIntent) {
  const prompts: Record<ChatIntent, string> = {
    kavram: `AKTİF CEVAP MODU: KAVRAM AÇIKLAMA
- Önce kavramı tek paragrafta basitçe tanımla.
- Ardından BIST yatırımcısı bunu nasıl yorumlar, 2-3 maddede açıkla.
- Son bölümde "Dikkat" başlığıyla yanlış yorumlanabilecek noktaları belirt.
- Hisse önerisi yapma; örnek gerekiyorsa genel ve sembolsüz örnek ver.`,
    hisse_analizi: `AKTİF CEVAP MODU: HİSSE ANALİZİ
- Verilen hisse verisini önce kısa özetle.
- "Olumlu taraflar", "Riskler" ve "İzlenecekler" başlıklarını kullan.
- Fiyat yönü için kesin konuşma; sinyal ve koşul dili kullan.
- Veri eksikse analizin sınırlı olduğunu açıkça söyle.`,
    teknik_tarama: `AKTİF CEVAP MODU: TEKNİK TARAMA
- Kullanıcı teknik koşula uyan hisseleri soruyorsa verilen tarama listesini kısa ve net göster.
- Tarama sonucu varsa "yapamam/veremem" deme; kapsam ve gecikme bilgisini belirt.
- Göstergenin ne anlama geldiğini tek paragrafla açıkla.
- Listeyi al/sat tavsiyesi gibi sunma; "izleme listesi adayı", "kontrol edilebilir" dili kullan.`,
    portfoy: `AKTİF CEVAP MODU: PORTFÖY KOÇU
- Portföy verisi varsa toplam tabloyu, ağırlıkları ve günlük hareketi yorumla.
- Konsantrasyon riski, ilk 3 pozisyon ağırlığı, zarar/kâr katkısı ve izlenecek metrikleri vurgula.
- Kullanıcının sorduğu şey "neden arttı/düştü" ise günlük katkı liderlerini temel al.
- Kullanıcının sorduğu şey "riskli mi" ise ağırlık yoğunlaşması, zarar eden pozisyonlar ve volatil günlük hareket üzerinden yorumla.
- Kullanıcı "ne kadar kâr ettim" gibi sayısal soru sorarsa eldeki veriden hesaplanabilen kısmı açıkça söyle.
- Al/sat önerisi yerine kontrol listesi ve risk dili kullan.`,
    karsilastirma: `AKTİF CEVAP MODU: KARŞILAŞTIRMA
- Karşılaştırılan varlıkları/hisseleri netleştir.
- Mümkünse kısa tablo mantığıyla değerleme, momentum, risk ve veri kalitesi başlıklarında kıyasla.
- Kazanan ilan etme; hangi yatırımcı profilinde hangi metrik daha önemli olur, onu anlat.
- Veri yetersizse eksik verileri listele.`,
    haber_neden: `AKTİF CEVAP MODU: NEDEN/HABER YORUMU
- Fiyat hareketini tek başına haberle açıklama.
- Elinde haber/KAP verisi yoksa bunu açıkça söyle.
- Olası açıklama çerçevesi kur: fiyat, hacim, piyasa geneli, şirket haberi, teknik seviye.
- Kullanıcıya kontrol etmesi gereken metrikleri söyle; rakip/harici finans platformu adı önerme.`,
    alarm_aksiyon: `AKTİF CEVAP MODU: AKSİYON/ALARM
- Kullanıcının istediği alarm koşulunu netleştir: hisse, seviye, yüzde, süre.
- Eksik bilgi varsa kısa soru sor.
- Henüz doğrudan işlem yapmadan önce onay gerektiğini belirt.
- Aksiyon önerirken yatırım tavsiyesi verme.`,
    piyasa_genel: `AKTİF CEVAP MODU: GENEL PİYASA RADARI
- Ana endeksler, sektör endeksleri, piyasa genişliği ve hacim yoğunluğunu kullan.
- Kullanıcı genel piyasa soruyorsa portföy tablosunu merkeze alma.
- En çok yükselen/düşenleri piyasa fotoğrafı olarak ver; öneri veya al/sat sinyali gibi sunma.
- Endeks veya tarama verisi eksikse eksikliği söyle, ama eldeki piyasa bağlamıyla sınırlı yorum yap.`,
    genel: `AKTİF CEVAP MODU: GENEL FİNANS ASİSTANI
- Kullanıcının sorusunu kısa ve net cevapla.
- Uygunsa 2-3 maddelik pratik kontrol listesi ekle.
- BIST bağlamına dönüştür ama veri uydurma.`,
  };

  return prompts[intent];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function veriKapsamiPromptu({
  intent,
  ticker,
  veri,
  portfoy,
  karsilastirmaBaglami,
  haberNedenBaglami,
  teknikTaramaBaglami,
  genelPiyasaBaglami,
  alarmTaslak,
}: {
  intent: ChatIntent;
  ticker?: string;
  veri?: HissePromptVeri | null;
  portfoy?: PortfoyPromptItem[];
  karsilastirmaBaglami: string;
  haberNedenBaglami: string;
  teknikTaramaBaglami: string;
  genelPiyasaBaglami: string;
  alarmTaslak: AlarmTaslak | null;
}) {
  const kapsananlar: string[] = [];
  const eksikler: string[] = [];

  if (ticker) kapsananlar.push(`aktif hisse: ${ticker}`);
  if (veri) kapsananlar.push("gecikmeli fiyat ve fiyat bandı verisi");
  if (portfoy && portfoy.length > 0) kapsananlar.push(`kullanıcının ${portfoy.length} pozisyonluk portföy verisi`);
  if (karsilastirmaBaglami) kapsananlar.push("karşılaştırma için sınırlı piyasa metrikleri");
  if (haberNedenBaglami) kapsananlar.push("son KAP başlıkları, olay tipi, detay özeti veya KAP veri durumu");
  if (teknikTaramaBaglami) kapsananlar.push("teknik tarama sonucu");
  if (genelPiyasaBaglami) kapsananlar.push("genel piyasa endeksleri, sektör endeksleri ve BIST tarama özeti");
  if (alarmTaslak) kapsananlar.push("alarm taslak bilgisi");

  if (!veri && (intent === "hisse_analizi" || ticker)) eksikler.push("aktif hisse için güncel fiyat bağlamı");
  if (intent === "portfoy" && (!portfoy || portfoy.length === 0)) eksikler.push("portföy pozisyonları");
  if (intent === "karsilastirma" && !karsilastirmaBaglami) eksikler.push("karşılaştırılacak ikinci hisse veya karşılaştırma verisi");
  if (intent === "haber_neden" && !haberNedenBaglami) eksikler.push("KAP/haber bağlamı");
  if (intent === "teknik_tarama" && !teknikTaramaBaglami) eksikler.push("teknik tarama verisi");
  if (intent === "piyasa_genel" && !genelPiyasaBaglami) eksikler.push("genel piyasa/endeks bağlamı");

  return `VERİ KAPSAMI VE GÜNCELLİK:
- Kullanılabilen bağlam: ${kapsananlar.length > 0 ? kapsananlar.join("; ") : "yalnızca kullanıcının mesajı"}.
- Eksik/sınırlı bağlam: ${eksikler.length > 0 ? eksikler.join("; ") : "belirgin kritik eksik yok"}.
- Fiyat, teknik, temel, temettü ve portföy değerleri gecikmeli olabilir. Kullanıcı özellikle sormadıkça "canlı", "anlık" veya "gerçek zamanlı" veri varmış gibi konuşma.
- Kullanıcı canlı fiyat erişimini sorarsa: ParaKonuşur içinde sağlanan gecikmeli veriyi yorumlayabildiğini, dış canlı fiyat akışına doğrudan bağlanmadığını söyle. "Hiç fiyat verim yok" gibi konuşma.
- Sayısal yorum yaparken "eldeki gecikmeli veriye göre" veya "bu verilerle" dilini tercih et.
- Haber/KAP yorumlarında yalnızca verilen başlık, olay tipi, anahtar noktalar ve detay özeti kapsamına dayan; detay yoksa tam metni okumuş gibi davranma.
- Takas/yabancı oranı sorulursa gerçek MKK/takas/yabancı saklama verisine bağlı olmadığını söyle; yalnızca erişilebilen halka açıklık/pay yapısı metriklerini yorumla.
- Veri eksikse analizi durdurmak yerine önce eksikliği söyle, sonra eldeki veriye göre sınırlı çerçeve kur.
- Eksik veri için rakip finans siteleri, aracı kurum uygulamaları veya harici analiz platformları önermeyi bırak. Kullanıcıyı ParaKonuşur içindeki ekranlara, portföyüne, izleme listesine, haber/KAP alanına veya mevcut gecikmeli veriye yönlendir.`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pakoAkilPlaniPromptu({
  sonMesaj,
  intent,
  tickers,
  aktifTicker,
  veri,
  portfoy,
  karsilastirmaBaglami,
  haberNedenBaglami,
  teknikTaramaBaglami,
  genelPiyasaBaglami,
  alarmTaslak,
}: {
  sonMesaj: string;
  intent: ChatIntent;
  tickers: string[];
  aktifTicker?: string;
  veri?: HissePromptVeri | null;
  portfoy?: PortfoyPromptItem[];
  karsilastirmaBaglami: string;
  haberNedenBaglami: string;
  teknikTaramaBaglami: string;
  genelPiyasaBaglami: string;
  alarmTaslak: AlarmTaslak | null;
}) {
  const q = sonMesaj.toLocaleLowerCase("tr-TR");
  const yalnizFiyatSorusu = intent === "hisse_analizi"
    && /\b(kaç tl|fiyat|fiyatı|fiyati)\b/.test(q)
    && !/\b(analiz|yorum|neden|risk|teknik|temel|ucuz|pahalı|pahali|görünüm|durum)\b/.test(q);
  const nedenSorusu = /\b(neden|niye|sebep|düştü|düşüyor|yükseldi|yükseliyor|hareketli)\b/.test(q);
  const riskSorusu = /\b(risk|riskli|dengeli|dağılım|dagilim|ağırlık|agirlik|konsantrasyon)\b/.test(q);
  const sayisalSorusu = /\b(ne kadar|kaç|kac|yüzde|tl|k[\/ ]?z|kar|kâr|zarar|getiri)\b/.test(q);
  const detaySeviyesi = /\b(detay|ayrıntı|ayrinti|derin|kapsamlı|kapsamli|uzun)\b/.test(q)
    ? "detaylı"
    : /\b(kısa|kisa|özet|tek cümle|tek cumle|hızlı|hizli)\b/.test(q) || yalnizFiyatSorusu
      ? "kısa"
      : "normal";
  const kullaniciTarzi = /\b(teknik|rsi|hacim|destek|direnç|direnc|trend|momentum)\b/.test(q)
    ? "teknik odaklı"
    : /\b(risk|zarar|dengeli|portföy|portfoy|dağılım|dagilim)\b/.test(q)
      ? "risk odaklı"
      : /\b(yeni başladım|yeni basladim|basit|anlamadım|anlamadim)\b/.test(q)
        ? "başlangıç seviyesi"
        : "genel yatırımcı";

  const gorev = yalnizFiyatSorusu
    ? "fiyatı hızlı ve iki basamaklı formatla cevapla"
    : intent === "portfoy" && nedenSorusu
      ? "portföy hareketinin ana katkılarını açıkla"
      : intent === "portfoy" && riskSorusu
        ? "portföy yoğunlaşması ve zarar/kazanç kaynaklarını risk diliyle yorumla"
        : intent === "hisse_analizi" && nedenSorusu
          ? "hisse hareketi için olası neden çerçevesi kur"
          : intent === "teknik_tarama"
            ? "teknik koşula uyan listeyi özetle ve sinyalin sınırını anlat"
            : intent === "piyasa_genel"
              ? "genel piyasa görünümünü endeks, sektör, piyasa genişliği ve hacim üzerinden özetle"
            : intent === "karsilastirma"
              ? "hisseleri metrik bazında kıyasla, kazanan ilan etme"
              : intent === "alarm_aksiyon"
                ? "alarm taslağını tamamlat veya onaya hazır özetle"
                : "soruyu doğrudan cevapla ve gereksiz veri uydurma";

  const veriOnceligi = [
    yalnizFiyatSorusu ? "Hazır fiyat cevabı" : null,
    intent === "portfoy" ? "portföy özeti ve pozisyon katkıları" : null,
    veri ? "gecikmeli fiyat/bant/hacim verisi" : null,
    teknikTaramaBaglami ? "teknik tarama listesi" : null,
    genelPiyasaBaglami ? "genel piyasa radar verisi" : null,
    karsilastirmaBaglami ? "karşılaştırma metrikleri" : null,
    haberNedenBaglami ? "KAP/haber başlığı veri durumu" : null,
    alarmTaslak ? "alarm taslağı alanları" : null,
    "kullanıcının son sorusu",
  ].filter(Boolean).join(" > ");

  const cevapIskeleti = yalnizFiyatSorusu
    ? "tek cümlede fiyat + günlük değişim; ardından gecikmeli veri notu"
    : intent === "portfoy"
      ? "1) kısa özet 2) ana katkı/yoğunlaşma 3) izlenecekler"
      : intent === "hisse_analizi"
        ? "1) veri özeti 2) olumlu taraflar 3) riskler 4) izlenecekler"
        : intent === "teknik_tarama"
          ? "1) kaç sonuç var 2) ilk adaylar 3) RSI uyarısı"
          : intent === "piyasa_genel"
            ? "1) ana endeks özeti 2) piyasa genişliği 3) sektör/hacim odağı 4) izlenecekler"
          : intent === "karsilastirma"
            ? "1) metrik tablosu mantığı 2) hangi metrikte kim önde 3) veri sınırı"
            : intent === "haber_neden"
              ? "1) kesin neden yok 2) olası çerçeve 3) kontrol edilecek metrikler"
              : "kısa yanıt + pratik kontrol listesi";

  const netlestirme = intent === "karsilastirma" && tickers.length < 2
    ? "Karşılaştırma için ikinci hisse eksikse tek kısa soru sor."
    : intent === "portfoy" && (!portfoy || portfoy.length === 0)
      ? "Portföy verisi yoksa kullanıcının pozisyonlarını istemeden kesin portföy yorumu yapma."
      : intent === "alarm_aksiyon" && alarmTaslak && alarmTaslak.eksikler.length > 0
        ? `Alarm için eksikleri tek soruda tamamlat: ${alarmTaslak.eksikler.join(", ")}.`
        : "Yeterli bağlam varsa cevapla; gereksiz netleştirme sorusu sorma.";

  return `PAKO AKIL PLANI:
- Kullanıcı amacı: ${gorev}.
- Tespit edilen hisseler: ${tickers.length > 0 ? tickers.join(", ") : aktifTicker ?? "yok"}.
- Veri kullanım sırası: ${veriOnceligi}.
- Cevap iskeleti: ${cevapIskeleti}.
- Cevap derinliği: ${detaySeviyesi}; kullanıcı tarzı: ${kullaniciTarzi}.
- Sayısal hassasiyet: ${sayisalSorusu ? "rakam varsa iki basamak ve eldeki/gecikmeli veri dili kullan; rakam yoksa uydurma." : "sayı gerekiyorsa yalnızca verilen bağlamdan üret."}
- Netleştirme eşiği: ${netlestirme}
- Sapma kontrolü: rakip kaynak önermeden, al/sat emri vermeden, kesin neden/hedef/getiri iddiası kurmadan cevapla.`;
}

// ─── TOOL USE ────────────────────────────────────────────────────────────────

type ToolInput = Record<string, unknown>;

const PAKO_TOOLS = [
  {
    name: "get_hisse_fiyat",
    description: "BIST hissesinin güncel fiyatını, günlük değişimini, hacmini, 52 haftalık aralığını ve temel fiyat metriklerini getirir. Herhangi bir hisse hakkında soru sorulduğunda ilk çağrılacak araç.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: { type: "string", description: "BIST hisse kodu, büyük harf. Örn: THYAO, EREGL, GARAN" },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_teknik_analiz",
    description: "RSI, MACD, EMA/SMA ortalamaları, Bollinger Band, ATR, pivot seviyeleri, beta, volatilite, relatif hacim, 1H/1A/3A/1Y performans. F/K, PD/DD, temettü verimi, sektör/endeks kıyaslaması da içerir.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: { type: "string", description: "BIST hisse kodu" },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_kap_haberler",
    description: "Hisse için son KAP (Kamuyu Aydınlatma Platformu) bildirimlerini getirir. Fiyat hareketi nedenini araştırırken veya hisse haberleri sorulduğunda kullan.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: { type: "string", description: "BIST hisse kodu" },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_genel_piyasa",
    description: "XU100, XU030 endeks verileri, günün en çok yükselen ve düşen hisseleri, hacim anomalileri ve genel piyasa özeti. Piyasa geneli veya endeks hakkında soru sorulduğunda kullan. Yüzde değerlerini formatlı stringlerden oku; 0.61 +%0,61 demektir, 100 ile çarpma.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_portfoy",
    description: "Kullanıcının portföyündeki hisseleri, adet, maliyet, güncel fiyat, kar/zarar, günlük değişim ve Portföy Risk Motoru özetini getirir. Portföy analizi, risk, yoğunlaşma veya getiri sorulduğunda kullan.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_hisse",
    description: "Şirket adı veya kısmi ticker ile BIST hissesi arar. Kullanıcı hisse kodunu tam bilmediğinde veya şirket ismi yazdığında kullan.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Arama terimi: şirket adı veya hisse kodu parçası" },
      },
      required: ["query"],
    },
  },
];

async function toolExecute(
  name: string,
  input: ToolInput,
  portfoy: PortfoyPromptItem[] | undefined,
): Promise<unknown> {
  switch (name) {
    case "get_hisse_fiyat": {
      const ticker = String(input.ticker ?? "").toUpperCase().replace(/\.IS$/i, "");
      if (!BIST_TICKER_SET.has(ticker)) return { hata: `${ticker} BIST'te tanımlı değil.` };
      const veri = await hisseVerisiCek(ticker);
      if (!veri) return { hata: `${ticker} için fiyat verisi alınamadı.` };
      return {
        ticker,
        fiyat: veri.fiyat,
        degisimYuzde: veri.degisimYuzde,
        gunlukYuksek: veri.gunlukYuksek,
        gunlukDusuk: veri.gunlukDusuk,
        yillikYuksek: veri.yillikYuksek,
        yillikDusuk: veri.yillikDusuk,
        hacim: veri.hacim,
        sirketAdi: veri.sirketAdi,
      };
    }

    case "get_teknik_analiz": {
      const ticker = String(input.ticker ?? "").toUpperCase().replace(/\.IS$/i, "");
      if (!BIST_TICKER_SET.has(ticker)) return { hata: `${ticker} BIST'te tanımlı değil.` };
      const [veri, metrikler] = await Promise.all([
        hisseVerisiCek(ticker),
        tradingViewTeknikMetrikleriCek([ticker]),
      ]);
      const satir = metrikler[ticker];
      const [temettu, piyasaKiyas] = await Promise.all([
        temettuGecmisiCek(ticker, veri?.fiyat ?? satir?.fiyat),
        satir?.teknik?.sektor
          ? piyasaKiyasBaglamiCek(satir.teknik.sektor, satir.teknik.endustri)
          : Promise.resolve(undefined),
      ]);
      return { ticker, fiyat: veri?.fiyat, degisimYuzde: veri?.degisimYuzde, teknik: satir?.teknik, temel: satir?.temel, temettu, piyasaKiyas };
    }

    case "get_kap_haberler": {
      const ticker = String(input.ticker ?? "").toUpperCase().replace(/\.IS$/i, "");
      const haberler = await kapHaberleriCek(ticker);
      return { ticker, haberler };
    }

    case "get_genel_piyasa": {
      return genelPiyasaToolCevabi(await genelPiyasaBaglamiCek());
    }

    case "get_portfoy": {
      if (!portfoy || portfoy.length === 0) return { mesaj: "Kullanıcının portföyü boş." };
      const riskAnalizi = await portfoyPromptu(portfoy);
      return { portfoy, riskAnalizi };
    }

    case "search_hisse": {
      const query = String(input.query ?? "");
      const adTickers = sirketAdindanTickerAdaylari(query);
      const kodTickers = BIST_HISSELER
        .filter(h => h.ticker.startsWith(query.toUpperCase()))
        .map(h => h.ticker)
        .slice(0, 5);
      return Array.from(new Set([...adTickers, ...kodTickers]))
        .slice(0, 8)
        .map(t => {
          const h = BIST_HISSELER.find(x => x.ticker === t);
          return { ticker: t, ad: h?.ad ?? "", fullName: h?.fullName ?? "" };
        });
    }

    default:
      return { hata: `Bilinmeyen araç: ${name}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const requestStart = Date.now();

  // 1. Auth kontrolü
  const auth = await requireUser(req, supabaseAuth);
  if (!auth.user) return auth.response;
  const user = auth.user;

  // 2. Günlük mesaj limiti (ücretsiz: 3 mesaj/gün)
  const bugun = new Date().toISOString().split("T")[0];
  const [usageRes, profileRes] = await Promise.all([
    supabaseAdmin
      .from("chatbot_usage")
      .select("mesaj_sayisi")
      .eq("user_id", user.id)
      .eq("gun", bugun)
      .single(),
    supabaseAdmin
      .from("profiles")
      .select("is_pro, pro_until")
      .eq("id", user.id)
      .single(),
  ]);

  const mevcutSayi = usageRes.data?.mesaj_sayisi ?? 0;
  const profile = profileRes.data as { is_pro?: boolean | null; pro_until?: string | null } | null;
  const proAktif = profile?.is_pro === true && (
    !profile.pro_until || new Date(profile.pro_until).getTime() > Date.now()
  );
  const BYPASS_EMAILS = (process.env.CHATBOT_BYPASS_EMAILS ?? "").split(",").map(e => e.trim());
  const limitAtlandi = proAktif || BYPASS_EMAILS.includes(user.email ?? "");
  const GUNLUK_LIMIT = 3;

  if (!limitAtlandi && mevcutSayi >= GUNLUK_LIMIT) {
    return NextResponse.json({
      error: "gunluk_limit",
      mesaj: "Günlük ücretsiz mesaj hakkınız doldu. Sınırsız analiz için Pro'ya geçin.",
      kullanilanHak: mevcutSayi,
      toplamHak: GUNLUK_LIMIT,
    }, { status: 429 });
  }

  // 3. Dakika bazlı rate limit
  const now = Date.now();
  const userRequests = (rateLimitMap.get(user.id) || []).filter(t => now - t < RATE_WINDOW);
  if (userRequests.length >= RATE_LIMIT) {
    return NextResponse.json({ error: "Çok fazla istek. 1 dakika bekleyin." }, { status: 429 });
  }
  rateLimitMap.set(user.id, [...userRequests, now]);

  const { messages, ticker, portfoy } = await req.json();
  const chatMessages = (messages ?? []) as ChatMessage[];
  const sonMesaj = sonKullaniciMesaji(chatMessages);
  const mesajTickerlari = tickerAdaylari(sonMesaj, ticker);
  const aktifTicker = ticker || mesajTickerlari[0];
  const intent = niyetSiniflandir(sonMesaj, aktifTicker);
  const aktifVeriHizli = aktifTicker ? await hisseVerisiCek(aktifTicker) : null;
  const alarmTaslak = intent === "alarm_aksiyon"
    ? alarmTaslagiCikar(sonMesaj, aktifTicker, aktifVeriHizli)
    : null;

  const systemPrompt = `KİMLİK VE TON:
- Sen Pako AI'sın: ParaKonuşur içindeki BIST odaklı finans asistanı.
- Türkçe, sakin, profesyonel ve anlaşılır konuş. Jargon kullanırsan kısa açıklamasını ver.
- Normal cevaplarda 120-220 kelime hedefle; kullanıcı detay isterse daha kapsamlı yaz.

GÜVENLİK SINIRLARI:
- Yatırım danışmanı gibi davranma. "Al", "sat", "tut", "kesin yükselir/düşer", "garanti" deme.
- Tavsiye yerine "izlenebilir", "dikkat edilebilir", "karar için şu veriler kontrol edilmeli" dili kullan.
- Rakip finans platformu veya harici analiz sitesi adı verme.
- Veri eksikse bunu açıkça belirt; uydurma veri üretme.
- Cevabın sonunda mutlaka şu cümle yer alsın: "Bu analiz yatırım tavsiyesi değildir."

ARAÇLAR:
- get_hisse_fiyat: Güncel fiyat, değişim, hacim, 52H aralığı → hisse hakkında soru sorulduğunda çağır
- get_teknik_analiz: RSI, MACD, EMA, pivot, F/K, PD/DD, temettü, sektör kıyaslaması → teknik/temel analiz istendiğinde çağır
- get_kap_haberler: KAP bildirimleri → haber veya "neden hareket etti" sorularında çağır
- get_genel_piyasa: XU100/XU030, en çok yükselen/düşenler → piyasa geneli sorulduğunda çağır. Yüzdeleri formatlı stringlerden aynen kullan; 0.61 değeri +%0,61'dir, +%61 değildir.
- get_portfoy: Kullanıcının portföyü + Portföy Risk Motoru → portföy analizi/risk/getiri sorulduğunda çağır
- search_hisse: Ticker arama → tam kod bilinmediğinde ya da şirket adı yazıldığında çağır

KURAL: Veri gerektiren sorularda önce ilgili aracı çağır, aldığın gerçek veriyle yorum yap.
YÜZDE KURALI: Tool çıktısında yüzdeler percentage point mantığındadır; 0.61 değeri +%0,61 anlamına gelir. Yüzdeyi tekrar 100 ile çarpma. Formatlı yüzde stringi varsa onu aynen kullan.
${niyetPromptu(intent)}${aktifTicker ? `\nAktif bağlam: ${aktifTicker}` : ""}`;

  // Phase 1: Tool-calling (non-streaming, data gathering)
  type ApiMsgContent =
    | string
    | Anthropic.Messages.ContentBlock[]
    | Anthropic.Messages.ToolResultBlockParam[];

  let currentMessages: Array<{ role: "user" | "assistant"; content: ApiMsgContent }> =
    chatMessages.map(m => ({ role: m.role, content: m.content }));

  let inputTokensTotal = 0;
  let outputTokensTotal = 0;
  const MAX_TOOL_ROUNDS = 4;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const toolResp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      tools: PAKO_TOOLS,
      messages: currentMessages as Anthropic.Messages.MessageParam[],
    });

    inputTokensTotal += toolResp.usage?.input_tokens ?? 0;
    outputTokensTotal += toolResp.usage?.output_tokens ?? 0;

    const toolBlocks = toolResp.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );
    if (toolBlocks.length === 0) break;

    currentMessages = [...currentMessages, { role: "assistant", content: toolResp.content }];

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = await Promise.all(
      toolBlocks.map(async block => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: JSON.stringify(
          await toolExecute(
            block.name,
            block.input as ToolInput,
            portfoy as PortfoyPromptItem[] | undefined,
          )
        ),
      }))
    );

    currentMessages = [...currentMessages, { role: "user", content: toolResults }];
  }

  // Phase 2: Stream final response
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let fullText = "";
      try {
        const finalStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: systemPrompt,
          messages: currentMessages as Anthropic.Messages.MessageParam[],
        });

        for await (const event of finalStream) {
          if (event.type === "content_block_delta") {
            const d = event.delta as { type: string; text?: string };
            if (d.type === "text_delta" && d.text) {
              fullText += d.text;
              send({ type: "delta", text: d.text });
            }
          }
        }

        const finalMsg = await finalStream.finalMessage();
        inputTokensTotal += finalMsg.usage.input_tokens;
        outputTokensTotal += finalMsg.usage.output_tokens;

      } catch {
        send({ type: "error" });
        controller.close();
        return;
      }

      // SPK post-processing
      const ilkReply = cevabiTemizle(fullText);
      const ilkQualityFlags = kaliteBayraklari(ilkReply, intent);
      const reply = cevabiGuvenliDileCevir(ilkReply, ilkQualityFlags);
      const qualityFlags = Array.from(new Set([...ilkQualityFlags, ...kaliteBayraklari(reply, intent)]));
      const engellendi = qualityFlags.includes("yasakli_ifade");

      if (engellendi) {
        send({
          type: "replace",
          text: `Bu soruyu yanıtlamak için yeterli bilgiye sahip değilim. Lütfen lisanslı bir yatırım danışmanına başvurun.\n\n${YATIRIM_TAVSIYESI_UYARISI}`,
        });
      } else if (reply !== fullText) {
        send({ type: "replace", text: reply });
      }

      if (!engellendi) {
        if (mevcutSayi === 0) {
          await supabaseAdmin.from("chatbot_usage").insert({ user_id: user.id, gun: bugun, mesaj_sayisi: 1 });
        } else {
          await supabaseAdmin.from("chatbot_usage").update({ mesaj_sayisi: mevcutSayi + 1 }).eq("user_id", user.id).eq("gun", bugun);
        }
      }

      chatbotTelemetryLogla({
        userId: user.id,
        intent,
        ticker: aktifTicker,
        portfoySayisi: Array.isArray(portfoy) ? portfoy.length : 0,
        qualityFlags,
        alarmTaslakVar: Boolean(alarmTaslak),
        engellendi,
        sureMs: Date.now() - requestStart,
        inputTokens: inputTokensTotal,
        outputTokens: outputTokensTotal,
      });

      send({ type: "done", kalanHak: GUNLUK_LIMIT - mevcutSayi - 1, alarmTaslak });
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
