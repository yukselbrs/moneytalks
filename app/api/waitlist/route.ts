import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID!;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Basit email validation
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      return NextResponse.json(
        { error: "Gecerli bir e-posta adresi girin." },
        { status: 400 }
      );
    }

    // Resend Audience'a contact olarak ekle
    const result = await resend.contacts.create({
      email,
      audienceId: AUDIENCE_ID,
      unsubscribed: false,
    });

    // Eger duplicate ise Resend hata dondurur ama bu kullaniciya sorun olarak gosterilmemeli
    if (result.error) {
      // Duplicate email - kullaniciya basarili gibi goster
      if (result.error.message?.includes("already exists") || 
          result.error.message?.includes("duplicate")) {
        return NextResponse.json({ success: true, duplicate: true });
      }
      
      console.error("Resend error:", result.error);
      return NextResponse.json(
        { error: "Bir sorun olustu. Lutfen tekrar deneyin." },
        { status: 500 }
      );
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
