// Portfoy sirketlerinin resmi logolarini kendi sitelerinden indirir.
// Kaynak onceligi: apple-touch-icon (genelde 180x180 gercek logo) >
// og:image > en buyuk boyutlu <link rel="icon">.
// Kullanim:  node scripts/fetch-fon-logos.mjs
// Cikti:     public/fon-logos/<slug>.<ext>  +  lib/fon-logo-files.ts (manifest)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "fon-logos");
mkdirSync(outDir, { recursive: true });

// Domain haritasini lib/fon-logos.ts icinden oku (tek kaynak).
const libSource = readFileSync(join(root, "lib", "fon-logos.ts"), "utf8");
const mapBlock = libSource.split("KURUCU_DOMAINS")[1]?.split("};")[0] ?? "";
const domains = Object.fromEntries(
  [...mapBlock.matchAll(/"([a-z0-9-]+)":\s*"([^"]+)"/g)].map((m) => [m[1], m[2]])
);

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";

async function get(url, asBuffer = false) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return asBuffer ? Buffer.from(await res.arrayBuffer()) : await res.text();
}

function absolutize(href, base) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function pickLogoUrl(html, base) {
  const links = [...html.matchAll(/<link\s[^>]*>/gi)].map((m) => m[0]);
  const attr = (tag, name) => tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1] ?? null;

  // 1) apple-touch-icon (en buyuk sizes)
  const touch = links
    .filter((t) => /rel=["'][^"']*apple-touch-icon/i.test(t))
    .map((t) => ({ href: attr(t, "href"), size: parseInt(attr(t, "sizes") ?? "0", 10) || 0 }))
    .sort((a, b) => b.size - a.size)[0];
  if (touch?.href) return absolutize(touch.href, base);

  // 2) og:image
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  if (og) return absolutize(og, base);

  // 3) en buyuk <link rel="icon">
  const icon = links
    .filter((t) => /rel=["'][^"']*icon/i.test(t))
    .map((t) => ({ href: attr(t, "href"), size: parseInt(attr(t, "sizes") ?? "0", 10) || 0 }))
    .sort((a, b) => b.size - a.size)[0];
  if (icon?.href) return absolutize(icon.href, base);

  return null;
}

function extFrom(url, buffer) {
  const sig = buffer.subarray(0, 12).toString("latin1");
  const textHead = buffer.subarray(0, 256).toString("utf8").trimStart();
  if (sig.startsWith("\x89PNG")) return "png";
  if (sig.startsWith("\xFF\xD8")) return "jpg";
  if (sig.includes("WEBP")) return "webp";
  if (textHead.startsWith("<svg") || textHead.startsWith("<?xml")) return "svg";
  if (sig.startsWith("\x00\x00\x01\x00")) return "ico";
  return null;
}

const manifest = {};
for (const [slug, domain] of Object.entries(domains)) {
  const base = `https://${domain}/`;
  try {
    let logoUrl = null;
    try {
      logoUrl = pickLogoUrl(await get(base), base);
    } catch { /* ana sayfa acilmadi; dogrudan touch-icon dene */ }
    if (!logoUrl) logoUrl = `${base}apple-touch-icon.png`;

    const buffer = await get(logoUrl, true);
    if (buffer.length < 500) throw new Error("cok kucuk, muhtemelen placeholder");
    const ext = extFrom(logoUrl, buffer);
    if (!ext) throw new Error("indirilen dosya gorsel degil");
    const file = `${slug}.${ext}`;
    writeFileSync(join(outDir, file), buffer);
    manifest[slug] = file;
    console.log(`ok    ${slug}  <-  ${logoUrl}`);
  } catch (error) {
    console.log(`atla  ${slug}  (${error.message})`);
  }
}

const lines = Object.entries(manifest)
  .map(([slug, file]) => `  "${slug}": "${file}",`)
  .join("\n");
writeFileSync(
  join(root, "lib", "fon-logo-files.ts"),
  `// Bu dosyayi scripts/fetch-fon-logos.mjs otomatik uretir; elle duzenleme.\n// slug -> public/fon-logos/ altindaki dosya adi\nexport const FON_LOGO_FILES: Record<string, string> = {\n${lines}\n};\n`
);
console.log(`\n${Object.keys(manifest).length}/${Object.keys(domains).length} logo indirildi; lib/fon-logo-files.ts guncellendi.`);
