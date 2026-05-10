import fs from "node:fs";

const routePath = "app/api/chatbot/route.ts";
const route = fs.readFileSync(routePath, "utf8");
const companies = JSON.parse(fs.readFileSync("data/bist-companies.json", "utf8"));

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
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

function sirketAdindanTickerAdaylari(text) {
  const normalized = hisseAdiNormalize(text);
  return companies
    .map((h) => ({
      ticker: h.ticker,
      ad: hisseAdiNormalize(h.ad || ""),
      fullName: hisseAdiNormalize(h.fullName || ""),
      kapTitle: hisseAdiNormalize(h.kapTitle || ""),
    }))
    .filter((h) => [h.ad, h.fullName, h.kapTitle].some((ad) => ad && (normalized.includes(ad) || ad.includes(normalized))))
    .sort((a, b) => {
      const aExact = [a.ad, a.fullName, a.kapTitle].some((ad) => ad === normalized) ? 0 : 1;
      const bExact = [b.ad, b.fullName, b.kapTitle].some((ad) => ad === normalized) ? 0 : 1;
      return aExact - bExact || a.ticker.localeCompare(b.ticker, "tr");
    })
    .map((h) => h.ticker);
}

const lowercaseTickerMatches = "kchol kaç tl şu an".match(/\b[A-ZÇĞİÖŞÜ]{3,6}\b/gi) ?? [];
assert(lowercaseTickerMatches.map((t) => t.toLocaleUpperCase("tr-TR")).includes("KCHOL"), "küçük harf ticker KCHOL olarak yakalanıyor");
assert(sirketAdindanTickerAdaylari("Koç holding kaç tl")[0] === "KCHOL", "şirket adı Koç Holding -> KCHOL eşleşiyor");
assert(route.includes("range=1d") && route.includes("range=5d"), "tekil hisse fiyatında 1d önceki kapanış ve 5d destek verisi kullanılıyor");
assert(route.includes("Hazır fiyat cevabı"), "fiyat cevabı modele serbest bırakılmadan hazır satır olarak veriliyor");
assert(route.includes("minimumFractionDigits: 2") && route.includes("maximumFractionDigits: 2"), "TL ve yüzde değerleri 2 basamak format kuralına sahip");
assert(route.includes("rakip_kaynak_yonlendirme") && route.includes("RAKIP_KAYNAK_IFADELERI"), "rakip/harici kaynak yönlendirme filtresi aktif");
assert(route.includes("canli_veri_iddiasi"), "canlı/anlık veri iddiası kalite bayrağı aktif");

if (process.exitCode) {
  console.error("\nPako AI guard kontrolleri başarısız.");
  process.exit(process.exitCode);
}

console.log("\nPako AI guard kontrolleri geçti.");
