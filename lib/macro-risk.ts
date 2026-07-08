export type MacroRiskArticle = {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  matchedKeywords: string[];
  score: number;
};

export type MacroRiskSnapshot = {
  score: number;
  level: "dusuk" | "orta" | "yuksek" | "kritik";
  levelTR: "Düşük" | "Orta" | "Yüksek" | "Kritik";
  summary: string;
  updatedAt: string;
  sources: string[];
  triggers: string[];
  articles: MacroRiskArticle[];
  stale: boolean;
};

type GdeltArticle = {
  title?: string;
  url?: string;
  domain?: string;
  seendate?: string;
  sourceCountry?: string;
  language?: string;
  description?: string;
};

type MacroRiskCache = {
  data: MacroRiskSnapshot;
  ts: number;
};

const CACHE_MS = 10 * 60 * 1000;
const RSS_FETCH_TIMEOUT_MS = 6000;
const GDELT_FETCH_TIMEOUT_MS = 2500;
const MAX_ARTICLES = 12;
const GDELT_MIN_DELAY_MS = 5200;
const DEFAULT_GDELT_QUERY_LIMIT = 1;

const g = globalThis as typeof globalThis & {
  macroRiskCache?: MacroRiskCache;
};

const HIGH_TRUST_SOURCES = [
  "reuters.com",
  "reuters",
  "bloomberg.com",
  "bloomberg",
  "ft.com",
  "financial times",
  "apnews.com",
  "al-monitor.com",
  "aa.com.tr",
  "anadolu",
  "dunya.com",
  "cnnturk.com",
  "milliyet.com.tr",
];

const KEYWORDS = [
  { terms: ["bist", "bist 100", "bist100", "xu100", "borsa", "stock market", "stocks", "equities", "shares", "istanbul bourse"], weight: 10, tag: "BIST/piyasa satışı" },
  { terms: ["halted", "circuit breaker", "devre kesici", "trading halt", "sert satış", "sert satis", "selloff", "sell-off", "market rout", "crash", "çakıldı", "cakildi"], weight: 18, tag: "sert piyasa hareketi" },
  { terms: ["court", "mahkeme", "annulled", "annuls", "invalidates", "voided", "geçersiz", "gecersiz", "iptal", "blow to opposition", "trustee", "kayyum"], weight: 16, tag: "mahkeme/siyasi karar" },
  { terms: ["opposition", "chp", "özgür özel", "ozgur ozel", "kemal kılıçdaroğlu", "kemal kilicdaroglu", "kilicdaroglu", "imamoğlu", "imamoglu"], weight: 14, tag: "muhalefet/CHP krizi" },
  { terms: ["protest", "protests", "protesto", "rally", "demonstration", "detained", "arrest", "gözaltı", "gozalti", "crackdown"], weight: 12, tag: "protesto/gözaltı riski" },
  { terms: ["erdogan", "erdoğan", "political crisis", "siyasi kriz", "democracy", "autocracy", "election dispute"], weight: 10, tag: "siyasi gerilim" },
  { terms: ["lira", "bonds", "bond", "cds", "yield", "tahvil", "kur", "currency", "swap rate"], weight: 8, tag: "finansal stres" },
];

const GDELT_QUERIES = [
  '(Turkey OR Türkiye OR Turkiye OR Turkish) (BIST OR borsa OR "stock market" OR stocks OR lira OR bonds OR court OR opposition OR CHP OR protest OR Erdogan)',
  '(Turkey OR Türkiye OR Turkiye) (BIST OR "stock market" OR borsa OR equities) (court OR opposition OR CHP OR protest OR political)',
  '(Turkey OR Türkiye OR Turkiye) (CHP OR opposition OR "Ozgur Ozel" OR "Kemal Kilicdaroglu") (court OR annulled OR invalidated OR protest)',
  '(Turkey OR Türkiye OR Turkiye) (BIST OR borsa) ("circuit breaker" OR halted OR selloff OR "sert satış" OR crash)',
];

const RSS_SEARCH_QUERIES = [
  "Turkey BIST stock market",
  "Turkey lira bonds stocks",
  "Turkey CHP court opposition",
  "Turkey opposition court stock market",
  "Türkiye borsa siyasi risk",
  "BIST sert satış",
];

const TURKEY_CONTEXT_TERMS = [
  "turkey",
  "turkiye",
  "türkiye",
  "turkish",
  "bist",
  "borsa",
  "istanbul",
  "chp",
  "erdogan",
  "erdoğan",
  "imamoğlu",
  "imamoglu",
  "özgür özel",
  "ozgur ozel",
  "kılıçdaroğlu",
  "kilicdaroglu",
];

function escapeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return escapeXml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function itemText(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  return stripTags(match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, ""));
}

