import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getHisseVerisi } from "@/lib/hisse-veri";
import { normalizeTicker } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { rateLimitHit } from "@/lib/rate-limit";
import { formatCurrency, formatQuantity } from "@/lib/formatters";
import { getMacroRiskSnapshot, macroRiskPromptBlock } from "@/lib/macro-risk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const RATE_LIMIT = 10;
const RATE_WINDOW_SANIYE = 3600;

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

  const auth = await requireUser(req, supabaseAuth);
  if (!auth.user) return auth.response;
  const user = auth.user;

  const limit = await rateLimitHit(`analiz:${user.id}`, RATE_WINDOW_SANIYE, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Saatte en fazla 10 analiz yapabilirsiniz. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  const veriMetni = veri
    ? `Guncel piyasa verisi:
- Fiyat: ${formatCurrency(veri.fiyat)}
- Gunluk aralik: ${formatCurrency(veri.gunlukDusuk)} - ${formatCurrency(veri.gunlukYuksek)}
- 52 haftalik aralik: ${formatCurrency(veri.yillikDusuk)} - ${formatCurrency(veri.yillikYuksek)}
- Gunluk islem hacmi: ${veri.hacim > 0 ? formatQuantity(veri.hacim, "adet") : "Endeks icin gecerli degil"}`
    : "Guncel fiyat verisi alinamadi.";

  try {
    const macroRisk = await getMacroRiskSnapshot().catch(() => null);
    const makroMetni = macroRisk ? `\n\n${macroRiskPromptBlock(macroRisk)}` : "";
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: body.kisaYorum === true
            ? `Sen bir Turk borsasi uzmanisisin. ${ticker} icin asagidaki veriyi kullanarak TAM OLARAK 1 cumlelik ozet yaz. Cümle nokta ile bitmeli. Sadece en onemli 1 gozlemi belirt. Fiyat, degisim veya makro risk bilgisini kullan. Turkce yaz. ₺ sembolunu kullan. Yatirim tavsiyesi verme.

${veriMetni}${makroMetni}`
            : `Sen bir Turk borsasi uzmanisisin. Asagidaki veriyi kullanarak ${ticker} hissesi icin somut ve analitik bir degerlendirme yap.

${veriMetni}${makroMetni}

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
