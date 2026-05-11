import fs from "node:fs";

const routePath = "app/api/chatbot/route.ts";
const route = fs.readFileSync(routePath, "utf8");
const companies = JSON.parse(fs.readFileSync("data/bist-companies.json", "utf8"));
const YATIRIM_TAVSIYESI_UYARISI = "Bu analiz yatırım tavsiyesi değildir.";

const TICKER_STOPWORDS = new Set(["BIST", "KAP", "RSI", "MACD", "FAVOK", "FAVÖK", "USD", "TRY", "EUR", "PDD", "PDDD", "PD", "DD"]);
const BIST_TICKER_SET = new Set(companies.map((h) => h.ticker));
const RAKIP_KAYNAK_IFADELERI = [/borsa\s*istanbul/iu, /borsaistanbul\.com/iu, /mynet\s*finans/iu, /investing(?:\.com)?/iu, /tradingview/iu, /fintables/iu, /finnet/iu, /matriks/iu, /foreks/iu, /aracı kurum/iu, /araci kurum/iu];
const YASAKLI_IFADELER = [
  /(hisseyi?|bu hisseyi?|şimdi|hemen)\s+(al|sat)\b/i,
  /\b(sat[ıi]n al|kesinlikle al|kesinlikle sat|mutlaka al|mutlaka sat)\b/i,
  /kesin(likle)?\s*(yüksel|düş)/i,
  /yatırım tavsiyesi (öner(irim|iyorum|ir)?|tavsiye eder(im)?)/i,
  /\bgaranti\s+(getiri|kazanç|kazan[ıi]r|k[aâ]r|yükseliş|düşmez|verir)\b/i,
  /\bhedef\s+fiyat\s*[:=]?\s*\d+/i,
  /\b\d+\s*(gün|hafta|ay)\s+içinde\s+%?\d+\s*(getiri|kazanç|yükselecek|düşecek)\b/i,
];

let failures = 0;
let checks = 0;

function assert(condition, message) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`OK: ${message}`);
  }
}

function hisseAdiNormalize(text) {
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

const HISSE_AD_ESLESMELERI = companies
  .map((h) => ({
    ticker: h.ticker,
    ad: hisseAdiNormalize(h.ad || ""),
    fullName: hisseAdiNormalize(h.fullName || ""),
    kapTitle: hisseAdiNormalize(h.kapTitle || ""),
  }))
  .filter((h) => h.ad.length > 0);

function sirketAdindanTickerAdaylari(text) {
  const normalized = hisseAdiNormalize(text);
  if (normalized.length < 3) return [];

  return HISSE_AD_ESLESMELERI
    .filter((h) => [h.ad, h.fullName, h.kapTitle].some((ad) => ad && (normalized.includes(ad) || ad.includes(normalized))))
    .sort((a, b) => {
      const aExact = [a.ad, a.fullName, a.kapTitle].some((ad) => ad === normalized) ? 0 : 1;
      const bExact = [b.ad, b.fullName, b.kapTitle].some((ad) => ad === normalized) ? 0 : 1;
      return aExact - bExact || a.ticker.localeCompare(b.ticker, "tr");
    })
    .map((h) => h.ticker)
    .slice(0, 4);
}

function tickerAdaylari(text, aktifTicker) {
  const matches = text.match(/\b[A-ZÇĞİÖŞÜ]{3,6}\b/gi) ?? [];
  const sirketTickers = sirketAdindanTickerAdaylari(text);
  const tickers = [...matches, ...sirketTickers, aktifTicker ?? ""]
    .map((t) => t.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ]/g, ""))
    .filter((t) => t.length >= 3 && !TICKER_STOPWORDS.has(t) && BIST_TICKER_SET.has(t));

  return Array.from(new Set(tickers)).slice(0, 4);
}

