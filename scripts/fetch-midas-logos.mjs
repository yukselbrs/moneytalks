import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const missingOnly = !process.argv.includes("--all");
const outDir = path.join(root, "public", "stock-logos", "midas");
const outMapPath = path.join(root, "lib", "midas-stock-logos.ts");

const bistSource = await readFile(path.join(root, "lib", "bist-hisseler.ts"), "utf8");
const stockLogoSource = await readFile(path.join(root, "lib", "stock-logos.ts"), "utf8");

const tickers = [...bistSource.matchAll(/ticker:\s*"([^"]+)"/g)].map((match) => match[1]);
const tradingViewTickers = new Set(
  [...stockLogoSource.matchAll(/^\s{2}([A-Z0-9]+):\s*"/gm)].map((match) => match[1]),
);

const targetTickers = missingOnly ? tickers.filter((ticker) => !tradingViewTickers.has(ticker)) : tickers;
await mkdir(outDir, { recursive: true });

function extFromUrl(url) {
  const clean = new URL(url).pathname.toLowerCase();
  if (clean.endsWith(".png")) return "png";
  if (clean.endsWith(".webp")) return "webp";
  if (clean.endsWith(".jpeg")) return "jpg";
  return "jpg";
}

function findLogoUrl(html) {
  const candidates = [...html.matchAll(/<img\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /alt="[^"]*Logo/i.test(tag))
    .map((tag) => {
      const dataSrc = tag.match(/\bdata-src="([^"]+)"/i)?.[1];
      const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
      return dataSrc || src;
    })
    .filter(Boolean)
    .filter((url) => !url.includes("lazy-loading"));

  return candidates.find((url) => /webcdn\.getmidas\.com\/uploads\//i.test(url));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function runLimited(items, limit, worker) {
  const results = [];
  let next = 0;

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const current = items[next++];
        results.push(await worker(current));
      }
    }),
  );

  return results;
}

const found = [];

await runLimited(targetTickers, 8, async (ticker) => {
  const pageUrl = `https://www.getmidas.com/canli-borsa/${ticker.toLowerCase()}-hisse/`;

  try {
    const page = await fetchWithTimeout(pageUrl);
    if (!page.ok) {
      console.log(`${ticker} page ${page.status}`);
      return null;
    }

    const html = await page.text();
    const logoUrl = findLogoUrl(html);
    if (!logoUrl) {
      console.log(`${ticker} no logo`);
      return null;
    }

    const image = await fetchWithTimeout(logoUrl);
    if (!image.ok) {
      console.log(`${ticker} image ${image.status}`);
      return null;
    }

    const ext = extFromUrl(logoUrl);
    const fileName = `${ticker}.${ext}`;
    const filePath = path.join(outDir, fileName);
    const buffer = Buffer.from(await image.arrayBuffer());

    await writeFile(filePath, buffer);
    found.push([ticker, fileName]);
    console.log(`${ticker} ${fileName}`);
  } catch (error) {
    console.log(`${ticker} ${error instanceof Error ? error.message : "failed"}`);
  }

  return null;
});

found.sort(([a], [b]) => a.localeCompare(b));

const mapBody = found.map(([ticker, fileName]) => `  ${ticker}: "${fileName}",`).join("\n");
const mapSource = `export const MIDAS_STOCK_LOGOS: Record<string, string> = {\n${mapBody}\n};\n`;

await writeFile(outMapPath, mapSource);

console.log(`\nSaved ${found.length}/${targetTickers.length} Midas logos to ${path.relative(root, outDir)}`);
console.log(`Generated ${path.relative(root, outMapPath)}`);
