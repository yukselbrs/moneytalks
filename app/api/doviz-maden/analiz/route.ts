import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { rateLimitHit } from "@/lib/rate-limit";
import { enstrumanBul, enstrumanParaBirimi, fetchProfilSerisi, oynaklikProfili } from "@/lib/enstruman-pricing";
import type { EnstrumanTanim } from "@/lib/enstruman-pricing";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const MODEL = "claude-sonnet-5";
// Veri yenileme sikligiyla senkron: 15 dk icinde ayni enstruman icin tek Sonnet cagrisi (kullanicilar arasi paylasimli).
const CACHE_MS = 15 * 60 * 1000;
const RATE_LIMIT = 10;
const RATE_WINDOW_SANIYE = 3600;

type Snapshot = {
  fiyat: number | null; degisim_yuzde: number | null;
  getiri_1h: number | null; getiri_1a: number | null; getiri_3a: number | null;
  getiri_6a: number | null; getiri_1y: number | null; usdtry_kur: number | null;
};

function sayi(v: number | null | undefined, hane = 2): string {
  return v === null || v === undefined ? "veri yok" : v.toFixed(hane);
}

function veriBlogu(e: EnstrumanTanim, snap: Snapshot | null, profil: { volatilite: number | null; rsi: number | null; momentum1a: number | null }, seri: number[]): string {
  const min1y = seri.length ? Math.min(...seri) : null;
  const max1y = seri.length ? Math.max(...seri) : null;
  return `Guncel piyasa verisi (${enstrumanParaBirimi(e)} cinsinden, ~15 dk gecikmeli):
- Fiyat: ${sayi(snap?.fiyat, 4)}
- Gunluk degisim: %${sayi(snap?.degisim_yuzde)}
- Getiriler: 1 hafta %${sayi(snap?.getiri_1h)} | 1 ay %${sayi(snap?.getiri_1a)} | 3 ay %${sayi(snap?.getiri_3a)} | 6 ay %${sayi(snap?.getiri_6a)} | 1 yil %${sayi(snap?.getiri_1y)}
- 1 yillik aralik: ${sayi(min1y, 4)} - ${sayi(max1y, 4)}
- RSI(14): ${sayi(profil.rsi, 0)} | Yillik volatilite: %${sayi(profil.volatilite, 1)} | 1 aylik momentum: %${sayi(profil.momentum1a)}`;
}

function promptOlustur(e: EnstrumanTanim, veri: string): string {
  const temelCerceve = e.tur === "doviz"
    ? `TEMEL cercevede su dinamikleri degerlendir: iki para birimi arasindaki faiz orani farklari, merkez bankasi politika durusu, enflasyon farklari ve sermaye akimlari. Guncel politika faizi/enflasyon rakamlarini BILMIYORSUN — rakam uydurma; bu faktorleri mekanizma duzeyinde ve sana verilen fiyat verisinin ima ettigi trendle iliskilendirerek anlat.`
    : `TEMEL cercevede su dinamikleri degerlendir: arz-talep dengesi, guvenli liman talebi, dolar endeksi (DXY) ile ters iliski, reel faiz ortami ve merkez bankasi rezerv alimlari. Guncel makro rakamlari BILMIYORSUN — rakam uydurma; bu faktorleri mekanizma duzeyinde ve sana verilen fiyat verisinin ima ettigi trendle iliskilendirerek anlat.`;

  const tanimSatiri = e.tur === "doviz"
    ? `${e.ad} (${e.aciklama}) doviz kuru`
    : `${e.ad} (${e.birim} bazli, ${e.paraBirimi} cinsinden) kiymetli maden fiyati`;

  return `Sen finansal piyasalar konusunda uzman bir analiz asistanisin. Asagidaki veriyi kullanarak ${tanimSatiri} icin somut ve analitik bir degerlendirme yaz.

${veri}

Asagidaki formati AYNEN kullan:

**Teknik Gorunum**
RSI, momentum, volatilite ve getiri serisini yorumla. 1 yillik aralikta fiyatin nerede durdugunu belirt (aralik uclarini destek/direnc bolgesi olarak anabilirsin).

**Temel Dinamikler**
${temelCerceve}

**Dikkat Noktalari**
Veriden okunan riskleri ve izlenmesi gereken esikleri yaz.

Kurallar: Somut ol, sana verilen sayilari kullan. Turkce yaz. "Al", "sat", "kesin yukselir/duser" gibi yonlendirme YASAK — teshis dili kullan, eylem onerme. Bilmedigin guncel rakamlari uydurma. Yanitin sonuna su cumleyi aynen ekle: "Bu analiz yatirim tavsiyesi degildir."`;
}

export async function POST(req: NextRequest) {
  let body: { kod?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const kod = typeof body.kod === "string" ? body.kod.toLocaleLowerCase("tr-TR") : "";
  const tanim = enstrumanBul(kod);
  if (!tanim) return NextResponse.json({ error: "Geçersiz enstrüman" }, { status: 400 });

  const auth = await requireUser(req, supabaseAuth);
  if (!auth.user) return auth.response;
  const user = auth.user;

  // Once paylasimli cache: taze sonuc varsa Sonnet'e gitmeden don (rate limit de tuketilmez).
  const { data: cache } = await supabaseAdmin.from("enstruman_analiz_cache").select("analiz, created_at").eq("kod", kod).maybeSingle();
  if (cache && Date.now() - new Date(cache.created_at).getTime() < CACHE_MS) {
    return NextResponse.json({ analiz: cache.analiz, cached: true, created_at: cache.created_at });
  }

  // Hisse analiziyle ORTAK kota: kullanici basina toplam 10 AI analiz/saat.
  const limit = await rateLimitHit(`analiz:${user.id}`, RATE_WINDOW_SANIYE, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Saatte en fazla 10 analiz yapabilirsiniz. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  const [{ data: snap }, seri] = await Promise.all([
    supabaseAdmin.from("enstruman_snapshots").select("*").eq("kod", kod).maybeSingle(),
    fetchProfilSerisi(kod),
  ]);
  let snapshot = snap as Snapshot | null;
  if (!snapshot && tanim.tur === "maden") {
    const { data: eski } = await supabaseAdmin.from("maden_snapshots").select("*").eq("kod", kod).maybeSingle();
    snapshot = eski as Snapshot | null;
  }
  const profil = oynaklikProfili(seri);

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: promptOlustur(tanim, veriBlogu(tanim, snapshot, profil, seri)) }],
    });
    const ilkText = message.content.find(b => b.type === "text");
    const analiz = ilkText?.type === "text" ? ilkText.text : "";
    if (analiz) {
      await supabaseAdmin.from("enstruman_analiz_cache").upsert({ kod, analiz, model: MODEL, created_at: new Date().toISOString() });
    }
    return NextResponse.json({ analiz, cached: false, created_at: new Date().toISOString() });
  } catch (error) {
    console.error("Anthropic API error (doviz-maden):", JSON.stringify(error, null, 2));
    return NextResponse.json({ analiz: "Analiz şu an kullanılabilir değil, lütfen tekrar deneyin." });
  }
}
