import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeTicker } from "@/lib/utils";

export const revalidate = 0;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: tickerParam } = await params;
  const ticker = normalizeTicker(tickerParam);
  if (!ticker) return NextResponse.json({ error: "Geçersiz ticker" }, { status: 400 });

  const { data } = await supabase.from("bilanco_snapshots").select("*").eq("ticker", ticker).maybeSingle();
  const res = NextResponse.json({ bilanco: data ?? null });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
