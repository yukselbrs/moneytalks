import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// IP bazlı rate limit - saatte 10 istek
const rateLimitMap = new Map<string, { count: number; ts: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 3600000; // 1 saat

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.ts > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, ts: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Saatte en fazla 10 analiz yapabilirsiniz. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }
  const { ticker, veriOnly, kisaYorum } = await req.json();
  const veri = await getHisseVerisi(ticker);

  if (veriOnly) {
    return NextResponse.json({ veri });
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Sen bir Turk borsasi uzmanisisin. Asagidaki veriyi kullanarak ${ticker} hissesi icin somut ve analitik bir degerlendirme yap.

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
