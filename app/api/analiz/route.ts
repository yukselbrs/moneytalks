import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getHisseVerisi(ticker: string) {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      fiyat: meta.regularMarketPrice,
      hacim: meta.regularMarketVolume,
      yillikYuksek: meta.fiftyTwoWeekHigh,
      yillikDusuk: meta.fiftyTwoWeekLow,
      gunlukYuksek: meta.regularMarketDayHigh,
      gunlukDusuk: meta.regularMarketDayLow,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { ticker } = await req.json();
  const veri = await getHisseVerisi(ticker);

  const veriMetni = veri
    ? `Guncel piyasa verisi:
- Fiyat: ${veri.fiyat} TRY
- Gunluk aralik: ${veri.gunlukDusuk} - ${veri.gunlukYuksek} TRY
- 52 haftalik aralik: ${veri.yillikDusuk} - ${veri.yillikYuksek} TRY
- Gunluk islem hacmi: ${veri.hacim?.toLocaleString()} adet`
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

Kural: Fiyat ve hacim verilerini yorumla. Somut ol. Turkce yaz. Yatirim tavsiyesi verme.`
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