function sayiParse(text) {
  const normalized = String(text).replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function teknikTaramaIstegiCikar(text) {
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

function niyetSiniflandir(text, aktifTicker) {
  const q = text.toLocaleLowerCase("tr-TR");
  const tickerVar = tickerAdaylari(text, aktifTicker).length > 0 || Boolean(aktifTicker);

  if (/\b(alarm|bildir|uyar|takip et|hat[ıi]rlat)\b/.test(q)) return "alarm_aksiyon";
  if (RAKIP_KAYNAK_IFADELERI.some((re) => re.test(text))) return "genel";
  if (/(hisseyi?|bu hisseyi?|şimdi|hemen)\s+(al|sat)\b/i.test(text)) return "hisse_analizi";
  if (/\b(piyasa|bist|bıst|endeks|endeksi|xu100|xu030|sektör|sektor)\b/.test(q)
    && /\b(bugün|bugun|nasıl|nasil|durum|görünüm|gorunum|genel|özet|ozet|dışında|disinda|ne durumda)\b/.test(q)
    && !/\b(portföyüm|portfoyum|portföyümde|portfoyumde|pozisyonlarım|pozisyonlarim)\b/.test(q)) return "piyasa_genel";
  if (/\b(portföy|portfoy|pozisyon|dağılım|agirlik|ağırlık|kar etmişim|zarar|k\/z|getirim|getiri)\b/.test(q)) return "portfoy";
  if (/\b(karşılaştır|kıyasla|hangisi|m[ıiuü]\s+.*\s+m[ıiuü]|versus|vs\.?|farkı ne)\b/.test(q)) return "karsilastirma";
  if (tickerVar && /\b(kaç tl|fiyat|fiyatı|fiyati)\b/.test(q)) return "hisse_analizi";
  if (teknikTaramaIstegiCikar(text)) return "teknik_tarama";
  if (/\b(nedir|ne demek|nasıl hesaplanır|yorumlanır|anlama gelir|f\/k|fk|pd\/dd|rsi|beta|volatilite|momentum|temettü|hacim anomalisi)\b/.test(q)) return "kavram";
  if (/\b(neden|niye|sebep|haber|kap|düştü|düşüyor|yükseldi|yükseliyor)\b/.test(q)) return "haber_neden";
  if (tickerVar && /\b(nasıl|yorumla|analiz|risk|teknik|temel|ucuz|pahalı|pahali|görünüm|durum|kaç tl|fiyat)\b/.test(q)) return "hisse_analizi";

  return tickerVar ? "hisse_analizi" : "genel";
}

function cevabiTemizle(rawReply) {
  const temiz = rawReply.replace(/\n{3,}/g, "\n\n").replace(/\s+$/g, "").trim();
  if (!temiz) return `Bu soruyu yanıtlamak için yeterli bilgiye sahip değilim.\n\n${YATIRIM_TAVSIYESI_UYARISI}`;

  const uyariRegex = /bu analiz yatırım tavsiyesi değildir\.?/gi;
  const uyariVar = uyariRegex.test(temiz);
  const tekUyarili = temiz.replace(uyariRegex, "").replace(/\n{3,}/g, "\n\n").trim();

  return uyariVar ? `${tekUyarili}\n\n${YATIRIM_TAVSIYESI_UYARISI}`.trim() : `${tekUyarili}\n\n${YATIRIM_TAVSIYESI_UYARISI}`;
}

function kaliteBayraklari(reply, intent) {
  const flags = [];
  if (reply.length > 1800) flags.push("uzun_cevap");
  if (!reply.includes(YATIRIM_TAVSIYESI_UYARISI)) flags.push("uyari_eksik");
  if (YASAKLI_IFADELER.some((re) => re.test(reply))) flags.push("yasakli_ifade");
  if (RAKIP_KAYNAK_IFADELERI.some((re) => re.test(reply))) flags.push("rakip_kaynak_yonlendirme");
  if (/\b(canlı|anlık|gerçek zamanlı)\s+(veri|fiyat|piyasa|takip)\b/i.test(reply)) flags.push("canli_veri_iddiasi");
  if (intent === "haber_neden" && /\bkesin nedeni\b|\btek nedeni\b/i.test(reply)) flags.push("kesin_neden_dili");
  if (intent === "karsilastirma" && /\bnet kazanan\b|\bkesinlikle daha iyi\b/i.test(reply)) flags.push("kesin_karsilastirma_dili");
  return flags;
}

function cevabiGuvenliDileCevir(reply, flags) {
  let duzeltilmis = reply;
  let rakipSatirSilindi = false;

  if (flags.includes("canli_veri_iddiasi")) {
    duzeltilmis = duzeltilmis
      .replace(/\bcanlı\s+(veri|fiyat|piyasa|takip)\b/gi, "gecikmeli $1")
      .replace(/\banlık\s+(veri|fiyat|piyasa|takip)\b/gi, "gecikmeli $1")
      .replace(/\bgerçek zamanlı\s+(veri|fiyat|piyasa|takip)\b/gi, "gecikmeli $1");
  }

  if (flags.includes("kesin_neden_dili")) {
    duzeltilmis = duzeltilmis.replace(/\bkesin nedeni\b/gi, "olası nedenlerinden biri").replace(/\btek nedeni\b/gi, "olası nedenlerinden biri");
  }

  if (flags.includes("kesin_karsilastirma_dili")) {
    duzeltilmis = duzeltilmis.replace(/\bnet kazanan\b/gi, "bu metriklerde öne çıkan taraf").replace(/\bkesinlikle daha iyi\b/gi, "bu metriklerde daha güçlü görünüyor");
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

function tlFormatla(value) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;
}

function yuzdeFormatla(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const isaret = value >= 0 ? "+" : "-";
  return `${isaret}%${Math.abs(value).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const soruSeti = [
  { q: "F/K oranı nedir?", intent: "kavram", group: "kavram" },
  { q: "PD/DD nasıl yorumlanır?", intent: "kavram", group: "kavram" },
  { q: "RSI 30 altına düşerse ne anlama gelir?", intent: "kavram", group: "kavram" },
  { q: "Beta katsayısı yüksek hisse daha mı riskli?", intent: "kavram", group: "kavram" },
  { q: "Volatilite ne demek?", intent: "kavram", group: "kavram" },
  { q: "Temettü verimi nasıl hesaplanır?", intent: "kavram", group: "kavram" },
  { q: "Hacim anomalisi neden önemlidir?", intent: "kavram", group: "kavram" },
  { q: "Momentum göstergesi nasıl yorumlanır?", intent: "kavram", group: "kavram" },
  { q: "GARAN nasıl görünüyor?", intent: "hisse_analizi", group: "hisse" },
  { q: "thyAO kaç tl şu an?", intent: "hisse_analizi", group: "hisse", ticker: "THYAO" },
  { q: "Koç holding kaç tl", intent: "hisse_analizi", group: "hisse", ticker: "KCHOL" },
  { q: "ASELS teknik olarak güçlü mü?", intent: "hisse_analizi", group: "hisse" },
  { q: "FROTO riskli mi?", intent: "hisse_analizi", group: "hisse" },
  { q: "BIMAS ucuz mu pahalı mı?", intent: "hisse_analizi", group: "hisse" },
  { q: "kchol fiyatı nedir?", intent: "hisse_analizi", group: "hisse", ticker: "KCHOL" },
  { q: "TUPRS görünümünü yorumla", intent: "hisse_analizi", group: "hisse" },
  { q: "Portföyüm bugün neden arttı?", intent: "portfoy", group: "portfoy" },
  { q: "Portföyümde en büyük risk ne?", intent: "portfoy", group: "portfoy" },
  { q: "Ne kadar kar etmişim?", intent: "portfoy", group: "portfoy" },
  { q: "Portföy dağılımım dengeli mi?", intent: "portfoy", group: "portfoy" },
  { q: "Günlük getirim neden değişti?", intent: "portfoy", group: "portfoy" },
  { q: "Pozisyon ağırlıklarımı yorumla", intent: "portfoy", group: "portfoy" },
  { q: "Portföyümde zarar edenleri açıkla", intent: "portfoy", group: "portfoy" },
  { q: "Getirim endekse göre iyi mi?", intent: "portfoy", group: "portfoy" },
  { q: "Bugün piyasa nasıl?", intent: "piyasa_genel", group: "piyasa" },
  { q: "Portföy dışında genel piyasa ne durumda?", intent: "piyasa_genel", group: "piyasa" },
  { q: "BIST genel görünüm özetini ver", intent: "piyasa_genel", group: "piyasa" },
  { q: "GARAN mı AKBNK mi?", intent: "karsilastirma", group: "karsilastirma" },
  { q: "THYAO ile PGSUS karşılaştır", intent: "karsilastirma", group: "karsilastirma" },
  { q: "FROTO mu TOASO mu daha güçlü?", intent: "karsilastirma", group: "karsilastirma" },
  { q: "ASELS ve KCHOL kıyasla", intent: "karsilastirma", group: "karsilastirma" },
  { q: "BIMAS versus MGROS", intent: "karsilastirma", group: "karsilastirma" },
  { q: "TUPRS ile PETKM farkı ne?", intent: "karsilastirma", group: "karsilastirma" },
  { q: "rsi 30un altında olan hisseler neler", intent: "teknik_tarama", group: "tarama" },
  { q: "hacmi artan hisseleri tara", intent: "teknik_tarama", group: "tarama" },
  { q: "52 hafta dibine yakın hisseler neler", intent: "teknik_tarama", group: "tarama" },
  { q: "bugün yüzde 5 düşen hisseleri göster", intent: "teknik_tarama", group: "tarama" },
  { q: "momentumu güçlenen hisseleri bul", intent: "teknik_tarama", group: "tarama" },
  { q: "EREGL mi KRDMD mi?", intent: "karsilastirma", group: "karsilastirma" },
  { q: "GARAN neden düştü?", intent: "haber_neden", group: "haber" },
  { q: "THYAO neden yükseliyor?", intent: "haber_neden", group: "haber" },
  { q: "ASELS haber var mı?", intent: "haber_neden", group: "haber" },
  { q: "KAP açıklaması fiyatı etkiledi mi?", intent: "haber_neden", group: "haber" },
  { q: "KCHOL niye hareketli?", intent: "haber_neden", group: "haber" },
  { q: "TUPRS düşüyor sebep ne?", intent: "haber_neden", group: "haber" },
  { q: "BIST bugün neden sert?", intent: "piyasa_genel", group: "piyasa" },
  { q: "FROTO yükseldi haber mi geldi?", intent: "haber_neden", group: "haber" },
  { q: "GARAN 140 üstüne çıkarsa uyar", intent: "alarm_aksiyon", group: "alarm" },
  { q: "THYAO yüzde 5 düşerse bildir", intent: "alarm_aksiyon", group: "alarm" },
  { q: "RSI 30 altına inerse alarm kur", intent: "alarm_aksiyon", group: "alarm" },
  { q: "KCHOL 220 TL olunca hatırlat", intent: "alarm_aksiyon", group: "alarm" },
  { q: "Bu hisseyi hemen al", intent: "hisse_analizi", group: "yasakli" },
  { q: "GARAN kesinlikle satılır mı?", intent: "hisse_analizi", group: "yasakli" },
  { q: "Hedef fiyat 250 TL olur mu?", intent: "hisse_analizi", group: "yasakli" },
  { q: "1 ay içinde yüzde 20 kazandırır mı?", intent: "genel", group: "yasakli" },
  { q: "Canlı fiyat bilgilerine erişimin var mı?", intent: "genel", group: "veri" },
  { q: "Mynet Finans'tan bakayım mı?", intent: "genel", group: "rakip" },
];

console.log("\nSoru seti");
assert(soruSeti.length === 57, "57 örnek soru tanımlı");
for (const group of ["kavram", "hisse", "portfoy", "piyasa", "karsilastirma", "haber", "alarm", "yasakli", "tarama"]) {
  assert(soruSeti.some((s) => s.group === group), `${group} soru grubu var`);
}

console.log("\nIntent regression");
for (const item of soruSeti) {
  const tickers = tickerAdaylari(item.q);
  const intent = niyetSiniflandir(item.q, tickers[0]);
  assert(intent === item.intent, `"${item.q}" -> ${item.intent}`);
  if (item.ticker) assert(tickers[0] === item.ticker, `"${item.q}" ticker -> ${item.ticker}`);
}

console.log("\nCevap guard testleri");
const temiz = cevabiTemizle("Kısa cevap.\n\nBu analiz yatırım tavsiyesi değildir.\n\nBu analiz yatırım tavsiyesi değildir.");
assert((temiz.match(new RegExp(YATIRIM_TAVSIYESI_UYARISI, "g")) || []).length === 1, "yatırım tavsiyesi uyarısı tekilleştiriliyor");
assert(cevabiTemizle("").includes(YATIRIM_TAVSIYESI_UYARISI), "boş cevap fallback uyarı içeriyor");
assert(kaliteBayraklari("Bu hisseyi hemen al.\n\nBu analiz yatırım tavsiyesi değildir.", "hisse_analizi").includes("yasakli_ifade"), "yasaklı al/sat ifadesi yakalanıyor");
assert(kaliteBayraklari("Hedef fiyat 250 TL.\n\nBu analiz yatırım tavsiyesi değildir.", "hisse_analizi").includes("yasakli_ifade"), "hedef fiyat ifadesi yakalanıyor");
assert(kaliteBayraklari("Bu kesin nedeni haber akışıdır.\n\nBu analiz yatırım tavsiyesi değildir.", "haber_neden").includes("kesin_neden_dili"), "kesin neden dili yakalanıyor");
assert(kaliteBayraklari("Burada net kazanan GARAN.\n\nBu analiz yatırım tavsiyesi değildir.", "karsilastirma").includes("kesin_karsilastirma_dili"), "kesin karşılaştırma dili yakalanıyor");
assert(kaliteBayraklari("Canlı fiyat verisi görüyorum.\n\nBu analiz yatırım tavsiyesi değildir.", "genel").includes("canli_veri_iddiasi"), "canlı veri iddiası yakalanıyor");
assert(kaliteBayraklari("TradingView üzerinden bakabilirsin.\n\nBu analiz yatırım tavsiyesi değildir.", "genel").includes("rakip_kaynak_yonlendirme"), "rakip kaynak yönlendirmesi yakalanıyor");
assert(kaliteBayraklari("x".repeat(1801) + `\n\n${YATIRIM_TAVSIYESI_UYARISI}`, "genel").includes("uzun_cevap"), "cevap uzunluğu bayrağı çalışıyor");

const guvenli = cevabiGuvenliDileCevir("Canlı fiyat verisi TradingView'da var.\nKesin nedeni haber.\n\nBu analiz yatırım tavsiyesi değildir.", ["canli_veri_iddiasi", "rakip_kaynak_yonlendirme", "kesin_neden_dili"]);
assert(!/TradingView/i.test(guvenli), "rakip kaynak satırı temizleniyor");
assert(!/canlı fiyat verisi/i.test(guvenli), "canlı veri iddiası yumuşatılıyor");
assert(!/kesin nedeni/i.test(guvenli), "kesin neden dili yumuşatılıyor");
assert(guvenli.includes(YATIRIM_TAVSIYESI_UYARISI), "güvenli dönüşüm uyarıyı koruyor");

console.log("\nFormat regression");
assert(tlFormatla(213) === "213,00", "TL formatı 2 basamak");
assert(tlFormatla(213.5) === "213,50", "TL küsurat formatı 2 basamak");
assert(yuzdeFormatla(0.7092198581560284) === "+%0,71", "pozitif yüzde formatı Türkçe ve 2 basamak");
assert(yuzdeFormatla(-1.2) === "-%1,20", "negatif yüzde formatı Türkçe ve 2 basamak");

console.log("\nPrompt/static regression");
assert(route.includes("AKTİF CEVAP MODU: KAVRAM AÇIKLAMA"), "kavram prompt modu var");
assert(route.includes("AKTİF CEVAP MODU: HİSSE ANALİZİ"), "hisse analiz prompt modu var");
assert(route.includes("AKTİF CEVAP MODU: TEKNİK TARAMA"), "teknik tarama prompt modu var");
assert(route.includes("AKTİF CEVAP MODU: PORTFÖY KOÇU"), "portföy prompt modu var");
assert(route.includes("AKTİF CEVAP MODU: KARŞILAŞTIRMA"), "karşılaştırma prompt modu var");
assert(route.includes("AKTİF CEVAP MODU: NEDEN/HABER YORUMU"), "haber nedeni prompt modu var");
assert(route.includes("AKTİF CEVAP MODU: AKSİYON/ALARM"), "alarm prompt modu var");
assert(route.includes("AKTİF CEVAP MODU: GENEL PİYASA RADARI"), "genel piyasa prompt modu var");
assert(route.includes("Cevabın sonunda mutlaka şu cümle yer alsın"), "yatırım tavsiyesi uyarısı sistem promptunda zorunlu");
assert(route.includes("Rakip finans platformu"), "rakip yönlendirme yasağı sistem promptunda var");
assert(route.includes("Hazır fiyat cevabı"), "fiyat regression promptu var");
assert(route.includes("TEKNİK TARAMA BAĞLAMI"), "teknik tarama bağlamı var");
assert(route.includes("PAKO AKIL PLANI"), "Pako akıl planı promptu var");
assert(route.includes("Veri kullanım sırası"), "akıl planı veri önceliğini belirtiyor");
assert(route.includes("gereksiz netleştirme sorusu sorma"), "akıl planı gereksiz soru sormayı sınırlıyor");
assert(route.includes("rakam yoksa uydurma"), "akıl planı sayısal uydurmayı engelliyor");
assert(route.includes("PORTFÖY DOKTORU"), "portföy doktoru bağlamı var");
assert(route.includes("Doktor skoru"), "portföy doktoru skor üretiyor");
assert(route.includes("tradingViewSektorBilgisiCek"), "sektör verisi TradingView scanner'dan çekiliyor");
assert(route.includes("columns: [\"name\", \"sector\", \"industry\"]"), "sektör ve endüstri kolonları isteniyor");
assert(route.includes("Sektör dağılımı"), "portföy doktoru sektör dağılımı üretiyor");
assert(route.includes("Sektör verisi yok"), "sektör verisi yoksa tahmin yerine veri yok deniyor");
assert(route.includes("relatif hacim"), "teknik tarama relatif hacim destekliyor");
assert(route.includes("52 hafta dibine"), "teknik tarama 52 hafta yakınlığı destekliyor");
assert(route.includes("momentumu güçlenen"), "teknik tarama momentum modu destekliyor");
assert(route.includes("metrik skoru"), "karşılaştırma skoru promptu var");
assert(route.includes("Cevap derinliği"), "akıl planı cevap derinliği belirtiyor");
assert(route.includes("TRADINGVIEW_TEKNIK_KOLONLARI"), "TradingView teknik kolon seti var");
assert(route.includes("\"MACD.macd\"") && route.includes("\"MACD.signal\"") && route.includes("\"MACD.hist\""), "MACD kolonları çekiliyor");
assert(route.includes("\"EMA20\"") && route.includes("\"SMA200\""), "EMA/SMA kolonları çekiliyor");
assert(route.includes("\"BB.upper\"") && route.includes("\"BB.lower\""), "Bollinger kolonları çekiliyor");
assert(route.includes("\"ATR\"") && route.includes("\"Volatility.D\"") && route.includes("\"beta_1_year\""), "ATR volatilite beta kolonları çekiliyor");
assert(route.includes("\"Perf.W\"") && route.includes("\"Perf.1M\"") && route.includes("\"Perf.3M\"") && route.includes("\"Perf.Y\""), "performans kolonları çekiliyor");
assert(route.includes("\"market_cap_basic\"") && route.includes("\"average_volume_30d_calc\""), "piyasa değeri ve ortalama hacim kolonları çekiliyor");
assert(route.includes("\"price_52_week_high\"") && route.includes("\"price_52_week_low\""), "52 hafta kolonları doğru isimlerle çekiliyor");
assert(route.includes("\"Pivot.M.Classic.S1\"") && route.includes("\"Pivot.M.Classic.R1\""), "pivot destek direnç kolonları çekiliyor");
assert(route.includes("TEKNİK METRİKLER"), "aktif hisse teknik metrik özeti var");
assert(route.includes("TRADINGVIEW_TEMEL_KOLONLARI"), "TradingView temel kolon seti var");
assert(route.includes("\"price_earnings_ttm\"") && route.includes("\"price_book_ratio\""), "F/K ve PD/DD kolonları çekiliyor");
assert(route.includes("\"enterprise_value_ebitda_ttm\""), "FD/FAVÖK kolonu çekiliyor");
assert(route.includes("\"total_revenue\"") && route.includes("\"net_income\"") && route.includes("\"ebitda\""), "gelir net kar FAVÖK kolonları çekiliyor");
assert(route.includes("\"gross_margin\"") && route.includes("\"net_margin\"") && route.includes("\"return_on_equity\""), "marj ve ROE kolonları çekiliyor");
assert(route.includes("\"total_assets\"") && route.includes("\"total_liabilities_fq\"") && route.includes("\"total_equity_fq\""), "bilanço kolonları çekiliyor");
assert(route.includes("\"total_debt_fq\"") && route.includes("\"cash_n_short_term_invest_fq\"") && route.includes("\"debt_to_equity_fq\""), "borç nakit kolonları çekiliyor");
assert(route.includes("\"dividends_yield_current\"") && route.includes("\"dividend_payout_ratio_ttm\""), "temettü kolonları çekiliyor");
assert(route.includes("TEMEL ANALİZ METRİKLERİ"), "aktif hisse temel metrik özeti var");
assert(route.includes("temettuGecmisiCek"), "hisse bazlı temettü geçmişi çekiliyor");
assert(route.includes("events=dividends&range=5y"), "5 yıllık Yahoo temettü geçmişi isteniyor");
assert(route.includes("TEMETTÜ GEÇMİŞİ"), "aktif hisse temettü geçmişi özeti var");
assert(route.includes("Son 12 ay toplam temettü"), "temettü son 12 ay toplamı hesaplanıyor");
assert(route.includes("yaklasikSon12AyVerim"), "temettü verimi fiyatla yaklaşık hesaplanıyor");
assert(route.includes("temettüyü garanti gelir gibi sunma"), "temettü garanti diline karşı prompt freni var");
assert(route.includes("sektorEndeksiEsle"), "sektör endeksi eşleme fonksiyonu var");
assert(route.includes("XU100.IS") && route.includes("XU030.IS"), "XU100 ve XU030 kıyası çekiliyor");
assert(route.includes("XBANK.IS") && route.includes("XUSIN.IS") && route.includes("XUTEK.IS"), "ana sektör endeksi sembolleri destekleniyor");
assert(route.includes("PİYASA/SEKTÖR KIYASI"), "aktif hisse piyasa sektör kıyası özeti var");
assert(route.includes("goreliPerformansSatiri"), "göreli performans hesaplanıyor");
assert(route.includes("hisse hareketini XU100, XU030 ve sektör endeksiyle ayrıştır"), "endeks sektör ayrıştırma prompt freni var");
assert(route.includes("kapHaberOlustur"), "KAP detayından haber nesnesi oluşturuluyor");
assert(route.includes("kapDetayMetniCikar"), "KAP detay metni esnek çıkarılıyor");
assert(route.includes("kapOlayTipiSiniflandir"), "KAP olay tipi sınıflandırılıyor");
assert(route.includes("kapEtkiEtiketiCikar"), "KAP olası etki etiketi çıkarılıyor");
assert(route.includes("Anahtar noktalar"), "KAP anahtar noktaları prompta ekleniyor");
assert(route.includes("Detay görüldü"), "KAP detay kapsamı prompta ekleniyor");
assert(route.includes("Detay özeti: veri yok; yalnızca başlık/metadata görüldü"), "KAP detay yoksa sınırlı yorum dili var");
assert(route.includes("Etki etiketini sadece ön sınıflandırma olarak kullan"), "KAP etki etiketi kesin hükme çevrilmiyor");
assert(route.includes("fiyatın haberden önce/sonra hareketi"), "KAP fiyat zamanlaması kontrolü isteniyor");
assert(route.includes("\"float_shares_outstanding\"") && route.includes("\"total_shares_outstanding_fundamental\""), "halka açık pay ve toplam pay kolonları çekiliyor");
assert(route.includes("\"market_cap_calc\"") && route.includes("\"number_of_shareholders\""), "halka açık piyasa değeri ve hissedar sayısı kolonları çekiliyor");
assert(route.includes("halkaAciklikOrani"), "halka açıklık oranı hesaplanıyor");
assert(route.includes("TAKAS/YABANCI VERİ KAPSAMI"), "takas yabancı veri kapsamı özeti var");
assert(route.includes("Gerçek MKK/takas saklama dağılımı: veri yok"), "gerçek takas verisi yoksa açıkça söyleniyor");
assert(route.includes("yabancı alımı/satımı varmış gibi konuşma"), "yabancı işlem uydurma freni var");
assert(route.includes("halka açıklık/pay yapısı verisini yabancı takas gibi sunma"), "halka açıklık yabancı takasla karıştırılmıyor");
assert(route.includes("GENEL_PIYASA_ENDEKSLERI"), "genel piyasa endeks seti var");
assert(route.includes("genelPiyasaBaglamiCek"), "genel piyasa bağlamı çekiliyor");
assert(route.includes("GENEL PİYASA BAĞLAMI"), "genel piyasa prompt bağlamı var");
assert(route.includes("Piyasa genişliği"), "piyasa genişliği hesaplanıp prompta giriyor");
assert(route.includes("En çok yükselenler") && route.includes("En çok düşenler"), "genel piyasa yükselen/düşen listeleri var");
assert(route.includes("Genel piyasa verisine erişimim yok"), "genel piyasa yok iddiasını engelleyen prompt var");
assert(route.includes("portföy cevabına çevirmeme"), "genel piyasa sorusu portföye kaydırılmıyor");
assert(route.includes("chatbotTelemetryLogla"), "telemetry akışı korunuyor");

if (failures > 0) {
  console.error(`\nPako AI kalite kontrolleri başarısız: ${failures}/${checks}`);
  process.exit(1);
}

console.log(`\nPako AI kalite kontrolleri geçti: ${checks}/${checks}`);
