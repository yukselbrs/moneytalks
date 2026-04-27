import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giris gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });
  const { data } = await supabase.from("risk_profil").select("*").eq("user_id", user.id).single();
  return NextResponse.json(data || null);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giris gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });

  const body = await req.json();
  const { vade, risk_toleransi, sermaye, sektor, deneyim } = body;

  const prompt = `Sen BIST uzmanı bir yatırım danışmanısın. Kullanıcı profiline göre 3 adet BIST hissesi öner.

Kullanıcı Profili:
- Yatırım vadesi: ${vade}
- Risk toleransı: ${risk_toleransi}
- Sermaye büyüklüğü: ${sermaye}
- Sektör tercihi: ${sektor}
- Deneyim seviyesi: ${deneyim}

Yanıtını SADECE şu JSON formatında ver, başka hiçbir şey yazma:
{
  "profil": "Kullanıcının yatırım profilini 1 cümlede özetle",
  "hisseler": [
    {"ticker": "THYAO", "neden": "Kısa açıklama"},
    {"ticker": "GARAN", "neden": "Kısa açıklama"},
    {"ticker": "ASELS", "neden": "Kısa açıklama"}
  ]
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  let ai_oneri = text;
  try {
    JSON.parse(text);
    ai_oneri = text;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    ai_oneri = match ? match[0] : "{}";
  }

  await supabase.from("risk_profil").upsert({
    user_id: user.id, vade, risk_toleransi, sermaye, sektor, deneyim, ai_oneri, updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });

  return NextResponse.json({ ai_oneri });
}
