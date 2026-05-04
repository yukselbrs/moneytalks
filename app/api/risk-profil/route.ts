import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BIST_HISSELER } from "@/lib/bist-hisseler";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const ALLOWED_TICKERS = new Set(BIST_HISSELER.map((h) => h.ticker));

const PROFIL_SECENEKLERI = {
  vade: ["Kısa vadeli (0-6 ay)", "Orta vadeli (6ay-2yıl)", "Uzun vadeli (2yıl+)"],
  risk_toleransi: ["Düşük — sermayemi korumak isterim", "Orta — makul risk alabilirim", "Yüksek — agresif büyüme isterim"],
  sermaye: ["10.000 ₺ altı", "10.000 – 100.000 ₺", "100.000 ₺ üzeri"],
  sektor: ["Bankacılık & Finans", "Sanayi & Enerji", "Teknoloji & Savunma", "Tüketim & Perakende", "Farketmez"],
  deneyim: ["Yeni başlıyorum", "1-3 yıl deneyimim var", "3 yıl+ deneyimim var"],
} as const;

type ProfilKey = keyof typeof PROFIL_SECENEKLERI;
type ProfilInput = Record<ProfilKey, string>;
type AiOneri = { profil: string; hisseler: { ticker: string; neden: string }[] };

function validateProfilInput(body: unknown): ProfilInput | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const result = {} as ProfilInput;

  for (const key of Object.keys(PROFIL_SECENEKLERI) as ProfilKey[]) {
    const value = input[key];
    if (typeof value !== "string") return null;
    if (!(PROFIL_SECENEKLERI[key] as readonly string[]).includes(value)) return null;
    result[key] = value;
  }

  return result;
}

function cleanText(value: unknown, fallback: string, maxLength = 220): string {
  if (typeof value !== "string") return fallback;
  const text = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text.slice(0, maxLength) : fallback;
}

function parseAiOneri(text: string): AiOneri {
  const fallback: AiOneri = {
    profil: "Profilinize göre teknik veri taraması oluşturuldu. Bu çıktı yatırım tavsiyesi değildir.",
    hisseler: [],
  };

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallback;

  try {
    const parsed = JSON.parse(match[0]) as { profil?: unknown; hisseler?: unknown };
    const hisseler = Array.isArray(parsed.hisseler)
      ? parsed.hisseler
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            const ticker = typeof row.ticker === "string" ? row.ticker.trim().toUpperCase() : "";
            if (!ALLOWED_TICKERS.has(ticker)) return null;
            return {
              ticker,
              neden: cleanText(row.neden, "Nesnel teknik veri özellikleri nedeniyle listelendi."),
            };
          })
          .filter((item): item is { ticker: string; neden: string } => item !== null)
          .slice(0, 3)
      : [];

    return {
      profil: cleanText(parsed.profil, fallback.profil),
      hisseler,
    };
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giris gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });
  const { data, error: selectError } = await supabase.from("risk_profil").select("*").eq("user_id", user.id).maybeSingle();
  if (selectError) return NextResponse.json({ error: selectError.message }, { status: 500 });
  return NextResponse.json(data || null);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giris gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const profil = validateProfilInput(body);
  if (!profil) return NextResponse.json({ error: "Geçersiz profil seçimi" }, { status: 400 });

  const prompt = `Sen bir BIST veri tarama asistanısın. Kullanıcının profiline göre incelemeye değer olabilecek 3 BIST hissesini listele. Bu bir yatırım tavsiyesi değil, yalnızca profil uyumlu tarama sonucudur.

Kullanıcı Profili:
- Yatırım vadesi: ${profil.vade}
- Risk toleransı: ${profil.risk_toleransi}
- Sermaye büyüklüğü: ${profil.sermaye}
- Sektör tercihi: ${profil.sektor}
- Deneyim seviyesi: ${profil.deneyim}

ZORUNLU KURALLAR:
- "al", "sat", "yatırım yap", "tavsiye" gibi ifadeler kesinlikle kullanma.
- Her hisse için yalnızca nesnel, veri tabanlı özelliklerini belirt (likidite, sektör, büyüklük vb).
- Bu çıktı yatırım tavsiyesi değildir ibaresini profil açıklamasına ekle.

Yanıtını SADECE şu JSON formatında ver, başka hiçbir şey yazma:
{
  "profil": "Kullanıcının profiline göre tarama kriteri 1 cümlede — bu yatırım tavsiyesi değildir.",
  "hisseler": [
    {"ticker": "THYAO", "neden": "Nesnel özellik açıklaması"},
    {"ticker": "GARAN", "neden": "Nesnel özellik açıklaması"},
    {"ticker": "ASELS", "neden": "Nesnel özellik açıklaması"}
  ]
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const ai_oneri = JSON.stringify(parseAiOneri(text));

  const { error: upsertError } = await supabase.from("risk_profil").upsert({
    user_id: user.id,
    vade: profil.vade,
    risk_toleransi: profil.risk_toleransi,
    sermaye: profil.sermaye,
    sektor: profil.sektor,
    deneyim: profil.deneyim,
    ai_oneri,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({ ai_oneri });
}
