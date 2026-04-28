import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const getResend = () => new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giris gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });
  const { data } = await supabase.from("alarmlar").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giris gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });
  const body = await req.json();
  const { ticker, tip, kosul, hedef_deger, hedef_yuzde } = body;
  if (!ticker || !tip || !kosul) return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  const { data, error: insertError } = await supabase.from("alarmlar").insert({
    user_id: user.id, ticker, tip, kosul, hedef_deger, hedef_yuzde
  }).select().single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Bildirim kaydı oluştur
  const kosulMetinBildirim = kosul === "yukari" ? "yükselirse" : "düşerse";
  const hedefMetinBildirim = tip === "fiyat_seviye"
    ? `${hedef_deger} ₺ seviyesine ${kosulMetinBildirim}`
    : `%${hedef_yuzde} oranında ${kosulMetinBildirim}`;
  await supabase.from("bildirimler").insert({
    user_id: user.id,
    baslik: `${ticker} fiyat alarmı oluşturuldu`,
    aciklama: `${ticker} fiyatı ${hedefMetinBildirim} bildirim alacaksınız.`,
    detay: "",
    tip: "uyari",
    ikon: "🔔",
    okundu: false,
  });

  // Onay e-postası
  const email = user.email;
  if (email) {
    const kosulMetin = kosul === "yukari" ? "yükselirse" : "düşerse";
    const hedefMetin = tip === "fiyat_seviye"
      ? `${hedef_deger} ₺ seviyesine ${kosulMetin}`
      : `%${hedef_yuzde} oranında ${kosulMetin}`;
    await getResend().emails.send({
      from: "ParaKonusur <hello@parakonusur.com>",
      to: email,
      subject: `${ticker} için fiyat alarmı oluşturuldu`,
      html: `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<center style="width:100%;background:#0F172A;">
<table width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#0B1220;border:1px solid #1E293B;border-radius:16px;margin:40px auto;">
<tr><td style="padding:40px 40px 24px;">
  <div style="font-size:18px;font-weight:600;color:#F8FAFC;">parakonusur<span style="color:#3B82F6;">.com</span></div>
  <div style="font-size:10px;letter-spacing:0.28em;color:#475569;margin-top:4px;">AI STOCK INTELLIGENCE</div>
</td></tr>
<tr><td style="padding:8px 40px 40px;">
  <p style="font-size:16px;color:#E2E8F0;margin:0 0 20px;">Merhaba,</p>
  <p style="font-size:16px;color:#E2E8F0;margin:0 0 20px;"><strong style="color:#3B82F6;">${ticker}</strong> hissesi için fiyat alarmın oluşturuldu.</p>
  <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:16px 20px;margin:0 0 24px;">
    <p style="font-size:13px;color:#94A3B8;margin:0 0 6px;">Alarm Koşulu</p>
    <p style="font-size:18px;font-weight:700;color:#F1F5F9;margin:0;">${ticker} fiyatı ${hedefMetin}</p>
  </div>
  <p style="font-size:14px;color:#CBD5E1;margin:0 0 20px;">Koşul gerçekleştiğinde sana e-posta ile bildireceğiz.</p>
  <p style="font-size:16px;color:#E2E8F0;margin:0;">Sevgiler,<br><span style="color:#60A5FA;">ParaKonusur Ekibi</span></p>
</td></tr>
<tr><td style="padding:24px 40px 32px;border-top:1px solid #1E293B;">
  <p style="font-size:11px;color:#475569;margin:0;">ParaKonusur bir yatırım danışmanlığı hizmeti sunmamaktadır. İçerikler bilgilendirme amaçlıdır.</p>
</td></tr>
</table>
</center>
</body></html>`,
    });
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giris gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });
  const { id } = await req.json();
  await supabase.from("alarmlar").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
