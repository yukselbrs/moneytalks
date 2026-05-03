import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyCronAuth } from "@/lib/cron-auth";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const getResend = () => new Resend(process.env.RESEND_API_KEY);

function parseFiyat(str: string): number {
  return parseFloat(String(str).replace(/\./g, "").replace(",", "."));
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: alarmlar, error } = await supabase
    .from("alarmlar")
    .select("*, profiles(email)")
    .eq("durum", "aktif");

  if (error || !alarmlar?.length) return NextResponse.json({ checked: 0 });

  const tickerler = [...new Set(alarmlar.map((a: { ticker: string }) => a.ticker))];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://parakonusur.com";
  const fiyatRes = await fetch(`${appUrl}/api/fiyatlar?extra=${tickerler.join(",")}`);
  const fiyatlar = await fiyatRes.json();

  let tetiklenen = 0;

  for (const alarm of alarmlar) {
    const fiyatBilgi = fiyatlar[alarm.ticker];
    if (!fiyatBilgi) continue;

    const guncelFiyat = parseFiyat(fiyatBilgi.fiyat);
    const degisimYuzde = parseFloat(String(fiyatBilgi.degisim)); // günlük % değişim
    const kosul = alarm.kosul; // "yukari" | "asagi"
    const tip = alarm.tip;

    let tetiklendi = false;
    let aciklama = "";

    if (tip === "fiyat_seviye") {
      const hedef = alarm.hedef_deger;
      if (kosul === "yukari" && hedef && guncelFiyat >= hedef) {
        tetiklendi = true;
        aciklama = `${alarm.ticker} fiyatı ${guncelFiyat.toFixed(2)} ₺ — Hedef: ${hedef} ₺ (yukarı kırıldı)`;
      }
      if (kosul === "asagi" && hedef && guncelFiyat <= hedef) {
        tetiklendi = true;
        aciklama = `${alarm.ticker} fiyatı ${guncelFiyat.toFixed(2)} ₺ — Hedef: ${hedef} ₺ (aşağı kırıldı)`;
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
        console.error(`RSI alarm hatasi (${alarm.ticker}):`, e);
      }
    }

    if (tetiklendi) {
      tetiklenen++;
      await supabase.from("alarmlar").update({ durum: "tetiklendi" }).eq("id", alarm.id);
      await supabase.from("bildirimler").insert({
        user_id: alarm.user_id,
        baslik: `🔔 ${alarm.ticker} alarm tetiklendi!`,
        aciklama,
        detay: `Tip: ${tip} | Koşul: ${kosul}`,
        tip: "uyari",
        ikon: "🔔",
        okundu: false,
      });

      const email = (alarm.profiles as { email?: string })?.email;
      if (email && process.env.RESEND_API_KEY) {
        await getResend().emails.send({
          from: "ParaKonuşur <hello@parakonusur.com>",
          to: email,
          subject: `🔔 ${alarm.ticker} alarmınız tetiklendi`,
          html: `<div style="font-family:sans-serif;background:#0B1220;color:#F1F5F9;padding:32px;border-radius:12px;max-width:500px;margin:0 auto;">
            <h2 style="color:#3B82F6;">${alarm.ticker} Alarm</h2>
            <p>${aciklama}</p>
            <a href="https://parakonusur.com/hisse/${alarm.ticker}" style="background:#3B82F6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Hisseyi İncele →</a>
          </div>`,
        });
      }
    }
  }

  return NextResponse.json({ checked: alarmlar.length, tetiklenen });
}
