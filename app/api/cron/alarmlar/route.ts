import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const getResend = () => new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: alarmlar, error } = await supabase.from("alarmlar").select("*, profiles(email)").eq("durum", "aktif");
  if (error || !alarmlar?.length) return NextResponse.json({ checked: 0 });

  const tickerler = [...new Set(alarmlar.map((a: { ticker: string }) => a.ticker))];
  const fiyatRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://parakonusur.com"}/api/fiyatlar?extra=${tickerler.join(",")}`);
  const fiyatlar = await fiyatRes.json();

  let tetiklenen = 0;
  for (const alarm of alarmlar) {
    const fiyatBilgi = fiyatlar[alarm.ticker];
    if (!fiyatBilgi) continue;
    const guncelFiyat = parseFloat(String(fiyatBilgi.fiyat).replace(",", "."));
    const hedef = alarm.hedef_deger;
    const kosul = alarm.kosul;
    let tetiklendi = false;
    if (kosul === "yukari" && hedef && guncelFiyat >= hedef) tetiklendi = true;
    if (kosul === "asagi" && hedef && guncelFiyat <= hedef) tetiklendi = true;
    if (tetiklendi) {
      tetiklenen++;
      await supabase.from("alarmlar").update({ durum: "tetiklendi" }).eq("id", alarm.id);
      await supabase.from("bildirimler").insert({ user_id: alarm.user_id, baslik: `🔔 ${alarm.ticker} alarm tetiklendi!`, aciklama: `${alarm.ticker} fiyatı ${guncelFiyat.toFixed(2)} ₺ seviyesine ulaştı. Hedef: ${hedef} ₺`, detay: `Koşul: ${kosul === "yukari" ? "Yükseliş" : "Düşüş"}`, tip: "uyari", ikon: "🔔", okundu: false });
      const email = (alarm.profiles as { email?: string })?.email;
      if (email && process.env.RESEND_API_KEY) {
        await getResend().emails.send({ from: "ParaKonuşur <hello@parakonusur.com>", to: email, subject: `🔔 ${alarm.ticker} fiyat alarminiz tetiklendi`, html: `<div style="font-family:sans-serif;background:#0B1220;color:#F1F5F9;padding:32px;border-radius:12px;max-width:500px;margin:0 auto;"><h2 style="color:#3B82F6;">${alarm.ticker} Fiyat Alarmı</h2><p>Güncel fiyat: <strong>${guncelFiyat.toFixed(2)} ₺</strong> — Hedef: ${hedef} ₺</p><a href="https://parakonusur.com/hisse/${alarm.ticker}" style="background:#3B82F6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Hisseyi İncele →</a></div>` });
      }
    }
  }
  return NextResponse.json({ checked: alarmlar.length, tetiklenen });
}
