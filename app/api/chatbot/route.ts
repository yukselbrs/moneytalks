import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { BIST_HISSELER } from "@/lib/bist-hisseler";

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
  if (/\b(canlı|anlık|gerçek zamanlı)\s+(veri|fiyat|piyasa|takip)\b/i.test(reply)) flags.push("canli_veri_iddiasi");
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
      .replace(/\bgerçek zamanlı\s+(veri|fiyat|piyasa|takip)\b/gi, "gecikmeli $1");
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
  | "portfoy"
  | "karsilastirma"
  | "haber_neden"
  | "alarm_aksiyon"
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

type KarsilastirmaHisse = {
  ticker: string;
  fiyat?: number;
  degisimYuzde?: number;
  hacim?: number;
  yillikYuksek?: number;
  yillikDusuk?: number;
  hafta52Konum?: number;
};

type KapHaber = {
  baslik: string;
  tarih?: string;
  kaynakUrl?: string;
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
      .map((d) => ({
        baslik: d.summary?.tr || d.subject?.tr || "",
        tarih: kapTarihParse(d.time),
        kaynakUrl: d.link || (d.disclosureIndex ? `https://www.kap.org.tr/tr/Bildirim/${d.disclosureIndex}` : undefined),
      }))
      .filter((h) => h.baslik);
  } catch {
    return [];
  }
}

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
    return `- ${tarih}: ${h.baslik}${h.kaynakUrl ? ` (${h.kaynakUrl})` : ""}`;
  }).join("\n");

  return `HABER/NEDEN BAĞLAMI:
- İncelenen ticker: ${hedefTicker}
- Son KAP başlıkları: ${haberler.length > 0 ? `\n${satirlar}` : "Bu istek sırasında ilgili yakın KAP başlığı bulunamadı veya KAP verisi alınamadı."}

NEDEN YORUM KILAVUZU:
- KAP başlığı varsa bile fiyat hareketini kesin olarak buna bağlama; "etkili olmuş olabilir" gibi olasılık dili kullan.
- KAP/haber yoksa bunu açıkça söyle ve fiyat hareketini fiyat, hacim, piyasa geneli, teknik seviye ve haber akışı çerçevesinde değerlendir.
- Kullanıcının kontrol etmesi gerekenleri kısa listele: KAP detayı, hacim anomalisi, endeks yönü, sektör hareketi, destek/direnç.
- Haber linki varsa yalnızca başlığı özetle; detayını gördüğünü iddia etme.`;
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

async function karsilastirmaPromptu(tickers: string[]) {
  if (tickers.length < 2) {
    return tickers.length === 1
      ? `KARŞILAŞTIRMA BAĞLAMI:
- Yalnızca ${tickers[0]} tespit edildi. Karşılaştırma için ikinci hisse eksikse kullanıcıdan netleştirme iste.`
      : "";
  }

  const veriler = (await Promise.all(tickers.map(karsilastirmaVerisiCek))).filter(Boolean) as KarsilastirmaHisse[];
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
    return `- ${h.ticker}: fiyat ${fiyat ? `${fiyat} ₺` : "veri yok"} | günlük ${degisim ?? "veri yok"} | 52H konum ${konum52} | hacim ${hacim}`;
  }).join("\n");

  return `KARŞILAŞTIRMA BAĞLAMI:
${satirlar}

KARŞILAŞTIRMA KILAVUZU:
- Bu veriler yalnızca fiyat, günlük momentum, hacim ve 52 hafta konumu içerir; bilanço ve haber/KAP analizi değildir.
- Yanıtta "net kazanan" ilan etme. Hangi metrikte hangi hissenin öne çıktığını belirt.
- Kıyaslamayı kısa bir tablo mantığıyla yap: momentum, orta vadeli konum, likidite/veri kalitesi, risk.`;
}

