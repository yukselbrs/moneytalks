import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimitHit, istekIpAdresi } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Sunucu tarafi giris. AMAC: kullanici adi -> e-posta cozumlemesini SUNUCUDA yapmak.
// Onceden client `get_email_by_username` RPC'sini anon rolüyle cagiriyordu; bu, giris yapmamis
// herkesin kullanici adindan E-POSTA ogrenmesine izin veriyordu (KVKK + phishing/enumeration riski).
// Artik e-posta hicbir zaman istemciye donmez; yalniz oturum jetonlari doner.

const REQ_PENCERE_SN = 300;   // 5 dk
const REQ_MAKS = 10;          // IP basina 10 deneme -> kaba kuvvet frenlemesi

export async function POST(req: NextRequest) {
  const ip = istekIpAdresi(req.headers);
  const { allowed } = await rateLimitHit(`giris:${ip}`, REQ_PENCERE_SN, REQ_MAKS);
  if (!allowed) {
    return NextResponse.json({ error: "Çok fazla giriş denemesi. Lütfen birkaç dakika sonra tekrar deneyin." }, { status: 429 });
  }

  let body: { identifier?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!identifier || !password) {
    return NextResponse.json({ error: "E-posta/kullanıcı adı ve şifre gerekli." }, { status: 400 });
  }

  // Kullanici adi verildiyse e-postayi SERVICE ROLE ile coz (istemciye asla sizmaz).
  let email = identifier;
  if (!identifier.includes("@")) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await admin
      .from("profiles")
      .select("email")
      .eq("username", identifier.toLocaleLowerCase("tr-TR"))
      .maybeSingle();
    // Kullanici bulunamasa bile AYNI genel hatayi don — kullanici adi enumeration'i engellenir.
    if (!data?.email) {
      return NextResponse.json({ error: "E-posta/kullanıcı adı veya şifre hatalı." }, { status: 401 });
    }
    email = data.email as string;
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json({ error: "E-posta/kullanıcı adı veya şifre hatalı." }, { status: 401 });
  }

  // Yalniz oturum jetonlari doner; istemci bunlari supabase.auth.setSession ile kurar.
  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
