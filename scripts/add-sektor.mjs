import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const companiesPath = path.join(root, "data", "bist-companies.json");

// TradingView "sector" kolonu ~20 sabit İngilizce kategori döndürür (GICS-benzeri).
// Kaynak: scanner.tradingview.com/turkey/scan, columns: ["sector"], 2026-07-05 tespiti.
const SEKTOR_CEVIRI = {
  Finance: "Finans",
  "Process Industries": "Süreç Endüstrileri",
  "Producer Manufacturing": "Üretici İmalat",
  "Consumer Non-Durables": "Dayanıksız Tüketim Malları",
  "Non-Energy Minerals": "Enerji Dışı Madencilik",
  Utilities: "Kamu Hizmetleri",
  "Consumer Services": "Tüketici Hizmetleri",
  "Consumer Durables": "Dayanıklı Tüketim Malları",
  "Technology Services": "Teknoloji Hizmetleri",
  "Distribution Services": "Dağıtım Hizmetleri",
  "Retail Trade": "Perakende Ticaret",
  "Commercial Services": "Ticari Hizmetler",
  "Electronic Technology": "Elektronik Teknoloji",
  Transportation: "Ulaştırma",
  "Industrial Services": "Endüstriyel Hizmetler",
  "Health Technology": "Sağlık Teknolojisi",
  Miscellaneous: "Çeşitli",
  "Health Services": "Sağlık Hizmetleri",
  "Energy Minerals": "Enerji Madenciliği",
  Communications: "İletişim",
};

async function fetchSektorler(tickers) {
  const res = await fetch("https://scanner.tradingview.com/turkey/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbols: { tickers: tickers.map((ticker) => `BIST:${ticker}`) },
      columns: ["sector"],
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`TradingView scanner returned ${res.status}`);

  const json = await res.json();
  const map = new Map();
  for (const row of json?.data || []) {
    const ticker = String(row.s || "").replace(/^BIST:/, "");
    const sektorEn = row.d?.[0] || null;
    if (ticker) map.set(ticker, sektorEn);
  }
  return map;
}

async function fetchSektorlerChunked(tickers, chunkSize = 100) {
  const map = new Map();
  for (let i = 0; i < tickers.length; i += chunkSize) {
    const chunk = tickers.slice(i, i + chunkSize);
    const chunkMap = await fetchSektorler(chunk);
    for (const [ticker, sektor] of chunkMap) map.set(ticker, sektor);
  }
  return map;
}

async function main() {
  const companies = JSON.parse(await readFile(companiesPath, "utf8"));
  const tickers = companies.map((c) => c.ticker);

  let sektorMap;
  try {
    sektorMap = await fetchSektorler(tickers);
    if (sektorMap.size < tickers.length * 0.5) {
      throw new Error("Tek istekte düşük kapsama, chunk'lara bölünüyor");
    }
  } catch (err) {
    console.warn(`Tek istek başarısız/düşük kapsama (${err.message}), 100'lük chunk'lara bölünüyor.`);
    sektorMap = await fetchSektorlerChunked(tickers, 100);
  }

  const cevrilmemis = new Set();
  let bulunanSayisi = 0;
  let nullSayisi = 0;

  const updated = companies.map((company) => {
    const sektorEn = sektorMap.get(company.ticker);
    if (!sektorEn) {
      nullSayisi++;
      return { ...company, sektor: null };
    }
    bulunanSayisi++;
    const sektorTr = SEKTOR_CEVIRI[sektorEn];
    if (!sektorTr) cevrilmemis.add(sektorEn);
    return { ...company, sektor: sektorTr || sektorEn };
  });

  await writeFile(companiesPath, `${JSON.stringify(updated, null, 2)}\n`);

  const dagilim = new Map();
  for (const company of updated) {
    const key = company.sektor || "(null)";
    dagilim.set(key, (dagilim.get(key) || 0) + 1);
  }

  console.log(`Toplam hisse: ${companies.length}`);
  console.log(`Sektör bulundu: ${bulunanSayisi}, null kaldı: ${nullSayisi}`);
  console.log(`Kapsama: ${((bulunanSayisi / companies.length) * 100).toFixed(1)}%`);
  if (cevrilmemis.size > 0) {
    console.log(`Türkçe eşlemesi olmayan sektörler (İngilizce bırakıldı): ${[...cevrilmemis].join(", ")}`);
  }
  console.log("\nSektör dağılımı:");
  for (const [sektor, adet] of [...dagilim.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${sektor}: ${adet}`);
  }

  if (nullSayisi > 0) {
    const ornekler = updated.filter((c) => !c.sektor).slice(0, 5).map((c) => c.ticker);
    console.log(`\nNull kalan örnekler (ilk 5): ${ornekler.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