function hissePromptu(ticker: string, veri?: HissePromptVeri | null, analiz?: string) {
  if (!veri) {
    return `HİSSE BAĞLAMI:
- Ticker: ${ticker}
- Güncel fiyat verisi sağlanmadı.
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
${analiz ? `\nÖNCEKİ AI ANALİZ ÖZETİ:\n${analiz}` : ""}`;
}

function portfoyPromptu(portfoy?: PortfoyPromptItem[]) {
  if (!portfoy || portfoy.length === 0) return "";

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

  const satirlar = zenginPortfoy.map((p) => {
    const agirlik = toplamDeger > 0 ? ` | Ağırlık: %${((p.guncelDeger / toplamDeger) * 100).toFixed(1)}` : "";
    return `- ${p.ticker}: ${p.adet} lot${p.maliyet ? ` | Maliyet: ${p.maliyet} ₺` : ""}${p.guncelFiyat ? ` | Güncel: ${p.guncelFiyat} ₺` : ""} | Değer: ${p.guncelDeger.toFixed(0)} ₺${agirlik}${p.karZarar !== undefined ? ` | Toplam K/Z: ${p.karZarar > 0 ? "+" : ""}${p.karZarar.toFixed(0)} ₺ (%${p.karZararYuzde?.toFixed(1) ?? (p.maliyetDeger > 0 ? (p.karZarar / p.maliyetDeger * 100).toFixed(1) : "0")})` : ""}${p.degisimYuzde !== undefined ? ` | Günlük: ${p.degisimYuzde > 0 ? "+" : ""}%${p.degisimYuzde}${p.gunlukKatki !== undefined ? ` (${p.gunlukKatki > 0 ? "+" : ""}${p.gunlukKatki.toFixed(0)} ₺)` : ""}` : ""}`;
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

POZİSYON DETAYLARI:
${satirlar}`;
}

function sonKullaniciMesaji(messages: ChatMessage[]): string {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

function niyetSiniflandir(text: string, aktifTicker?: string): ChatIntent {
  const q = text.toLocaleLowerCase("tr-TR");
  const tickerVar = tickerAdaylari(text, aktifTicker).length > 0 || Boolean(aktifTicker);

  if (/\b(alarm|bildir|uyar|takip et|hat[ıi]rlat)\b/.test(q)) return "alarm_aksiyon";
  if (RAKIP_KAYNAK_IFADELERI.some((re) => re.test(text))) return "genel";
  if (/(hisseyi?|bu hisseyi?|şimdi|hemen)\s+(al|sat)\b/i.test(text)) return "hisse_analizi";
  if (/\b(portföy|portfoy|pozisyon|dağılım|agirlik|ağırlık|kar etmişim|zarar|k\/z|getirim|getiri)\b/.test(q)) return "portfoy";
  if (/\b(karşılaştır|kıyasla|hangisi|m[ıiuü]\s+.*\s+m[ıiuü]|versus|vs\.?|farkı ne)\b/.test(q)) return "karsilastirma";
  if (tickerVar && /\b(kaç tl|fiyat|fiyatı|fiyati)\b/.test(q)) return "hisse_analizi";
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
    genel: `AKTİF CEVAP MODU: GENEL FİNANS ASİSTANI
- Kullanıcının sorusunu kısa ve net cevapla.
- Uygunsa 2-3 maddelik pratik kontrol listesi ekle.
- BIST bağlamına dönüştür ama veri uydurma.`,
  };

  return prompts[intent];
}

function veriKapsamiPromptu({
  intent,
  ticker,
  veri,
  portfoy,
  karsilastirmaBaglami,
  haberNedenBaglami,
  alarmTaslak,
}: {
  intent: ChatIntent;
  ticker?: string;
  veri?: HissePromptVeri | null;
  portfoy?: PortfoyPromptItem[];
  karsilastirmaBaglami: string;
  haberNedenBaglami: string;
  alarmTaslak: AlarmTaslak | null;
}) {
  const kapsananlar: string[] = [];
  const eksikler: string[] = [];

  if (ticker) kapsananlar.push(`aktif hisse: ${ticker}`);
  if (veri) kapsananlar.push("gecikmeli fiyat ve fiyat bandı verisi");
  if (portfoy && portfoy.length > 0) kapsananlar.push(`kullanıcının ${portfoy.length} pozisyonluk portföy verisi`);
  if (karsilastirmaBaglami) kapsananlar.push("karşılaştırma için sınırlı piyasa metrikleri");
  if (haberNedenBaglami) kapsananlar.push("son KAP başlıkları veya KAP veri durumu");
  if (alarmTaslak) kapsananlar.push("alarm taslak bilgisi");

  if (!veri && (intent === "hisse_analizi" || ticker)) eksikler.push("aktif hisse için güncel fiyat bağlamı");
  if (intent === "portfoy" && (!portfoy || portfoy.length === 0)) eksikler.push("portföy pozisyonları");
  if (intent === "karsilastirma" && !karsilastirmaBaglami) eksikler.push("karşılaştırılacak ikinci hisse veya karşılaştırma verisi");
  if (intent === "haber_neden" && !haberNedenBaglami) eksikler.push("KAP/haber bağlamı");

  return `VERİ KAPSAMI VE GÜNCELLİK:
- Kullanılabilen bağlam: ${kapsananlar.length > 0 ? kapsananlar.join("; ") : "yalnızca kullanıcının mesajı"}.
- Eksik/sınırlı bağlam: ${eksikler.length > 0 ? eksikler.join("; ") : "belirgin kritik eksik yok"}.
- Fiyat ve portföy değerleri 15 dakika gecikmeli olabilir. Kullanıcı özellikle sormadıkça "canlı", "anlık" veya "gerçek zamanlı" veri varmış gibi konuşma.
- Kullanıcı canlı fiyat erişimini sorarsa: ParaKonuşur içinde sağlanan gecikmeli veriyi yorumlayabildiğini, dış canlı fiyat akışına doğrudan bağlanmadığını söyle. "Hiç fiyat verim yok" gibi konuşma.
- Sayısal yorum yaparken "eldeki gecikmeli veriye göre" veya "bu verilerle" dilini tercih et.
- Haber/KAP yorumlarında yalnızca verilen başlık/veri kapsamına dayan; görmediğin haber detayını okumuş gibi davranma.
- Veri eksikse analizi durdurmak yerine önce eksikliği söyle, sonra eldeki veriye göre sınırlı çerçeve kur.
- Eksik veri için rakip finans siteleri, aracı kurum uygulamaları veya harici analiz platformları önermeyi bırak. Kullanıcıyı ParaKonuşur içindeki ekranlara, portföyüne, izleme listesine, haber/KAP alanına veya mevcut gecikmeli veriye yönlendir.`;
}

export async function POST(req: NextRequest) {
  const requestStart = Date.now();

  // 1. Auth kontrolü
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Yetkisiz istek" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });
  }

  // 2. Günlük mesaj limiti (ücretsiz: 3 mesaj/gün)
  const bugun = new Date().toISOString().split("T")[0];
  const { data: usageData } = await supabaseAdmin
    .from("chatbot_usage")
    .select("mesaj_sayisi")
    .eq("user_id", user.id)
    .eq("gun", bugun)
    .single();

  const mevcutSayi = usageData?.mesaj_sayisi ?? 0;
  const BYPASS_EMAILS = (process.env.CHATBOT_BYPASS_EMAILS ?? "").split(",").map(e => e.trim());
  const limitAtlandi = BYPASS_EMAILS.includes(user.email ?? "");
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

  const { messages, ticker, veri, analiz, portfoy } = await req.json();
  const chatMessages = (messages ?? []) as ChatMessage[];
  const sonMesaj = sonKullaniciMesaji(chatMessages);
  const mesajTickerlari = tickerAdaylari(sonMesaj, ticker);
  const aktifTicker = ticker || mesajTickerlari[0];
  const intent = niyetSiniflandir(sonMesaj, aktifTicker);
  const aktifVeri = veri ?? (aktifTicker && intent === "hisse_analizi" ? await hisseVerisiCek(aktifTicker) : null);
  const karsilastirmaBaglami = intent === "karsilastirma"
    ? await karsilastirmaPromptu(mesajTickerlari)
    : "";
  const haberNedenBaglami = intent === "haber_neden"
    ? await haberNedenPromptu(mesajTickerlari)
    : "";
  const alarmTaslak = intent === "alarm_aksiyon" ? alarmTaslagiCikar(sonMesaj, aktifTicker, aktifVeri) : null;
  const alarmBaglami = alarmTaslak ? alarmPromptu(alarmTaslak) : "";

  const ortakKurallar = `KİMLİK VE TON:
- Sen Pako AI'sın: ParaKonuşur içindeki BIST odaklı finans asistanı.
- Türkçe, sakin, profesyonel ve anlaşılır konuş. Kullanıcı yeni başlayan olabilir; jargon kullanırsan kısa açıklamasını ver.
- Gereksiz uzun konuşma. Normal cevaplarda 120-220 kelime hedefle; kullanıcı detay isterse daha kapsamlı yaz.

GÜVENLİK SINIRLARI:
- Yatırım danışmanı gibi davranma. Emir cümlesiyle "al", "sat", "tut", "portföyünü boşalt", "kesin yükselir/düşer" deme.
- Kesin getiri, hedef fiyat veya garanti vaat etme.
- Tavsiye yerine "izlenebilir", "dikkat edilebilir", "karar için şu veriler kontrol edilmeli" dili kullan.
- Rakip finans platformu, broker/aracı kurum uygulaması veya harici analiz sitesi adı vererek kullanıcıyı dışarı yönlendirme.
- Veri eksikse "ParaKonuşur içinde bu veri şu an yok / elimdeki gecikmeli veriyle yorumlayabilirim" de.
- Cevabın sonunda mutlaka şu cümle yer alsın: "Bu analiz yatırım tavsiyesi değildir."

CEVAP FORMATI:
- Kavram sorularında: önce kısa tanım, sonra nasıl yorumlanır, sonra dikkat edilmesi gereken 2-3 nokta.
- Hisse sorularında: mevcut veri özeti, olumlu/olumsuz sinyaller, izlenecek seviyeler/metrikler ve belirsizlikler.
- Portföy sorularında: toplam tablo, ağırlık/konsantrasyon, günlük hareket, riskler ve takip listesi.
- Veri yoksa bunu açıkça söyle; uydurma veri üretme.

${niyetPromptu(intent)}`;
  const veriKapsami = veriKapsamiPromptu({
    intent,
    ticker: aktifTicker,
    veri: aktifVeri,
    portfoy,
    karsilastirmaBaglami,
    haberNedenBaglami,
    alarmTaslak,
  });

  const systemPrompt = aktifTicker
    ? `${ortakKurallar}

${veriKapsami}

AKTİF EKRAN:
Kullanıcının aktif hisse bağlamı ${aktifTicker}. Yanıtta bu bağlamı kullan ama kullanıcının sorusu farklıysa ona öncelik ver.

${hissePromptu(aktifTicker, aktifVeri, analiz)}

${karsilastirmaBaglami}

${haberNedenBaglami}

${alarmBaglami}

${portfoyPromptu(portfoy)}`
    : `${ortakKurallar}

${veriKapsami}

GENEL BAĞLAM:
Kullanıcı BIST hisseleri, sektörler, piyasa dinamikleri, teknik/temel analiz, portföy ve finans okuryazarlığı konularında soru sorabilir.

${karsilastirmaBaglami}

${haberNedenBaglami}

${alarmBaglami}

${portfoyPromptu(portfoy)}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: chatMessages,
  });

  const content = response.content[0];
  const rawReply = content.type === "text" ? content.text : "";
  const ilkReply = cevabiTemizle(rawReply);
  const ilkQualityFlags = kaliteBayraklari(ilkReply, intent);
  const reply = cevabiGuvenliDileCevir(ilkReply, ilkQualityFlags);
  const qualityFlags = Array.from(new Set([...ilkQualityFlags, ...kaliteBayraklari(reply, intent)]));
  const inputTokens = response.usage?.input_tokens;
  const outputTokens = response.usage?.output_tokens;

  // 3. Cevap sonrası yasaklı ifade filtresi
  if (qualityFlags.includes("yasakli_ifade")) {
    chatbotTelemetryLogla({
      userId: user.id,
      intent,
      ticker: aktifTicker,
      portfoySayisi: Array.isArray(portfoy) ? portfoy.length : 0,
      qualityFlags,
      alarmTaslakVar: Boolean(alarmTaslak),
      engellendi: true,
      sureMs: Date.now() - requestStart,
      inputTokens,
      outputTokens,
    });

    return NextResponse.json({
      reply: `Bu soruyu yanıtlamak için yeterli bilgiye sahip değilim. Lütfen lisanslı bir yatırım danışmanına başvurun.\n\n${YATIRIM_TAVSIYESI_UYARISI}`,
      intent,
      qualityFlags,
      alarmTaslak,
      kalanHak: GUNLUK_LIMIT - mevcutSayi - 1,
      toplamHak: GUNLUK_LIMIT,
    });
  }

  // Kullanım sayacını artır
  if (mevcutSayi === 0) {
    await supabaseAdmin.from("chatbot_usage").insert({ user_id: user.id, gun: bugun, mesaj_sayisi: 1 });
  } else {
    await supabaseAdmin.from("chatbot_usage").update({ mesaj_sayisi: mevcutSayi + 1 }).eq("user_id", user.id).eq("gun", bugun);
  }

  chatbotTelemetryLogla({
    userId: user.id,
    intent,
    ticker: aktifTicker,
    portfoySayisi: Array.isArray(portfoy) ? portfoy.length : 0,
    qualityFlags,
    alarmTaslakVar: Boolean(alarmTaslak),
    engellendi: false,
    sureMs: Date.now() - requestStart,
    inputTokens,
    outputTokens,
  });

  return NextResponse.json({ reply, intent, qualityFlags, alarmTaslak, kalanHak: GUNLUK_LIMIT - mevcutSayi - 1, toplamHak: GUNLUK_LIMIT });
}
