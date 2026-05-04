import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const BATCH = 25;
const UPSERT_BATCH = 100;
const DAY_SECONDS = 86400;
const HISTORY_RANGE = "2y";

function loadEnv() {
  const source = readFile(path.join(root, ".env.local"), "utf8").catch(() => "");
  return source.then((text) => {
    const env = {};
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index);
      const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
      env[key] = value;
    }
    return env;
  });
}

function findCloseAtOrBefore(timestamps, closes, targetTs) {
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (timestamps[i] <= targetTs && closes[i] !== null && closes[i] !== undefined) {
      return closes[i];
    }
  }
  return null;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
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

async function fetchHisseData(ticker) {
  try {
    const response = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=${HISTORY_RANGE}`,
    );
    if (!response.ok) return { ticker, row: null, reason: `http_${response.status}` };

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const timestamps = result?.timestamp || [];
    const closes = result?.indicators?.quote?.[0]?.close || [];

    if (!result || timestamps.length === 0 || typeof meta?.regularMarketPrice !== "number") {
      return { ticker, row: null, reason: "no_price" };
    }

    let lastClose = null;
    let previousClose = null;
    for (let i = closes.length - 1; i >= 0; i--) {
      if (closes[i] !== null && closes[i] !== undefined) {
        if (lastClose === null) lastClose = closes[i];
        else {
          previousClose = closes[i];
          break;
        }
      }
    }

    const price = lastClose || meta.regularMarketPrice;
    const lastTs = timestamps[timestamps.length - 1];
    const change = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
    const returnForDays = (days) => {
      const reference = findCloseAtOrBefore(timestamps, closes, lastTs - days * DAY_SECONDS);
      if (!reference) return null;
      return ((price - reference) / reference) * 100;
    };

    return {
      ticker,
      row: {
        ticker,
        fiyat: price,
        degisim_yuzde: change,
        hacim: meta.regularMarketVolume || null,
        piyasa_degeri: meta.marketCap || null,
        getiri_1h: returnForDays(7),
        getiri_1a: returnForDays(30),
        getiri_3a: returnForDays(90),
        getiri_1y: returnForDays(365),
        updated_at: new Date().toISOString(),
      },
      reason: null,
    };
  } catch (error) {
    return { ticker, row: null, reason: error instanceof Error ? error.name : "error" };
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

const env = await loadEnv();
const companies = JSON.parse(await readFile(path.join(root, "data", "bist-companies.json"), "utf8"));

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const startedAt = Date.now();
const results = await runLimited(companies, BATCH, (company) => fetchHisseData(company.ticker));
const rows = results.filter((result) => result.row).map((result) => result.row);
const failed = results.filter((result) => !result.row);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
  const chunk = rows.slice(i, i + UPSERT_BATCH);
  const { error } = await supabase.from("hisse_snapshots").upsert(chunk);
  if (error) throw error;
}

console.log(`Total: ${companies.length}`);
console.log(`Saved: ${rows.length}`);
console.log(`Failed: ${failed.length}`);
if (failed.length) console.log(`Failed tickers: ${failed.map((result) => result.ticker).join(", ")}`);
console.log(`Duration ms: ${Date.now() - startedAt}`);
