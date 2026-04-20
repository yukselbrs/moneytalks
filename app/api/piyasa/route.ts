import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://finans.truncgil.com/today.json", { next: { revalidate: 300 } });
    const data = await res.json();
    return NextResponse.json({
      usd: { value: data["USD"]["Satış"], change: data["USD"]["Değişim"] },
      eur: { value: data["EUR"]["Satış"], change: data["EUR"]["Değişim"] },
    });
  } catch {
    return NextResponse.json({ usd: { value: "-", change: "-" }, eur: { value: "-", change: "-" } });
  }
}
