import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://finans.truncgil.com/today.json", {
      cache: "no-store",
      headers: { "Accept": "application/json" },
    });
    const text = await res.text();
    const data = JSON.parse(text);
    return NextResponse.json({
      usd: { value: data["USD"]["Satis"] ?? data["USD"]["Sat\u0131\u015f"] ?? "-", change: data["USD"]["Degisim"] ?? data["USD"]["De\u011fi\u015fim"] ?? "-" },
      eur: { value: data["EUR"]["Satis"] ?? data["EUR"]["Sat\u0131\u015f"] ?? "-", change: data["EUR"]["Degisim"] ?? data["EUR"]["De\u011fi\u015fim"] ?? "-" },
    });
  } catch (e) {
    console.error("Piyasa API error:", e);
    return NextResponse.json({ usd: { value: "-", change: "-" }, eur: { value: "-", change: "-" } });
  }
}
