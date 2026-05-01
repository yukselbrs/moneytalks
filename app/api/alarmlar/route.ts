import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const getResend = () => new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Geçersiz token" }, { status: 401 });
  const { data, error: selectError } = await supabase
    .from("alarmlar")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (selectError) return NextResponse.json({ error: selectError.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Geçersiz token" }, { status: 401 });
  const body = await req.json();
  const { ticker, tip, kosul, hedef_deger, hedef_yuzde } = body;

  if (!ticker || !tip || !kosul) return NextResponse.json({ error: "Eksik alan" }, { status: 400 });

  const normalizedTicker = typeof ticker === "string" ? ticker.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{2,10}$/.test(normalizedTicker)) return NextResponse.json({ error: "Geçersiz ticker formatı" }, { status: 400 });

  if (!["fiyat_seviye", "fiyat_yuzde", "yuzde_degisim"].includes(tip)) return NextResponse.json({ error: "Geçersiz alarm tipi" }, { status: 400 });
  if (!["yukari", "asagi"].includes(kosul)) return NextResponse.json({ error: "Geçersiz koşul" }, { status: 400 });

  if (tip === "fiyat_seviye") {
    const deger = Number(hedef_deger);
    if (!hedef_deger || isNaN(deger) || deger <= 0 || deger > 1_000_000) return NextResponse.json({ error: "Geçersiz hedef fiyat" }, { status: 400 });
  }

  if (["fiyat_yuzde", "yuzde_degisim"].includes(tip)) {
    const yuzde = Number(hedef_yuzde);
    if (hedef_yuzde === null || hedef_yuzde === undefined || isNaN(yuzde) || yuzde <= 0 || yuzde > 100) return NextResponse.json({ error: "Geçersiz hedef yüzde (0-100 arası olmalı)" }, { status: 400 });
  }

  const { data, error: insertError } = await supabase.from("alarmlar").insert({
    user_id: user.id,
    ticker: normalizedTicker,
    tip,
    kosul,
    hedef_deger: tip === "fiyat_seviye" ? Number(hedef_deger) : null,
    hedef_yuzde: ["fiyat_yuzde", "yuzde_degisim"].includes(tip) ? Number(hedef_yuzde) : null,
  }).select().single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const kosulMetin = kosul === "yukari" ? "yükselirse" : "düşerse";
  const hedefMetin = tip === "fiyat_seviye"
    ? `${hedef_deger} ₺ seviyesine ${kosulMetin}`
    : `%${hedef_yuzde} oranında ${kosulMetin}`;

  try {
    const { error: bildirimError } = await supabase.from("bildirimler").insert({
      user_id: user.id,
      baslik: `${normalizedTicker} fiyat alarmı oluşturuldu`,
      aciklama: `${normalizedTicker} fiyatı ${hedefMetin} bildirim alacaksınız.`,
      detay: "",
      tip: "uyari",
      ikon: "🔔",
      okundu: false,
    });
    if (bildirimError) console.error("Bildirim kaydı oluşturulamadı", bildirimError.message);
  } catch (e) {
    console.error("Bildirim kayıt hatası", e);
  }

  try {
    const email = user.email;
    if (email && process.env.RESEND_API_KEY) {
      await getResend().emails.send({
        from: "ParaKonuşur <hello@parakonusur.com>",
        to: email,
        subject: `${normalizedTicker} için fiyat alarmı oluşturuldu`,
        html: `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<center style="width:100%;background:#0F172A;">
<table width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#0B1220;border:1px solid #1E293B;border-radius:16px;margin:40px auto;">
<tr><td style="padding:40px 40px 24px;">
  <div style="font-size:18px;font-weight:600;color:#F8FAFC;">parakonuşur<span style="color:#3B82F6;">.com</span></div>
</td></tr>
<tr><td style="padding:8px 40px 40px;">
  <p style="font-size:16px;color:#E2E8F0;margin:0 0 20px;">Merhaba,</p>
  <p style="font-size:16px;color:#E2E8F0;margin:0 0 20px;"><strong style="color:#3B82F6;">${normalizedTicker}</strong> hissesi için fiyat alarmın oluşturuldu.</p>
  <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:16px 20px;margin:0 0 24px;">
    <p style="font-size:13px;color:#94A3B8;margin:0 0 6px;">Alarm Koşulu</p>
    <p style="font-size:18px;font-weight:700;color:#F1F5F9;margin:0;">${normalizedTicker} fiyatı ${hedefMetin}</p>
  </div>
  <p style="font-size:14px;color:#CBD5E1;margin:0 0 20px;">Koşul gerçekleştiğinde sana e-posta ile bildireceğiz.</p>
  <p style="font-size:16px;color:#E2E8F0;margin:0;">Sevgiler,<br><span style="color:#60A5FA;">ParaKonuşur Ekibi</span></p>
</td></tr>
<tr><td style="padding:24px 40px 32px;border-top:1px solid #1E293B;">
  <p style="font-size:11px;color:#475569;margin:0;">ParaKonuşur bir yatırım danışmanlığı hizmeti sunmamaktadır. İçerikler bilgilendirme amaçlıdır.</p>
</td></tr>
</table>
</center>
</body></html>`,
      });
    }
  } catch (e) {
    console.error("Alarm e-postası gönderilemedi", e);
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Geçersiz token" }, { status: 401 });
  const { id, durum } = await req.json();
  if (!id || !durum) return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  if (!["aktif", "devre_disi", "beklemede"].includes(durum)) return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  const { data, error: updateError } = await supabase
    .from("alarmlar")
    .update({ durum })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Alarm bulunamadı" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Geçersiz token" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Eksik id" }, { status: 400 });
  const { data, error: deleteError } = await supabase
    .from("alarmlar")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Alarm bulunamadı" }, { status: 404 });
  return NextResponse.json({ success: true });
}
