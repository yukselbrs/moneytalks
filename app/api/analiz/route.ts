import { safeAnalysis } from "@/lib/ai-output";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getHisseVerisi } from "@/lib/hisse-veri";
import { tickerCozOverlayli } from "@/lib/hisse-evren";
import { halkaArzKayitliFinansal } from "@/lib/halka-arz-finansal";
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

// Sirkete ait son KAP bildirimleri — kap_bildirimleri tablosundan (zaten ozetlenmis + SPK-filtreli).
async function kapHaberMetni(ticker: string): Promise<string> {
  try {
    const { data } = await supabaseAuth
      .from("kap_bildirimleri")
      .select("konu, ozet_tek_cumle, kap_zamani")
      .contains("tickerlar", [ticker])
      .not("ozet_tek_cumle", "is", null)
      .order("kap_zamani", { ascending: false })
      .limit(5);
    if (!data?.length) return "";
    const satirlar = data.map((h: { konu: string | null; ozet_tek_cumle: string | null; kap_zamani: string | null }) => {
      const tarih = h.kap_zamani ? new Date(h.kap_zamani).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) : "";
      return `- ${tarih ? `[${tarih}] ` : ""}${h.ozet_tek_cumle || h.konu}`;
    });
    return `\n\nSirkete dair son KAP bildirimleri (guncelden eskiye):\n${satirlar.join("\n")}`;
  } catch {
    return "";
  }
}

// Bilanco RASYO OZETI (ham kalem degil) — bilanco_snapshots'tan. Son rasyolar + 4-ceyrek net kar/hasilat trendi.
async function bilancoMetni(ticker: string): Promise<string> {
  try {
    const { data: b } = await supabaseAuth.from("bilanco_snapshots").select("*").eq("ticker", ticker).maybeSingle();
    if (!b) return "";
    const o = (v: number | null, s = 2) => (typeof v === "number" && Number.isFinite(v) ? v.toFixed(s) : "veri yok");
    const yon = (seri: (number | null)[] | undefined) => {
      const g = (seri || []).filter((x): x is number => typeof x === "number");
      if (g.length < 2) return null;
      const yeni = g[0], eski = g[g.length - 1];
      if (eski === 0) return null;
      const d = ((yeni - eski) / Math.abs(eski)) * 100;
      return `son ${g.length} ceyrekte ${d >= 0 ? "artis" : "azalis"} (%${Math.abs(d).toFixed(0)})`;
    };
    const seri = b.ceyrek_seri as { net_kar?: (number | null)[]; hasilat?: (number | null)[] } | null;
    const netKarYon = yon(seri?.net_kar);
    const hasilatYon = yon(seri?.hasilat);
    return `\n\nSirketin temel/bilanco verileri (son finansal rapor, rasyo bazli):
- F/K: ${o(b.fk)} | PD/DD: ${o(b.pddd)} | Ozkaynak karliligi ROE: %${o(b.roe, 1)} | Aktif karliligi ROA: %${o(b.roa, 1)} | Borc/Ozkaynak: ${o(b.borc_ozkaynak)}
- Hisse basi kar (12 ay): ${o(b.hbk)}
- Ceyreklik trend: net kar ${netKarYon ?? "veri yok"}; hasilat ${hasilatYon ?? "veri yok"}
Bu rasyolari SIRKETIN kendi tarihine ve makul sektor beklentisine gore yorumla; kesin "ucuz/pahali" hukmu verme, gozlem/teshis dili kullan.`;
  } catch {
    return "";
  }
}

