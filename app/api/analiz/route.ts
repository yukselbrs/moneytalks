import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { BIST_HISSELER } from "@/lib/bist-hisseler";
import { normalizeTicker, extractBearerToken } from "@/lib/utils";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function titleCaseTr(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1))
    .join(" ");
}

function displayCompanyName(raw: string) {
  return titleCaseTr(raw)
    .replace(/\s+T\.a\.ş\.$/i, "")
    .replace(/\s+T\.a\.o\.$/i, "")
    .replace(/\s+A\.ş\.$/i, "")
    .replace(/\s+A\.o\.$/i, "")
    .replace(/\s+Anonim Şirketi$/i, "")
    .replace(/\s+Anonim Ortaklığı$/i, "")
    .trim();
}

async function getHisseVerisi(ticker: string) {
  try {
    // 5d → genel meta + hacim + 52H verileri
    // 1d → doğru chartPreviousClose (5d'de stale veri dönebilir, özellikle sermaye artırımı sonrası)
    const [res5d, res1d] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=5d`, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=1d`, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }),
    ]);
    const [data5d, data1d] = await Promise.all([res5d.json(), res1d.json()]);
    const result = data5d?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;
    // Önceki kapanış: range=1d'den al (range=5d'de stale close dönebilir)
    const meta1d = data1d?.chart?.result?.[0]?.meta;
    const rawOncekiKapanis: number | null = meta1d?.chartPreviousClose || meta.chartPreviousClose || meta.previousClose || null;
    const guncelFiyat: number = meta.regularMarketPrice;

    // Bedelsiz/split tespiti: prevClose/açılış oranı tam sayıya yakınsa (≥2, %10 tolerans) bedelsiz var
    let oncekiKapanis = rawOncekiKapanis;
    if (rawOncekiKapanis && rawOncekiKapanis > 0) {
      const openPrice: number = meta.regularMarketOpen > 0 ? meta.regularMarketOpen : guncelFiyat;
      const ratio = rawOncekiKapanis / openPrice;
      const rounded = Math.round(ratio);
      if (rounded >= 2 && Math.abs(ratio - rounded) / ratio < 0.10) {
        oncekiKapanis = rawOncekiKapanis / rounded;
      }
    }

    const rawDegisim = oncekiKapanis && oncekiKapanis > 0
      ? ((guncelFiyat - oncekiKapanis) / oncekiKapanis) * 100
      : null;
    // Split günü chartPreviousClose stale kalabilir — aşırı değişimde Yahoo'nun değerini kullan
    const degisimYuzde = rawDegisim !== null && Math.abs(rawDegisim) > 50
      ? (meta.regularMarketChangePercent ?? rawDegisim)
      : (rawDegisim ?? meta.regularMarketChangePercent ?? null);
    const localCompany = BIST_HISSELER.find((h) => h.ticker === ticker);
    const companyName = localCompany?.fullName || localCompany?.ad || meta.longName || meta.shortName || "";
    return {
      fiyat: guncelFiyat,
      oncekiKapanis,
      degisimYuzde,
      hacim: meta.regularMarketVolume,
      yillikYuksek: meta.fiftyTwoWeekHigh,
      yillikDusuk: meta.fiftyTwoWeekLow,
      gunlukYuksek: meta.regularMarketDayHigh,
      gunlukDusuk: meta.regularMarketDayLow,
      sirketAdi: displayCompanyName(companyName),
      domain: localCompany?.domain,
    };
  } catch {
    return null;
  }
}

const RATE_LIMIT = 10;
const RATE_WINDOW = 3600000;

const g = globalThis as typeof globalThis & {
  analizRateLimit?: Map<string, { count: number; ts: number }>;
  analizRateLimitCleanup?: NodeJS.Timeout;
};
if (!g.analizRateLimit) g.analizRateLimit = new Map();
if (!g.analizRateLimitCleanup) {
  g.analizRateLimitCleanup = setInterval(() => {
    const now = Date.now();
    g.analizRateLimit!.forEach((v, k) => { if (now - v.ts > RATE_WINDOW * 2) g.analizRateLimit!.delete(k); });
  }, RATE_WINDOW);
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const map = g.analizRateLimit!;
  const entry = map.get(key);
  if (!entry || now - entry.ts > RATE_WINDOW) {
    map.set(key, { count: 1, ts: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  let body: { ticker?: unknown; veriOnly?: unknown; kisaYorum?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const ticker = normalizeTicker(body.ticker);
  if (!ticker) return NextResponse.json({ error: "Geçersiz ticker" }, { status: 400 });

  const veri = await getHisseVerisi(ticker);

  if (body.veriOnly === true) {
    return NextResponse.json({ veri });
  }

  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Analiz için giriş gerekli" }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Geçersiz token" }, { status: 401 });
  }

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: "Saatte en fazla 10 analiz yapabilirsiniz. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  const veriMetni = veri
    ? `Guncel piyasa verisi:
- Fiyat: ${veri.fiyat} ₺
- Gunluk aralik: ${veri.gunlukDusuk} - ${veri.gunlukYuksek} ₺
- 52 haftalik aralik: ${veri.yillikDusuk} - ${veri.yillikYuksek} ₺
- Gunluk islem hacmi: ${veri.hacim > 0 ? veri.hacim?.toLocaleString() + " adet" : "Endeks icin gecerli degil"}`
    : "Guncel fiyat verisi alinamadi.";

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: body.kisaYorum === true
            ? `Sen bir Turk borsasi uzmanisisin. ${ticker} icin asagidaki veriyi kullanarak TAM OLARAK 1 cumlelik ozet yaz. Cümle nokta ile bitmeli. Sadece en onemli 1 gozlemi belirt. Fiyat veya degisim bilgisini kullan. Turkce yaz. ₺ sembolunu kullan. Yatirim tavsiyesi verme.

${veriMetni}`
            : `Sen bir Turk borsasi uzmanisisin. Asagidaki veriyi kullanarak ${ticker} hissesi icin somut ve analitik bir degerlendirme yap.

${veriMetni}

Asagidaki formati AYNEN kullan:

**Sirket Profili**
Buraya yaz.

**Finansal Durum**
Buraya yaz.

**Piyasa Konumu**
Buraya yaz.

**Dikkat Noktalari**
Buraya yaz.

Kural: Fiyat ve hacim verilerini yorumla. Somut ol. Turkce yaz. Para birimi olarak TRY veya Turkish Lira yazma, sadece ₺ sembolunu kullan. Yatirim tavsiyesi verme.`
        }
      ]
    });

    const analiz = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ analiz, veri });
  } catch (error) {
    console.error("Anthropic API error:", JSON.stringify(error, null, 2));
    return NextResponse.json({ analiz: "Analiz su an kullanilabilir degil, lutfen tekrar deneyin." });
  }
}
