import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { BIST_HISSELER } from "@/lib/bist-hisseler";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ALLOWED_TICKERS = new Set([
  ...BIST_HISSELER.map((h) => h.ticker),
  "XU100",
  "XU030",
  "XU050",
]);

async function getHisseVerisi(ticker: string) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      fiyat: meta.regularMarketPrice,
      oncekiKapanis: meta.chartPreviousClose || meta.previousClose,
      hacim: meta.regularMarketVolume,
      yillikYuksek: meta.fiftyTwoWeekHigh,
      yillikDusuk: meta.fiftyTwoWeekLow,
      gunlukYuksek: meta.regularMarketDayHigh,
      gunlukDusuk: meta.regularMarketDayLow,
      sirketAdi: meta.longName || meta.shortName || "",
    };
  } catch {
    return null;
  }
}

const rateLimitMap = new Map<string, { count: number; ts: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 3600000;

function normalizeTicker(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const ticker = raw.trim().toUpperCase().replace(/\.IS$/, "").replace(/=X$/, "");
  if (!/^[A-Z0-9]{2,10}$/.test(ticker)) return null;
  if (!ALLOWED_TICKERS.has(ticker)) return null;
  return ticker;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.ts > RATE_WINDOW) {
    rateLimitMap.set(key, { count: 1, ts: now });
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

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Analiz için giriş gerekli" }, { status: 401 });
  }
  const token = authHeader.slice(7);
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
