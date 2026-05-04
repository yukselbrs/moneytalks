import { NextResponse } from "next/server";
import { BIST_HISSELER } from "@/lib/bist-hisseler";

export async function GET() {
  const data = BIST_HISSELER
    .filter((hisse) => hisse.listed !== false && hisse.priceAvailable !== false)
    .map((hisse) => ({
      ticker: hisse.ticker,
      ad: hisse.ad,
      domain: hisse.domain,
    }));

  return NextResponse.json(data);
}
