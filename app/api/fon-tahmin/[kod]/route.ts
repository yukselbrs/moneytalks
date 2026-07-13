import { NextRequest, NextResponse } from "next/server";
import { calculateFonGunIciTahmin } from "@/lib/fon-tahmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kod: string }> }
) {
  const { kod: kodParam } = await params;
  const kod = kodParam.toLocaleUpperCase("tr-TR");
  const tahmin = await calculateFonGunIciTahmin(kod);

  if (!tahmin) {
    return NextResponse.json({ error: "Tahmin desteklenmiyor" }, { status: 404 });
  }

  const response = NextResponse.json(tahmin);
  response.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
  return response;
}
