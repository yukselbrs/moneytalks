import Anthropic from "@anthropic-ai/sdk";

export type KapBildirimTipi =
  | "ozel_durum"
  | "finansal_rapor"
  | "pay_geri_alim"
  | "sermaye_artirimi"
  | "temettu"
  | "genel_kurul"
  | "diger";

export type KapDetay = {
  disclosureIndex: string;
  senderTitle?: string;
  senderExchCodes?: string[];
  subject?: { tr?: string };
  summary?: { tr?: string };
  disclosureType?: string;
  disclosureClass?: string;
  time?: string;
  link?: string;
  flatData?: unknown;
};

export type KapOzet = {
  ozetTekCumle: string;
  ozetNeDemek: string;
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-6";
const MAX_ICERIK_KARAKTER = 4000;

const YASAKLI_KALIPLAR: RegExp[] = [
  /\b(al[ıi]n|sat[ıi]l|al[ıi]m|sat[ıi]m|tut)\s+(tavsiyesi|önerisi)\b/iu,
  /\b(hisseyi?|pay[ıi]|bu\s+hisseyi?)\s+(al|sat|tut)\b/iu,
  /\b(şimdi|hemen|mutlaka|kesinlikle)\s+(al|sat|tut)\b/iu,
  /\b(al[ıi]n[ıi]r|sat[ıi]l[ıi]r|al[ıi]nmal[ıi]|sat[ıi]lmal[ıi])\b/iu,
  /\b(yüksel(ir|ecek|iş bekleniyor)|düş(er|ecek|üş bekleniyor))\b/iu,
  /\b(fiyat[ıi]?\s+(artacak|azalacak|yükselecek|düşecek))\b/iu,
  /\bhedef\s+fiyat\b/iu,
  /\b(f[ıi]rsat|kaç[ıi]rma|kaç[ıi]rmay[ıi]n)\b/iu,
  /\bgaranti\s+(getiri|kazanç|k[aâ]r|kazan[ıi]r|verir)\b/iu,
  /\byat[ıi]r[ıi]m\s+tavsiyesi\s+(ver|öner|et)/iu,
  /\b(kesin(likle)?\s+(kazanç|k[aâ]r|getiri|yükseliş|düşüş))\b/iu,
];

function icerikGuvenli(text: string): boolean {
  return !YASAKLI_KALIPLAR.some((re) => re.test(text));
}

function normalize(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

export function siniflandir(detay: KapDetay): KapBildirimTipi {
  const subject = normalize(detay.subject?.tr ?? "");
  const summary = normalize(detay.summary?.tr ?? "");
  const metin = `${subject} ${summary}`;
  const dType = (detay.disclosureType ?? "").toUpperCase();
  const dClass = (detay.disclosureClass ?? "").toUpperCase();

  if (/\b(paylar[ıi]n geri al|pay geri al|geri al[ıi]m|geri alinma|buyback)\b/.test(metin)) {
    return "pay_geri_alim";
  }
  if (/\b(temettu|kar payi|kar pay dagit|kar pay dagitim|kâr payi|dividend)\b/.test(metin)) {
    return "temettu";
  }
  if (
    /(sermaye artirim|sermaye azaltim|bedelsiz|bedelli|ruchan|kayitli sermaye tavan|ihrac tavan|nitelikli yatirimciya satis|yeni pay alma)/.test(
      metin
    )
  ) {
    return "sermaye_artirimi";
  }
  if (/\b(genel kurul|olagan genel kurul|olaganustu genel kurul)\b/.test(metin)) {
    return "genel_kurul";
  }
  if (dType === "FR" || /\b(finansal rapor|finansal tablo|faaliyet raporu|bilanco|gelir tablosu)\b/.test(metin)) {
    return "finansal_rapor";
  }
  if (dClass === "DUY") {
    return "diger";
  }
  if (dType === "ODA" || dClass === "ODA" || /\b(ozel durum|material event)\b/.test(metin)) {
    return "ozel_durum";
  }
  return "diger";
}

function htmlTemizle(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ONCELIKLI_ALANLAR = new Set([
  "additionalexplanationtr",
  "additionalexplanationtextblocktr",
  "explanationtr",
  "explanation",
  "descriptiontr",
  "summarytr",
  "subjecttr",
  "text",
  "contenttr",
]);

function anlamliMetin(value: string): boolean {
  const temiz = htmlTemizle(value);
  if (temiz.length < 20) return false;
  if (/^tr\.com\.mkk/.test(temiz)) return false;
  if (/^[A-Za-z0-9._-]+$/.test(temiz)) return false;
  return true;
}

function flatDataMetniCikar(value: unknown, oncelikli: string[], digerleri: string[], propKey?: string, depth = 0): void {
  if (depth > 8 || value === null || value === undefined) return;

  if (typeof value === "string") {
    if (!anlamliMetin(value)) return;
    const temiz = htmlTemizle(value);
    const key = (propKey ?? "").toLowerCase();
    if (ONCELIKLI_ALANLAR.has(key) || key.endsWith("tr")) {
      oncelikli.push(temiz);
    } else {
      digerleri.push(temiz);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) flatDataMetniCikar(item, oncelikli, digerleri, propKey, depth + 1);
    return;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const property = typeof obj.property === "string" ? obj.property : undefined;
    for (const [k, v] of Object.entries(obj)) {
      if (k === "property") continue;
      const inheritedKey = k === "string" || k === "text" ? property ?? k : k;
      flatDataMetniCikar(v, oncelikli, digerleri, inheritedKey, depth + 1);
    }
  }
}

function icerikTopla(detay: KapDetay): string {
  const oncelikli: string[] = [];
  const digerleri: string[] = [];
  flatDataMetniCikar(detay.flatData, oncelikli, digerleri);

  const dedup = (arr: string[]) => {
    const seen = new Set<string>();
    return arr.filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
  };

  const parcalar = [...dedup(oncelikli), ...dedup(digerleri)];
  return parcalar.join(" ").slice(0, MAX_ICERIK_KARAKTER).trim();
}

export const TIP_ETIKET: Record<KapBildirimTipi, string> = {
  ozel_durum: "Özel Durum Açıklaması",
  finansal_rapor: "Finansal Rapor / Bilanço",
  pay_geri_alim: "Pay Geri Alım",
  sermaye_artirimi: "Sermaye Artırımı / Azaltımı",
  temettu: "Temettü / Kâr Payı Dağıtımı",
  genel_kurul: "Genel Kurul",
  diger: "Genel KAP Bildirimi",
};

const TIP_KILAVUZ: Record<KapBildirimTipi, string> = {
  ozel_durum:
    "Şirketin operasyonel/özel durum açıklaması. Ne bildirildiğini sade anlat; sonuçları abartma, olayın niteliğini tanımla.",
  finansal_rapor:
    "Dönemsel finansal rapor/bilanço. Hangi döneme ait olduğunu ve raporun ne içerdiğini belirt; sayı yorumlarken 'artış/azalış' gibi olguyu aktar ama fiyat yönü söyleme.",
  pay_geri_alim:
    "Şirketin kendi paylarını geri alması. 'Geri alım' kavramını açıkla: şirket açık piyasadan kendi hisselerini satın alır, bu dolaşımdaki pay sayısını azaltabilir. Fiyat yönü iddia etme.",
  sermaye_artirimi:
    "Sermaye artırımı/azaltımı. Bedelli (ortaklardan para toplanır, rüçhan hakkı) ile bedelsiz (iç kaynaklardan, pay sayısı artar fiyat mekanik olarak bölünür) farkını açıkla. Bedelsizde toplam yatırım değeri değişmez, sadece pay adedi ve birim fiyat mekanik olarak değişir — bunu net anlat.",
  temettu:
    "Kâr payı dağıtımı. Temettünün ne olduğunu açıkla: şirket kârının bir kısmının pay sahiplerine nakit/pay olarak dağıtılması. Dağıtım kararı, oranı ve varsa tarihini belirt. 'Temettü verimi' iddiaları veya fiyat yönü yok.",
  genel_kurul:
    "Genel kurul toplantısı/kararları. Hangi kararların alındığını (gündem sonuçları) sade özetle. Yorum katma, olguyu aktar.",
  diger:
    "Genel bir KAP bildirimi. İçeriği olduğu gibi sade özetle; tip belirsizse aşırı yorumdan kaçın.",
};

function promptOlustur(detay: KapDetay, tip: KapBildirimTipi, tickerlar: string, icerik: string): string {
  return `Sen ParaKonuşur'un KAP açıklama çevirmenisin. Görevin: bir KAP (Kamuyu Aydınlatma Platformu) bildirimini, borsayı yeni tanıyan sıradan bir yatırımcının anlayacağı sade Türkçe'ye çevirmek. Terim kullanırsan hemen açıkla. Nötr, güven veren, jargonsuz ol.

BİLDİRİM META:
- Şirket adı: ${detay.senderTitle ?? "belirtilmemiş"} (şirketten söz ederken BU adı kullan; ticker kodundan ad türetme/tahmin etme)
- İlgili hisse(ler): ${tickerlar || "belirtilmemiş"}
- Bildirim tipi: ${TIP_ETIKET[tip]}
- Konu (subject): ${detay.subject?.tr ?? "yok"}
- Özet (summary): ${detay.summary?.tr ?? "yok"}

BİLDİRİM İÇERİĞİ (KAP'tan çekilmiş, kırpılmış):
${icerik || "Detay metni alınamadı; yalnızca konu ve özet üzerinden yaz."}

BU TİP İÇİN KILAVUZ:
${TIP_KILAVUZ[tip]}

KESİN YASAKLAR (SPK uyumu — ihlal edersen çıktı reddedilir):
- "al", "sat", "tut", "alın", "satın al", "al/sat tavsiyesi" ASLA yazma.
- "yükselir/düşer/yükselecek/düşecek", fiyatın ne yapacağına dair hiçbir yön iddiası yazma.
- Hedef fiyat verme. "fırsat", "kaçırma", "garanti", "kesin kazanç" yazma.
- Yatırım tavsiyesi imâsı yok. Sen bilgilendirme/eğitim yapıyorsun, danışman değilsin.
- Belirsizlikte "olası", "genellikle", "olabilir" dili kullan; kesinlik iddia etme.
- Abartı, clickbait, korku/hırs tetikleyen dil yok. Saygılı ve nötr kal.

ÇIKTI FORMATI — SADECE geçerli JSON döndür, başka hiçbir metin yazma:
{
  "ozetTekCumle": "Tek cümle, sıradan yatırımcı diliyle ne olduğunu söyleyen özet. Nokta ile bit.",
  "ozetNeDemek": "2-4 cümle. 'Bu ne demek' açıklaması: geçen terimi açıkla, bağlam ver, mekanik etkiyi (varsa) tarafsız anlat. Fiyat yönü YOK."
}`;
}

function jsonAyikla(raw: string): KapOzet | null {
  const eslesme = raw.match(/\{[\s\S]*\}/);
  if (!eslesme) return null;
  try {
    const parsed = JSON.parse(eslesme[0]) as Partial<KapOzet>;
    if (typeof parsed.ozetTekCumle !== "string" || typeof parsed.ozetNeDemek !== "string") return null;
    const ozetTekCumle = parsed.ozetTekCumle.trim();
    const ozetNeDemek = parsed.ozetNeDemek.trim();
    if (!ozetTekCumle || !ozetNeDemek) return null;
    return { ozetTekCumle, ozetNeDemek };
  } catch {
    return null;
  }
}

async function ozetCagir(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  return message.content[0]?.type === "text" ? message.content[0].text : "";
}

export async function ozetUret(detay: KapDetay, tip: KapBildirimTipi): Promise<KapOzet> {
  const tickerlar = (detay.senderExchCodes ?? []).join(", ");
  const icerik = icerikTopla(detay);
  const prompt = promptOlustur(detay, tip, tickerlar, icerik);

  let ozet: KapOzet | null = null;

  for (let deneme = 0; deneme < 2 && !ozet; deneme += 1) {
    const raw = await ozetCagir(prompt);
    ozet = jsonAyikla(raw);
  }

  if (!ozet) {
    throw new Error("KAP özeti üretilemedi: JSON çıktısı ayrıştırılamadı.");
  }

  if (!icerikGuvenli(`${ozet.ozetTekCumle} ${ozet.ozetNeDemek}`)) {
    const yenidenRaw = await ozetCagir(
      `${prompt}\n\nÖNEMLİ: Önceki denemende SPK açısından yasaklı bir ifade vardı (al/sat/tut, fiyat yönü, hedef fiyat, garanti, fırsat gibi). Bu ifadelerden tamamen arınmış, nötr ve tanımlayıcı bir çıktı üret.`
    );
    const yeniden = jsonAyikla(yenidenRaw);
    if (yeniden && icerikGuvenli(`${yeniden.ozetTekCumle} ${yeniden.ozetNeDemek}`)) {
      return yeniden;
    }
    throw new Error("KAP özeti SPK filtresini geçemedi: yasaklı ifade tespit edildi.");
  }

  return ozet;
}

export function baglamMetni(ticker: string): string {
  return `Bu bildirim izleme listendeki ${ticker} hissesini ilgilendiriyor. Orijinal KAP açıklamasını okuyup kendi değerlendirmeni yapman önerilir; bu metin yatırım tavsiyesi değildir.`;
}