// Yeni kotasyon fallback: bilanco_snapshots yoksa halka_arzlar'daki izahname bilancosunu prompt'a ekle.
async function halkaArzBilancoMetni(ticker: string): Promise<string> {
  try {
    const kayit = await halkaArzKayitliFinansal(ticker, supabaseAuth);
    if (!kayit || !kayit.finansal) return "";
    const f = kayit.finansal;
    const tl = (v: number | null): string => {
      if (v === null || !Number.isFinite(v)) return "veri yok";
      if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)} milyar TL`;
      if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(0)} milyon TL`;
      return `${v.toLocaleString("tr-TR")} TL`;
    };
    const carpan = kayit.fk !== null || kayit.pddd !== null
      ? `\n- Degerleme (guncel piyasa degeri / izahname finansali): F/K ${kayit.fk ?? "veri yok"} | PD/DD ${kayit.pddd ?? "veri yok"}`
      : "";
    return `\n\nSirketin izahname (halka arz) finansal verileri${f.donem ? ` (${f.donem} yillik)` : ""} — YENI KOTASYON, henuz standart finansal veri saglayicilarinda yok:
- Ozkaynaklar: ${tl(f.ozkaynak)} | Net donem kari: ${tl(f.net_kar)} | Odenmis sermaye: ${tl(f.odenmis_sermaye)}
- Donen varlik: ${tl(f.donen_varlik)} | Duran varlik: ${tl(f.duran_varlik)} | KV yukumluluk: ${tl(f.kv_yukumluluk)} | UV yukumluluk: ${tl(f.uv_yukumluluk)}
- Nakit: ${tl(f.nakit)} | Stoklar: ${tl(f.stoklar)} | Ticari borclar: ${tl(f.ticari_borclar)} | Cari oran: ${f.cari_oran ?? "veri yok"}${carpan}
Bu izahname verilerini SIRKETIN buyuklugu/karliligi/borclulugu acisindan yorumla; yeni kotasyon oldugu icin gecmis ceyreklik trend sinirli, bunu belirt. Kesin "ucuz/pahali" hukmu verme.`;
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  let body: { ticker?: unknown; veriOnly?: unknown; kisaYorum?: unknown };
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Geçersiz istek");
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const ticker = await tickerCozOverlayli(body.ticker);
  if (!ticker) return NextResponse.json({ error: "Geçersiz ticker" }, { status: 400 });

  if (body.veriOnly === true) {
    return NextResponse.json({ veri: await getHisseVerisi(ticker) });
  }

  const auth = await requireUser(req, supabaseAuth);
  if (!auth.user) return auth.response;
  const user = auth.user;

  const limit = await rateLimitHit(`analiz:${user.id}`, RATE_WINDOW_SANIYE, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Saatte en fazla 10 analiz yapabilirsiniz. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI analiz servisi yapılandırılmamış." }, { status: 503 });
  }

  const veri = await getHisseVerisi(ticker);
  const veriMetni = veri
    ? `Guncel piyasa verisi:
- Fiyat: ${formatCurrency(veri.fiyat)}
- Gunluk aralik: ${formatCurrency(veri.gunlukDusuk)} - ${formatCurrency(veri.gunlukYuksek)}
- 52 haftalik aralik: ${formatCurrency(veri.yillikDusuk)} - ${formatCurrency(veri.yillikYuksek)}
- Gunluk islem hacmi: ${veri.hacim > 0 ? formatQuantity(veri.hacim, "adet") : "Endeks icin gecerli degil"}`
    : "Guncel fiyat verisi alinamadi.";

  try {
    const [macroRisk, kapMetni, bilancoTv] = await Promise.all([
      getMacroRiskSnapshot().catch(() => null),
      kapHaberMetni(ticker),
      bilancoMetni(ticker),
    ]);
    // TradingView bilancosu yoksa (yeni kotasyon) izahname bilancosuna dus.
    const bilancoBlok = bilancoTv || (await halkaArzBilancoMetni(ticker));
    const makroMetni = macroRisk ? `\n\n${macroRiskPromptBlock(macroRisk)}` : "";
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: body.kisaYorum === true
            ? `Sen bir Turk borsasi uzmanisisin. ${ticker} icin asagidaki veriyi kullanarak TAM OLARAK 1 cumlelik ozet yaz. Cümle nokta ile bitmeli. Sadece en onemli 1 gozlemi belirt. Fiyat, degisim, makro risk, temel rasyo veya varsa son KAP bildirimi bilgisini kullan. Turkce yaz. ₺ sembolunu kullan. Yatirim tavsiyesi verme.

${veriMetni}${makroMetni}${bilancoBlok}${kapMetni}`
            : `Sen bir Turk borsasi uzmanisisin. Asagidaki veriyi kullanarak ${ticker} hissesi icin somut ve analitik bir degerlendirme yap. Analiz hem TEKNIK (fiyat/hacim) hem TEMEL (bilanco rasyolari) bacagini kapsar.

${veriMetni}${makroMetni}${bilancoBlok}${kapMetni}

Asagidaki formati AYNEN kullan:

**Sirket Profili**
Buraya yaz.

**Finansal Durum**
Sana bilanco/temel veri (F/K, PD/DD, ROE, ROA, borc/ozkaynak, ceyreklik kar-hasilat trendi) verildiyse burada YORUMLA — rasyolari sirketin kendi trendine gore degerlendir, kesin "ucuz/pahali" hukmu verme.

**Piyasa Konumu**
Buraya yaz.

**Dikkat Noktalari**
Buraya yaz.

Kural: Fiyat ve hacim verilerini yorumla. Bilanco rasyolari verildiyse Finansal Durum'da temel analizi bunlara dayandir. KAP bildirimleri verildiyse ilgili olanlari (ozellikle Piyasa Konumu ve Dikkat Noktalari'nda) dahil et ama abartma, olguyu aktar. Somut ol. Turkce yaz. Para birimi olarak TRY veya Turkish Lira yazma, sadece ₺ sembolunu kullan. Yatirim tavsiyesi verme.`
        }
      ]
    });

    const analiz = safeAnalysis(message.content.flatMap(b => (b.type === "text" ? [b.text] : [])).join(""));
    return NextResponse.json({ analiz, veri });
  } catch (error) {
    console.error("Anthropic API error:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: "Analiz şu an oluşturulamadı. Lütfen biraz sonra tekrar deneyin." }, { status: 503 });
  }
}
