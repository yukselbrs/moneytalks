import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";

// Diger cron'larda olan bu ucluu eksikti: maxDuration tanimsiz kalinca Vercel'in
// KISA varsayilan butcesi uygulaniyor. Alarm cron'u fiyat cekip e-posta gonderiyor —
// kullanici sayisi artinca varsayilan butce yetmez (haftalik-karne'de aynisi 504 verdi).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const getResend = () => new Resend(process.env.RESEND_API_KEY);

function parseFiyat(str: string): number {
  return parseFloat(String(str).replace(/\./g, "").replace(",", "."));
}

async function fetchFiyatlar(appUrl: string, tickerler: string[]) {
  const chunks: string[][] = [];
  for (let i = 0; i < tickerler.length; i += 50) {
    chunks.push(tickerler.slice(i, i + 50));
  }

  const entries = await Promise.all(
    chunks.map(async (chunk) => {
      const fiyatRes = await fetch(`${appUrl}/api/fiyatlar?extra=${chunk.join(",")}`);
      return fiyatRes.json();
    })
  );

  return Object.assign({}, ...entries);
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // NOT: embedded join (profiles(email)) production'da FK olmadigi icin PGRST200 veriyordu;
  // e-posta ayri sorguyla cekiliyor (karne/aksam-raporu cron'lariyla ayni desen).
  const { data: alarmlar, error } = await supabase
    .from("alarmlar")
    .select("*")
    .eq("durum", "aktif");

  if (error) {
    hataYakala("alarm-cron:liste", error);
    return NextResponse.json({ checked: 0, hata: 1 });
  }
  if (!alarmlar?.length) return NextResponse.json({ checked: 0, hata: 0 });

  const kullaniciIdleri = [...new Set(alarmlar.map((a: { user_id: string }) => a.user_id))];
  const { data: profiller } = await supabase.from("profiles").select("id, email").in("id", kullaniciIdleri);
  const emailMap = new Map((profiller || []).map((p: { id: string; email: string | null }) => [p.id, p.email]));

  // Varlik ayrimi: doviz/maden alarmlarinin fiyati enstruman_snapshots'tan, hisselerinki /api/fiyatlar'dan.
  const enstrumanMi = (a: { tur?: string }) => a.tur === "doviz" || a.tur === "maden";
  const hisseTickerler = [...new Set(alarmlar.filter(a => !enstrumanMi(a)).map((a: { ticker: string }) => a.ticker))];
  const enstrumanKodlar = [...new Set(alarmlar.filter(enstrumanMi).map((a: { ticker: string }) => a.ticker))];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://parakonusur.com";
  const fiyatlar = hisseTickerler.length ? await fetchFiyatlar(appUrl, hisseTickerler) : {};
  if (enstrumanKodlar.length) {
    const { data: snaplar } = await supabase
      .from("enstruman_snapshots")
      .select("kod, fiyat, degisim_yuzde")
      .in("kod", enstrumanKodlar);
    for (const s of snaplar || []) {
      if (s.fiyat === null) continue;
      fiyatlar[s.kod] = { fiyat: s.fiyat, degisim: s.degisim_yuzde ?? 0 };
    }
  }

  let tetiklenen = 0;
  let hata = 0;

  for (const alarm of alarmlar) {
    const fiyatBilgi = fiyatlar[alarm.ticker];
    if (!fiyatBilgi) continue;

    // Enstruman fiyati sayi olarak gelir; parseFiyat TR-formatli string icindir (sayiya uygulanirsa nokta binlik sanilir).
    const guncelFiyat = typeof fiyatBilgi.fiyat === "number" ? fiyatBilgi.fiyat : parseFiyat(fiyatBilgi.fiyat);
    const degisimYuzde = parseFloat(String(fiyatBilgi.degisim)); // günlük % değişim
    const kosul = alarm.kosul; // "yukari" | "asagi"
    const tip = alarm.tip;
    const birim = enstrumanMi(alarm) ? "" : " ₺";

    let tetiklendi = false;
    let aciklama = "";

    if (tip === "fiyat_seviye") {
      const hedef = alarm.hedef_deger;
      if (kosul === "yukari" && hedef && guncelFiyat >= hedef) {
        tetiklendi = true;
        aciklama = `${alarm.ticker} fiyatı ${guncelFiyat.toFixed(2)}${birim} — Hedef: ${hedef}${birim} (yukarı kırıldı)`;
      }
      if (kosul === "asagi" && hedef && guncelFiyat <= hedef) {
        tetiklendi = true;
        aciklama = `${alarm.ticker} fiyatı ${guncelFiyat.toFixed(2)}${birim} — Hedef: ${hedef}${birim} (aşağı kırıldı)`;
      }

    } else if (tip === "fiyat_yuzde" || tip === "yuzde_degisim") {
      // Günlük % değişim bazlı
      const hedefYuzde = alarm.hedef_yuzde;
      if (kosul === "yukari" && hedefYuzde && degisimYuzde >= hedefYuzde) {
        tetiklendi = true;
        aciklama = `${alarm.ticker} bugün %${degisimYuzde.toFixed(2)} yükseldi — Hedef: %${hedefYuzde}`;
      }
      if (kosul === "asagi" && hedefYuzde && degisimYuzde <= -hedefYuzde) {
        tetiklendi = true;
        aciklama = `${alarm.ticker} bugün %${Math.abs(degisimYuzde).toFixed(2)} düştü — Hedef: %${hedefYuzde}`;
      }

    } else if (tip === "gosterge") {
      if (enstrumanMi(alarm)) continue; // gosterge alarmi hisse'ye ozgu (POST zaten engeller; savunmaci)
      // RSI bazlı gösterge alarmı — /api/risk'ten çek
      try {
        const riskRes = await fetch(`${appUrl}/api/risk?ticker=${alarm.ticker}`);
        const riskData = await riskRes.json();
        const rsi = riskData?.meta?.rsi;
        const esik = alarm.gosterge_esik;

        if (rsi !== undefined && esik !== null) {
          if (kosul === "yukari" && rsi >= esik) {
            tetiklendi = true;
            aciklama = `${alarm.ticker} RSI ${rsi.toFixed(1)} — Eşik: ${esik} (aşırı alım bölgesi)`;
          }
          if (kosul === "asagi" && rsi <= esik) {
            tetiklendi = true;
            aciklama = `${alarm.ticker} RSI ${rsi.toFixed(1)} — Eşik: ${esik} (aşırı satım bölgesi)`;
          }
        }
      } catch (e) {
        hataYakala("alarm-cron:rsi", e, { ticker: alarm.ticker });
        hata++;
      }
    }

    if (tetiklendi) {
      // Idempotency: satiri atomik sahiplen — es zamanli ikinci calistirma ayni alarmi tekrar bildiremez
      const { data: claimed } = await supabase
        .from("alarmlar")
        .update({ durum: "tetiklendi" })
        .eq("id", alarm.id)
        .eq("durum", "aktif")
        .select("id");
      if (!claimed?.length) continue;

      tetiklenen++;
      await supabase.from("bildirimler").insert({
        user_id: alarm.user_id,
        baslik: `🔔 ${alarm.ticker} alarm tetiklendi!`,
        aciklama,
        detay: `Tip: ${tip} | Koşul: ${kosul}`,
        tip: "uyari",
        ikon: "🔔",
        okundu: false,
      });

      const email = emailMap.get(alarm.user_id);
      if (email && process.env.RESEND_API_KEY) {
        try {
        await getResend().emails.send({
          from: "ParaKonuşur <hello@parakonusur.com>",
          to: email,
          subject: `🔔 ${alarm.ticker} alarmınız tetiklendi`,
          html: `<div style="font-family:sans-serif;background:#0B1220;color:#F1F5F9;padding:32px;border-radius:12px;max-width:500px;margin:0 auto;">
            <h2 style="color:#3B82F6;">${alarm.ticker} Alarm</h2>
            <p>${aciklama}</p>
            <a href="https://parakonusur.com/${enstrumanMi(alarm) ? `doviz-maden/${alarm.ticker}` : `hisse/${alarm.ticker}`}" style="background:#3B82F6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">${enstrumanMi(alarm) ? "Enstrümanı" : "Hisseyi"} İncele →</a>
          </div>`,
        });
        } catch (e) {
          hataYakala("alarm-cron:eposta", e, { ticker: alarm.ticker });
          hata++;
        }
      }
    }
  }

  return NextResponse.json({ checked: alarmlar.length, tetiklenen, hata });
}
