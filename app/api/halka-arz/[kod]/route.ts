import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isyCarpanlar, isyOzetFinansal } from "@/lib/isyatirim-finansal";
import { tvPiyasaDegeri } from "@/lib/halka-arz-finansal";
import { ertelenenHalkaArzMi } from "@/lib/halka-arz-ertelenen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ kod: string }> }) {
  const { kod } = await params;
  const temiz = kod.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(temiz)) return NextResponse.json({ arz: null }, { status: 400 });
  if (ertelenenHalkaArzMi(temiz)) return NextResponse.json({ arz: null });
  const { data, error } = await supabase
    .from("halka_arzlar")
    .select("*")
    .eq("kod", temiz)
    .maybeSingle();
  if (error) {
    console.error("halka-arz detay HATA:", error.message);
    return NextResponse.json({ arz: null });
  }
  if (data?.durum !== "islem_goruyor") {
    return NextResponse.json({ arz: data ?? null });
  }

  const now = new Date();
  const bugun = { yil: now.getUTCFullYear(), ay: now.getUTCMonth() + 1 };
  const [isyOzet, piyasaDegeri] = await Promise.all([
    withTimeout(isyOzetFinansal(temiz, bugun), 4500, null),
    withTimeout(tvPiyasaDegeri(temiz), 3500, null),
  ]);

  if (!isyOzet) return NextResponse.json({ arz: data });

  const { fk, pddd } = isyCarpanlar(isyOzet, piyasaDegeri);
  return NextResponse.json({
    arz: {
      ...data,
      fk: fk ?? data.fk,
      pddd: pddd ?? data.pddd,
      piyasa_degeri: piyasaDegeri ?? data.piyasa_degeri,
    },
  });
}
