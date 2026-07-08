import { NextRequest, NextResponse } from "next/server";
import { getMacroRiskSnapshot } from "@/lib/macro-risk";

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get("force") === "1";
  const snapshot = await getMacroRiskSnapshot({ force });
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
