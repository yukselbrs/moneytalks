import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

let resend: Resend | null = null;
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || "";

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const WELCOME_SUBJECT = "ParaKonusur waitlist\'ine hoş geldin";

const WELCOME_HTML = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="tr">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>ParaKonusur</title>
<style type="text/css">
  body, table, td, p, span { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; }
  body { margin: 0 !important; padding: 0 !important; background-color: #0F172A !important; }
  table { border-collapse: collapse; }
  @media only screen and (max-width: 600px) {
    .email-card { width: 100% !important; border-radius: 0 !important; border: none !important; }
    .email-padding { padding: 32px 24px !important; }
    .email-padding-top { padding: 32px 24px 20px 24px !important; }
    .email-footer-padding { padding: 20px 24px 28px 24px !important; }
  }
</style>
<!--[if mso]>
<style type="text/css">
  body, table, td { font-family: Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#0F172A; color:#E2E8F0;">
  <div style="background-color:#0F172A; padding:0; margin:0;">
    <center style="width:100%; background-color:#0F172A;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0F172A; border-collapse:collapse;">
        <tr>
          <td align="center" style="background-color:#0F172A; padding:40px 16px;">
            <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" class="email-card" style="max-width:560px; background-color:#0B1220; border:1px solid #1E293B; border-radius:16px; border-collapse:separate;">
              <tr>
                <td class="email-padding-top" style="background-color:#0B1220; padding:40px 40px 24px 40px;">
                  <div style="font-size:18px; font-weight:600; color:#F8FAFC; letter-spacing:-0.01em;">
                    parakonusur<span style="color:#3B82F6;">.com</span>
                  </div>
                  <div style="font-size:10px; letter-spacing:0.28em; color:#475569; margin-top:4px;">
                    AI STOCK INTELLIGENCE
                  </div>
                </td>
              </tr>
              <tr>
                <td class="email-padding" style="background-color:#0B1220; padding:8px 40px 40px 40px;">
                  <p style="font-size:16px; line-height:1.7; color:#E2E8F0; margin:0 0 20px 0;">
                    Merhaba,
                  </p>
                  <p style="font-size:16px; line-height:1.7; color:#E2E8F0; margin:0 0 20px 0;">
                    Artık ParaKonusur waitlist’indesin.
                  </p>
                  <p style="font-size:16px; line-height:1.7; color:#CBD5E1; margin:0 0 20px 0;">
                    Borsa İstanbul için geliştirilen yapay zekâ destekli analiz deneyimini ilk görenlerden biri olacaksın. ParaKonusur, hisse verilerini, piyasa sinyallerini ve özet içgörüleri daha hızlı ve daha net şekilde sunmak için tasarlanıyor.
                  </p>
                  <p style="font-size:16px; line-height:1.7; color:#CBD5E1; margin:0 0 20px 0;">
                    Henüz başlangıçtayız, ama hedefimiz net: yatırımcılara daha akıllı, daha sade ve daha güçlü bir analiz deneyimi sunmak.
                  </p>
                  <p style="font-size:16px; line-height:1.7; color:#CBD5E1; margin:0 0 28px 0;">
                    Erişim açıldığında sana öncelikli haber vereceğiz. Bizi takipte kal. Güzel şeyler geliyor.
                  </p>
                  <p style="font-size:16px; line-height:1.7; color:#E2E8F0; margin:0;">
                    Sevgiler,<br>
                    <span style="color:#60A5FA;">ParaKonusur Ekibi</span>
                  </p>
                </td>
              </tr>
              <tr>
                <td class="email-footer-padding" style="background-color:#0B1220; padding:24px 40px 32px 40px; border-top:1px solid #1E293B;">
                  <p style="font-size:11px; line-height:1.6; color:#475569; margin:0;">
                    Bu e-postayı parakonusur.com erken erişim listesine kayıt olduğunuz için alıyorsunuz. ParaKonusur bir yatırım danışmanlığı hizmeti sunmamaktadır; içerikler bilgilendirme amaçlıdır.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </center>
  </div>
</body>
</html>`;

const WELCOME_TEXT = `Merhaba,

Artık ParaKonusur waitlist’indesin.

Borsa İstanbul için geliştirilen yapay zekâ destekli analiz deneyimini ilk görenlerden biri olacaksın. ParaKonusur, hisse verilerini, piyasa sinyallerini ve özet içgörüleri daha hızlı ve daha net şekilde sunmak için tasarlanıyor.

Henüz başlangıçtayız, ama hedefimiz net: yatırımcılara daha akıllı, daha sade ve daha güçlü bir analiz deneyimi sunmak.

Erişim açıldığında sana öncelikli haber vereceğiz. Bizi takipte kal. Güzel şeyler geliyor.

Sevgiler,
ParaKonusur Ekibi

---
Bu e-postayı parakonusur.com erken erişim listesine kayıt olduğunuz için alıyorsunuz.`;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      return NextResponse.json(
        { error: "Gecerli bir e-posta adresi girin." },
        { status: 400 }
      );
    }

    // Supabase'e kaydet
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error: dbErr } = await sb.from("waitlist").upsert({ email }, { onConflict: "email" });
    if (dbErr && !dbErr.message.includes("duplicate")) {
      console.error("Waitlist DB error:", dbErr);
    }

    // Resend varsa e-posta gönder (opsiyonel)
    const client = getResend();
    if (client && AUDIENCE_ID) {
      try {
        await client.contacts.create({ email, audienceId: AUDIENCE_ID, unsubscribed: false });
        await client.emails.send({
          from: "ParaKonusur <hello@parakonusur.com>",
          to: email,
          subject: WELCOME_SUBJECT,
          html: WELCOME_HTML,
          text: WELCOME_TEXT,
        });
      } catch (mailErr) {
        console.error("Resend error (non-fatal):", mailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist API error:", err);
    return NextResponse.json(
      { error: "Beklenmedik bir hata olustu." },
      { status: 500 }
    );
  }
}
