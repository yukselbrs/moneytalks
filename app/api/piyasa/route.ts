import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://finans.truncgil.com/today.json", {
      cache: "no-store",
      headers: { "Accept": "application/json" },
    });
    const text = await res.text();
    const data = JSON.parse(text);
    
    const usdObj = data["USD"] || {};
    const eurObj = data["EUR"] || {};
    
    const usdValue = usdObj["Sat\u0131\u015f"] || usdObj["Satis"] || "-";
    const usdChange = usdObj["De\u011fi\u015fim"] || usdObj["Degisim"] || "-";
    const eurValue = eurObj["Sat\u0131\u015f"] || eurObj["Satis"] || "-";
    const eurChange = eurObj["De\u011fi\u015fim"] || eurObj["Degisim"] || "-";

    return NextResponse.json({
      usd: { value: usdValue, change: usdChange },
      eur: { value: eurValue, change: eurChange },
    });
  } catch (e) {
    console.error("Piyasa API error:", e);
    return NextResponse.json({ usd: { value: "-", change: "-" }, eur: { value: "-", change: "-" } });
  }
}
