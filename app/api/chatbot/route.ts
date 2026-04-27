import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { messages, ticker, veri, analiz, portfoy } = await req.json();

  const systemPrompt = `Sen ParaKonusur'un AI finans asistanısın. BIST hisseleri hakkında kullanıcılara yardım ediyorsun.

Şu an kullanıcı ${ticker} hissesini inceliyor.

${veri ? `HISSE VERİSİ:
- Fiyat: ${veri.fiyat} ₺
- Önceki Kapanış: ${veri.oncekiKapanis} ₺
- Günlük Yüksek: ${veri.gunlukYuksek} ₺
- Günlük Düşük: ${veri.gunlukDusuk} ₺
- 52H Yüksek: ${veri.yillikYuksek} ₺
- 52H Düşük: ${veri.yillikDusuk} ₺
- Hacim: ${veri.hacim}` : ""}

${analiz ? `AI ANALİZ ÖZETİ:\n${analiz}` : ""}

${portfoy && portfoy.length > 0 ? `KULLANICININ PORTFÖYÜ:\n${portfoy.map((p: {ticker: string, adet: number, alis_fiyati: number}) => `- ${p.ticker}: ${p.adet} adet, alış ${p.alis_fiyati} ₺`).join("\n")}` : ""}

Kısa, net ve Türkçe cevaplar ver. Yatırım tavsiyesi verme, analiz sun. Her cevabı 3-4 cümleyle sınırla.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages,
  });

  const content = response.content[0];
  return NextResponse.json({ reply: content.type === "text" ? content.text : "" });
}
