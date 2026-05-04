import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMPACT_MAP: Record<string, string> = {
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

const EVENT_TR: Record<string, string> = {
  "Inflation Rate MoM": "Enflasyon Oranı (Aylık)",
  "Inflation Rate YoY": "Enflasyon Oranı (Yıllık)",
  "Core Inflation Rate MoM": "Çekirdek Enflasyon (Aylık)",
  "Core Inflation Rate YoY": "Çekirdek Enflasyon (Yıllık)",
  "PPI MoM": "ÜFE (Aylık)",
  "PPI YoY": "ÜFE (Yıllık)",
  "Balance of Trade": "Dış Ticaret Dengesi",
  "Balance of Trade Prel": "Dış Ticaret Dengesi (Ön)",
  "Exports": "İhracat",
  "Exports Prel": "İhracat (Ön)",
  "Imports": "İthalat",
  "Imports Prel": "İthalat (Ön)",
  "Exports YoY": "İhracat (Yıllık)",
  "Imports YoY": "İthalat (Yıllık)",
  "GDP Growth Rate QoQ": "GSYİH Büyümesi (Çeyreklik)",
  "GDP Growth Rate YoY": "GSYİH Büyümesi (Yıllık)",
  "GDP Growth Rate QoQ Prel": "GSYİH Büyümesi (Çeyreklik, Ön)",
  "GDP Growth Rate YoY Prel": "GSYİH Büyümesi (Yıllık, Ön)",
  "Unemployment Rate": "İşsizlik Oranı",
  "Industrial Production MoM": "Sanayi Üretimi (Aylık)",
  "Industrial Production YoY": "Sanayi Üretimi (Yıllık)",
  "Retail Sales MoM": "Perakende Satışlar (Aylık)",
  "Retail Sales YoY": "Perakende Satışlar (Yıllık)",
  "Current Account": "Cari Hesap",
  "Foreign Exchange Reserves": "Döviz Rezervleri",
  "Treasury Cash Balance": "Hazine Nakit Dengesi",
  "Istanbul Chamber of Industry Manufacturing PMI": "İSO İmalat PMI",
  "Interest Rate Decision": "Faiz Kararı",
  "TCMB Interest Rate Decision": "TCMB Faiz Kararı",
  "Consumer Confidence": "Tüketici Güveni",
  "Business Confidence": "İş Dünyası Güveni",
  "Capacity Utilization": "Kapasite Kullanım Oranı",
  "Car Sales MoM": "Otomobil Satışları (Aylık)",
  "Car Sales YoY": "Otomobil Satışları (Yıllık)",
  "Tourist Arrivals YoY": "Turist Girişleri (Yıllık)",
  "Harmonised Inflation Rate YoY": "Uyumlaştırılmış Enflasyon (Yıllık)",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") || from;

  const res = await fetch(
    `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`,
    { cache: "no-store" }
  );

  if (!res.ok) return NextResponse.json({ error: "Finnhub error" }, { status: 500 });

  const data = await res.json();

  const events = (data.economicCalendar || [])
    .filter((e: { country: string }) => e.country === "TR")
    .map((e: {
      time: string; event: string; impact: string; country: string;
      estimate: number | null; prev: number | null; actual: number | null; unit: string;
    }) => {
      // UTC saatini TR saatine çevir (+3)
      const utcDate = new Date(e.time.replace(" ", "T") + "Z");
      const trSaat = utcDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

      return {
        tarih: e.time.slice(0, 10),
        saat: trSaat,
        baslik: EVENT_TR[e.event] || e.event,
        onem: IMPACT_MAP[e.impact] || "Düşük",
        ulke: "🇹🇷",
        ulkeKod: "TR",
        beklenti: e.estimate !== null ? `${e.estimate}${e.unit ? " " + e.unit : ""}` : null,
        onceki: e.prev !== null ? `${e.prev}${e.unit ? " " + e.unit : ""}` : null,
        gerceklesen: e.actual !== null ? `${e.actual}${e.unit ? " " + e.unit : ""}` : null,
      };
    });

  return NextResponse.json({ events });
}
