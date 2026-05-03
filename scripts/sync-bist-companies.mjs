import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "data");
const outPath = path.join(outDir, "bist-companies.json");
const priceCoveragePath = path.join(outDir, "bist-price-coverage.json");
const bistTsPath = path.join(root, "lib", "bist-hisseler.ts");

const DOMAIN_OVERRIDES = {
  AKBNK: "akbank.com",
  ARCLK: "arcelik.com",
  BIMAS: "bim.com.tr",
  BRISA: "brisa.com.tr",
  CCOLA: "cci.com.tr",
  CRFSA: "carrefoursa.com",
  DOAS: "dogusotomotiv.com.tr",
  ENKAI: "enka.com",
  FROTO: "fordotosan.com.tr",
  GARAN: "garanti.com.tr",
  HALKB: "halkbank.com.tr",
  ISCTR: "isbank.com.tr",
  MGROS: "migros.com.tr",
  MPARK: "mlp.com.tr",
  PETKM: "petkim.com.tr",
  PGSUS: "flypgs.com",
  SAHOL: "sabanci.com",
  SASA: "sasa.com.tr",
  SOKM: "sokmarket.com.tr",
  TAVHL: "tav.aero",
  TCELL: "turkcell.com.tr",
  THYAO: "turkishairlines.com",
  TOASO: "tofas.com.tr",
  TTKOM: "turktelekom.com.tr",
  TUPRS: "tupras.com.tr",
  ULKER: "ulker.com.tr",
  VAKBN: "vakifbank.com.tr",
  YKBNK: "yapikredi.com.tr",
};

const RENAMED_TICKERS = {
  KOZAA: "TRMET",
};

function normalizeTicker(ticker) {
  return RENAMED_TICKERS[ticker] || ticker;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.text();
}

function parseStockAnalysisRows(html) {
  return [...html.matchAll(/<a href="\/quote\/ist\/([^/]+)\/">([^<]+)<\/a>.*?<td class="slw[^>]*">([^<]+)<\/td>/g)]
    .map((match) => ({
      ticker: match[1].trim().toUpperCase(),
      name: decodeHtml(match[3].trim()),
    }));
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&uuml;/g, "ü")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&ccedil;/g, "ç")
    .replace(/&Ccedil;/g, "Ç")
    .replace(/&ouml;/g, "ö")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&nbsp;/g, " ");
}

async function fetchActiveStocks() {
  const all = [];

  for (let page = 1; page < 10; page++) {
    const suffix = page === 1 ? "" : `?page=${page}`;
    const html = await fetchText(`https://stockanalysis.com/list/borsa-istanbul/${suffix}`);
    const rows = parseStockAnalysisRows(html);

    if (rows.length === 0) break;

    all.push(...rows);

    if (!html.includes(`?page=${page + 1}`)) break;
  }

  return [...new Map(all.map((row) => [normalizeTicker(row.ticker), { ...row, ticker: normalizeTicker(row.ticker) }])).values()].sort((a, b) =>
    a.ticker.localeCompare(b.ticker, "tr"),
  );
}

function extractArray(text, key) {
  const keyIdx = text.indexOf(key);
  if (keyIdx < 0) throw new Error(`Could not find ${key}`);

  const start = text.indexOf("[", keyIdx);
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === "[") depth++;
    else if (char === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  throw new Error(`Could not close ${key}`);
}

async function fetchKapCompanies() {
  const html = await fetchText("https://www.kap.org.tr/tr/bist-sirketler");
  const flightParts = [...html.matchAll(/<script>self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)<\/script>/g)]
    .map((match) => JSON.parse(`"${match[1]}"`));
  const flightText = flightParts.join("");
  const groups = JSON.parse(extractArray(flightText, '"data":'));
  const rows = groups.flatMap((group) =>
    group.content.flatMap((company) =>
      String(company.stockCode || "")
        .split(",")
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean)
        .map((ticker) => ({
          ticker: normalizeTicker(ticker),
          kapTitle: company.kapMemberTitle || "",
          city: company.cityName || null,
          kapMemberOid: company.kapMemberOid || null,
          group: group.code,
        })),
    ),
  );

  return new Map(rows.filter((row) => row.ticker).map((row) => [row.ticker, row]));
}

function compactName(name) {
  return name
    .replace(/\s+Anonim\s+Sirketi$/i, "")
    .replace(/\s+A\.S\.$/i, "")
    .replace(/\s+A\.Ş\.$/i, "")
    .replace(/\s+ve\s+Ticaret$/i, "")
    .trim();
}

async function main() {
  const [activeStocks, kapMap] = await Promise.all([fetchActiveStocks(), fetchKapCompanies()]);
  const priceCoverage = await readOptionalPriceCoverage();

  const companies = activeStocks.map((stock) => {
    const kap = kapMap.get(stock.ticker);
    const coverage = priceCoverage.get(stock.ticker);
    return {
      ticker: stock.ticker,
      ad: compactName(kap?.kapTitle || stock.name),
      fullName: kap?.kapTitle || stock.name,
      domain: DOMAIN_OVERRIDES[stock.ticker] || undefined,
      kapTitle: kap?.kapTitle || null,
      city: kap?.city || null,
      kapMemberOid: kap?.kapMemberOid || null,
      source: kap ? "stockanalysis+kap" : "stockanalysis",
      listed: true,
      priceAvailable: coverage?.priceAvailable ?? null,
    };
  });

  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, `${JSON.stringify(companies, null, 2)}\n`);

  const bistTsSource = `import bistCompanies from "@/data/bist-companies.json";\n\nexport type BistHisse = {\n  ticker: string;\n  ad: string;\n  domain?: string;\n  fullName?: string;\n  kapTitle?: string | null;\n  city?: string | null;\n  kapMemberOid?: string | null;\n  source?: string;\n  listed?: boolean;\n  priceAvailable?: boolean | null;\n};\n\nexport const BIST_HISSELER = bistCompanies as BistHisse[];\n`;
  await writeFile(bistTsPath, bistTsSource);

  const missingKap = companies.filter((company) => !company.kapTitle).map((company) => company.ticker);
  console.log(`Saved ${companies.length} active BIST companies to ${path.relative(root, outPath)}`);
  console.log(`Updated ${path.relative(root, bistTsPath)}`);
  console.log(`Missing KAP enrichment: ${missingKap.length}${missingKap.length ? ` (${missingKap.join(", ")})` : ""}`);
}

async function readOptionalPriceCoverage() {
  try {
    const coverage = JSON.parse(await readFile(priceCoveragePath, "utf8"));
    return new Map((coverage.results || []).map((result) => [result.ticker, result]));
  } catch {
    return new Map();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
