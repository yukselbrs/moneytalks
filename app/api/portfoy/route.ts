import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ENV EKSIK:", { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, supabase);
  if (!auth.user) return auth.response;
  const user = auth.user;

  const { data, error } = await supabase
    .from("portfoy")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ portfoy: data });
}

// Portfoy sayisal alan siniri. alarmlar/route.ts ile AYNI standart:
// tip + NaN + aralik kontrolu. Onceden yalniz truthiness bakiliyordu ve
// negatif adet, NaN, 1e308 ve uydurma ticker DB'ye yaziliyordu; sayisal
// ticker ise .toUpperCase() uzerinde yakalanmamis 500 veriyordu.
const ADET_MAKS = 1_000_000_000;
const MALIYET_MAKS = 10_000_000;

function pozitifSayi(v: unknown, maks: number): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > maks) return null;
  return n;
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, supabase);
  if (!auth.user) return auth.response;
  const user = auth.user;

  let govde: { ticker?: unknown; adet?: unknown; maliyet?: unknown };
  try {
    govde = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  // Ticker: once tip, sonra bicim. Uydurma kod fiyat sorgularini bozuyor.
  const hamTicker = typeof govde.ticker === "string" ? govde.ticker.trim() : "";
  if (!hamTicker || hamTicker.length > 12 || !/^[A-Za-z0-9.\-]+$/.test(hamTicker)) {
    return NextResponse.json({ error: "Geçersiz ticker" }, { status: 400 });
  }

  const adet = pozitifSayi(govde.adet, ADET_MAKS);
  if (adet === null) return NextResponse.json({ error: "Adet 0'dan büyük geçerli bir sayı olmalı" }, { status: 400 });

  const maliyet = pozitifSayi(govde.maliyet, MALIYET_MAKS);
  if (maliyet === null) return NextResponse.json({ error: "Maliyet 0'dan büyük geçerli bir sayı olmalı" }, { status: 400 });

  const { data, error } = await supabase
    .from("portfoy")
    .upsert(
      { user_id: user.id, ticker: hamTicker.toUpperCase(), adet, maliyet },
      { onConflict: "user_id,ticker" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req, supabase);
  if (!auth.user) return auth.response;
  const user = auth.user;

  // POST ile ayni tip kontrolu: sayisal/nesne ticker .toUpperCase() uzerinde 500 veriyordu.
  let govde: { ticker?: unknown };
  try {
    govde = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const hamTicker = typeof govde.ticker === "string" ? govde.ticker.trim() : "";
  if (!hamTicker || hamTicker.length > 12) return NextResponse.json({ error: "Geçersiz ticker" }, { status: 400 });

  const { error } = await supabase
    .from("portfoy")
    .delete()
    .eq("user_id", user.id)
    .eq("ticker", hamTicker.toUpperCase());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
