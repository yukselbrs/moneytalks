import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// In-memory rate limit: user başına son istek zamanları
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 20;       // max istek
const RATE_WINDOW = 60000;   // 1 dakika (ms)

const YASAKLI_IFADELER = [
  /(?<![a-züğişçöA-ZÜĞİŞÇÖ])(al|sat)(?![a-züğişçöA-ZÜĞİŞÇÖ])/i,
  /kesin(likle)?\s*(al|sat|yüksel|düş)/i,
  /yatırım tavsiyesi (öner(irim|iyorum|ir)?|tavsiye eder(im)?)/i,
  /\bgaranti\b/i,
  /mutlaka\s*(al|sat)/i,
];

function yasakliMiKontrol(text: string): boolean {
  return YASAKLI_IFADELER.some((re) => re.test(text));
}

export async function POST(req: NextRequest) {
  // 1. Auth kontrolü
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Yetkisiz istek" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });
  }

  // 2. Rate limit kontrolü
  const now = Date.now();
  const userRequests = (rateLimitMap.get(user.id) || []).filter(t => now - t < RATE_WINDOW);
  if (userRequests.length >= RATE_LIMIT) {
    return NextResponse.json({ error: "Çok fazla istek. 1 dakika bekleyin." }, { status: 429 });
  }
  rateLimitMap.set(user.id, [...userRequests, now]);

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

ZORUNLU KURALLAR:
- Kısa, net ve Türkçe cevaplar ver. Her cevabı 3-4 cümleyle sınırla.
- Kesinlikle yatırım tavsiyesi verme. "Al", "sat", "kesin yükselir" gibi ifadeler kullanma.
- Her cevabın sonuna "Bu analiz yatırım tavsiyesi değildir." ekle.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages,
  });

  const content = response.content[0];
  const reply = content.type === "text" ? content.text : "";

  // 3. Cevap sonrası yasaklı ifade filtresi
  if (yasakliMiKontrol(reply)) {
    return NextResponse.json({
      reply: "Bu soruyu yanıtlamak için yeterli bilgiye sahip değilim. Lütfen lisanslı bir yatırım danışmanına başvurun. Bu analiz yatırım tavsiyesi değildir."
    });
  }

  return NextResponse.json({ reply });
}