function itemTextAny(item: string, tags: string[]) {
  for (const tag of tags) {
    const value = itemText(item, tag);
    if (value) return value;
  }
  return "";
}

function parseRss(xml: string): GdeltArticle[] {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((match) => {
    const item = match[0];
    const link = itemText(item, "link");
    let source = itemText(item, "source");
    if (!source) {
      const sourceMatch = itemText(item, "title").match(/\s-\s([^-]+)$/);
      source = sourceMatch?.[1]?.trim() ?? "";
    }
    return {
      title: itemText(item, "title"),
      url: link,
      domain: source || safeHostname(link),
      seendate: itemText(item, "pubDate"),
      description: itemTextAny(item, ["description", "content:encoded"]),
    };
  });
}

function safeHostname(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function articleDateMs(article: GdeltArticle) {
  if (!article.seendate) return 0;
  const gdeltDate = article.seendate.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (gdeltDate) {
    const [, y, m, d, hh = "00", mm = "00", ss = "00"] = gdeltDate;
    return Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  }
  const parsed = Date.parse(article.seendate);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreArticle(article: GdeltArticle): MacroRiskArticle | null {
  const title = stripTags(article.title ?? "");
  if (!title || !article.url) return null;
  const haystack = `${title} ${article.description ?? ""} ${article.domain ?? ""} ${article.url ?? ""}`.toLocaleLowerCase("tr-TR");
  if (!TURKEY_CONTEXT_TERMS.some((term) => haystack.includes(term.toLocaleLowerCase("tr-TR")))) return null;
  const matched = new Map<string, number>();
  for (const group of KEYWORDS) {
    if (group.terms.some((term) => haystack.includes(term.toLocaleLowerCase("tr-TR")))) {
      matched.set(group.tag, Math.max(matched.get(group.tag) ?? 0, group.weight));
    }
  }
  if (matched.size === 0) return null;

  const ageHours = articleDateMs(article) > 0 ? Math.max(0, (Date.now() - articleDateMs(article)) / 36e5) : 48;
  const recency = ageHours <= 12 ? 16 : ageHours <= 24 ? 12 : ageHours <= 72 ? 7 : 3;
  const source = (article.domain || safeHostname(article.url) || "haber").replace(/^www\./, "");
  const sourceBonus = HIGH_TRUST_SOURCES.some((host) => source.includes(host)) ? 8 : 3;
  const rawScore = Array.from(matched.values()).reduce((sum, value) => sum + value, 0) + recency + sourceBonus;

  return {
    title,
    url: article.url,
    source,
    publishedAt: article.seendate,
    matchedKeywords: Array.from(matched.keys()),
    score: Math.min(100, rawScore),
  };
}

async function fetchGdelt(query: string, signal: AbortSignal): Promise<GdeltArticle[]> {
  const params = new URLSearchParams({
    query,
    mode: "artlist",
    format: "json",
    maxrecords: "20",
    timespan: "7d",
    sort: "hybridrel",
  });
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, {
    signal,
    headers: { "User-Agent": "ParaKonusur/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GDELT ${response.status}`);
  const data = await response.json() as { articles?: GdeltArticle[] };
  return Array.isArray(data.articles) ? data.articles : [];
}

function gdeltQueryLimit() {
  const parsed = Number(process.env.MAKRO_RISK_GDELT_QUERY_LIMIT ?? DEFAULT_GDELT_QUERY_LIMIT);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(GDELT_QUERIES.length, Math.floor(parsed))) : DEFAULT_GDELT_QUERY_LIMIT;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

async function fetchGdeltArticles(): Promise<GdeltArticle[]> {
  const limit = gdeltQueryLimit();
  const queries = GDELT_QUERIES.slice(0, limit);
  const articles: GdeltArticle[] = [];

  for (let index = 0; index < queries.length; index++) {
    if (index > 0) await sleep(GDELT_MIN_DELAY_MS);
    try {
      const batch = await withSourceTimeout((signal) => fetchGdelt(queries[index], signal), GDELT_FETCH_TIMEOUT_MS);
      articles.push(...batch);
    } catch (error) {
      if (!isAbortError(error)) console.warn("GDELT makro risk sorgusu basarisiz:", error);
    }
  }

  return articles;
}

function configuredRssFeeds() {
  const raw = process.env.MAKRO_RISK_RSS_FEEDS?.trim();
  if (raw) return raw.split(/[\n,|]+/).map((url) => url.trim()).filter(Boolean);

  return RSS_SEARCH_QUERIES.map((query) => {
    const lang = /[ğüşıöçĞÜŞİÖÇ]/.test(query) ? "tr-TR" : "en-US";
    const region = lang === "tr-TR" ? "TR" : "US";
    const ceid = lang === "tr-TR" ? "TR:tr" : "US:en";
    return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${lang}&gl=${region}&ceid=${ceid}`;
  });
}

async function fetchRssFeed(url: string, signal: AbortSignal): Promise<GdeltArticle[]> {
  const response = await fetch(url, {
    signal,
    headers: { "User-Agent": "ParaKonusur/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`RSS ${response.status}`);
  return parseRss(await response.text());
}

async function withSourceTimeout<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function levelFromScore(score: number): MacroRiskSnapshot["level"] {
  if (score >= 85) return "kritik";
  if (score >= 65) return "yuksek";
  if (score >= 35) return "orta";
  return "dusuk";
}

function levelTR(level: MacroRiskSnapshot["level"]): MacroRiskSnapshot["levelTR"] {
  if (level === "kritik") return "Kritik";
  if (level === "yuksek") return "Yüksek";
  if (level === "orta") return "Orta";
  return "Düşük";
}

function articleDedupeKey(article: MacroRiskArticle) {
  return article.title
    .replace(/\s+[-–|]\s+[^-–|]+$/u, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 120);
}

function buildSnapshot(scored: MacroRiskArticle[], stale = false): MacroRiskSnapshot {
  const unique = new Map<string, MacroRiskArticle>();
  for (const article of scored.sort((a, b) => b.score - a.score)) {
    const key = articleDedupeKey(article);
    if (!unique.has(key)) unique.set(key, article);
  }
  const articles = Array.from(unique.values()).slice(0, MAX_ARTICLES);
  const top = articles.slice(0, 5);
  const topScore = top[0]?.score ?? 0;
  const weightedAverage = top.reduce((sum, item, index) => sum + item.score * (1 - index * 0.12), 0) / Math.max(1, top.length);
  const triggerCounts = new Map<string, number>();
  for (const article of articles) {
    for (const trigger of article.matchedKeywords) triggerCounts.set(trigger, (triggerCounts.get(trigger) ?? 0) + 1);
  }
  const triggers = Array.from(triggerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([trigger]) => trigger);
  const sources = Array.from(new Set(articles.map((article) => article.source).filter(Boolean))).slice(0, 6);
  const score = Math.min(100, Math.round(topScore * 0.65 + weightedAverage * 0.35 + triggers.length * 3 + Math.min(articles.length, 5) * 2));
  const level = levelFromScore(score);
  const summary = articles.length === 0
    ? "Son haber akışında Türkiye kaynaklı belirgin makro/siyasi stres sinyali yakalanmadı."
    : `${levelTR(level)} makro risk: ${triggers.join(", ")} başlıkları haber akışında öne çıkıyor.`;

  return {
    score,
    level,
    levelTR: levelTR(level),
    summary,
    updatedAt: new Date().toISOString(),
    sources,
    triggers,
    articles,
    stale,
  };
}

export async function getMacroRiskSnapshot(options: { force?: boolean } = {}): Promise<MacroRiskSnapshot> {
  const now = Date.now();
  if (!options.force && g.macroRiskCache && now - g.macroRiskCache.ts < CACHE_MS) {
    return g.macroRiskCache.data;
  }

  try {
    const gdeltArticlesPromise = fetchGdeltArticles();
    const rssResults = await Promise.allSettled(
      configuredRssFeeds().map((url) => withSourceTimeout((signal) => fetchRssFeed(url, signal), RSS_FETCH_TIMEOUT_MS))
    );
    const gdeltArticles = await gdeltArticlesPromise;
    const raw = [
      ...gdeltArticles,
      ...rssResults.flatMap((result) => result.status === "fulfilled" ? result.value : []),
    ];
    const scored = raw.map(scoreArticle).filter((article): article is MacroRiskArticle => Boolean(article));
    const data = buildSnapshot(scored);
    g.macroRiskCache = { data, ts: now };
    return data;
  } catch (error) {
    if (g.macroRiskCache) return { ...g.macroRiskCache.data, stale: true };
    console.error("Makro risk akisi alinamadi:", error);
    return buildSnapshot([], true);
  }
}

export function macroRiskPromptBlock(snapshot: MacroRiskSnapshot) {
  const articles = snapshot.articles.slice(0, 5).map((article) =>
    `- ${article.title} (${article.source}${article.publishedAt ? `, ${article.publishedAt}` : ""})`
  ).join("\n") || "- Haber sinyali yok.";

  return `MAKRO/SİYASİ RİSK RADARI:
- Skor: ${snapshot.score}/100 (${snapshot.levelTR})
- Özet: ${snapshot.summary}
- Öne çıkan tetikleyiciler: ${snapshot.triggers.join(", ") || "yok"}
- Kaynaklar:
${articles}

Kullanım kuralı: Bu radar kesin neden ilanı değildir; BIST geneli, bankacılık, holding ve yüksek beta hisselerde risk iştahını etkileyebilecek ek bağlam olarak kullan. Yatırım tavsiyesi verme.`;
}
