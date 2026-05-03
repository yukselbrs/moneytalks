import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const companies = JSON.parse(await readFile(path.join(root, "data", "bist-companies.json"), "utf8"));
const outPath = path.join(root, "data", "bist-price-coverage.json");

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0" },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkTicker(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=1mo`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      return { ticker, priceAvailable: false, status: response.status, reason: "http" };
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;
    const timestamps = result?.timestamp || [];

    return {
      ticker,
      priceAvailable: typeof price === "number" && timestamps.length > 0,
      status: response.status,
      price: typeof price === "number" ? price : null,
      currency: result?.meta?.currency || null,
      exchange: result?.meta?.exchangeName || null,
      reason: typeof price === "number" && timestamps.length > 0 ? null : "no_price",
    };
  } catch (error) {
    return {
      ticker,
      priceAvailable: false,
      status: null,
      reason: error instanceof Error ? error.name : "error",
    };
  }
}

async function runLimited(items, limit, worker) {
  const results = [];
  let next = 0;

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const item = items[next++];
        results.push(await worker(item));
      }
    }),
  );

  return results;
}

const checkedAt = new Date().toISOString();
const results = await runLimited(companies, 20, (company) => checkTicker(company.ticker));
results.sort((a, b) => a.ticker.localeCompare(b.ticker, "tr"));

const available = results.filter((result) => result.priceAvailable);
const missing = results.filter((result) => !result.priceAvailable);

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  `${JSON.stringify(
    {
      checkedAt,
      total: results.length,
      available: available.length,
      missing: missing.length,
      missingTickers: missing.map((result) => result.ticker),
      results,
    },
    null,
    2,
  )}\n`,
);

console.log(`Checked ${results.length} tickers`);
console.log(`Available: ${available.length}`);
console.log(`Missing: ${missing.length}`);
if (missing.length) console.log(`Missing tickers: ${missing.map((result) => result.ticker).join(", ")}`);
console.log(`Generated ${path.relative(root, outPath)}`);
