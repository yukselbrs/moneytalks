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

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, supabase);
  if (!auth.user) return auth.response;
  const user = auth.user;

  const { ticker, adet, maliyet } = await req.json();
  if (!ticker || !adet || !maliyet) {
    return NextResponse.json({ error: "ticker, adet ve maliyet zorunlu" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("portfoy")
    .upsert(
      { user_id: user.id, ticker: ticker.toUpperCase(), adet: Number(adet), maliyet: Number(maliyet) },
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

  const { ticker } = await req.json();
  if (!ticker) return NextResponse.json({ error: "ticker zorunlu" }, { status: 400 });

  const { error } = await supabase
    .from("portfoy")
    .delete()
    .eq("user_id", user.id)
    .eq("ticker", ticker.toUpperCase());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
