import { NextRequest, NextResponse } from "next/server";

const KAP_API_URL = process.env.KAP_API_URL || "https://apigwdev.mkk.com.tr/api/vyk";
const KAP_AUTH = Buffer.from(`${process.env.KAP_API_KEY}:${process.env.KAP_API_SECRET}`).toString("base64");
const HEADERS = { Authorization: `Basic ${KAP_AUTH}` };

const memberCache: Record<string, string> = {};

async function getCompanyId(ticker: string): Promise<string | null> {
  if (memberCache[ticker]) return memberCache[ticker];
  const res = await fetch(`${KAP_API_URL}/members`, { headers: HEADERS, next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data = await res.json();
  for (const m of data) {
    if (m.stockCode) memberCache[m.stockCode] = m.id;
  }
  return memberCache[ticker] || null;
}

function parseDate(timeStr: string): string {
  const [datePart, timePart] = timeStr.split(" ");
  const [day, month, year] = datePart.split(".");
  return new Date(`${year}-${month}-${day}T${timePart}`).toISOString();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  try {
    const lastRes = await fetch(`${KAP_API_URL}/lastDisclosureIndex`, { headers: HEADERS, cache: "no-store" });
    if (!lastRes.ok) return NextResponse.json({ haberler: [] });
    const { lastDisclosureIndex } = await lastRes.json();
    const startIndex = Math.max(parseInt(lastDisclosureIndex) - 300, 0);

    const params = new URLSearchParams({ disclosureIndex: String(startIndex) });
    if (ticker) {
      const companyId = await getCompanyId(ticker);
      if (companyId) params.set("companyId", companyId);
    }

    const listRes = await fetch(`${KAP_API_URL}/disclosures?${params}`, { headers: HEADERS, cache: "no-store" });
    if (!listRes.ok) return NextResponse.json({ haberler: [] });
    const list = await listRes.json();

    const odaList = (Array.isArray(list) ? list : [])
      .filter((d: { disclosureType: string }) => d.disclosureType === "ODA")
      .slice(-10)
      .reverse();

    const detaylar = await Promise.all(
      odaList.map(async (d: { disclosureIndex: string }) => {
        try {
          const r = await fetch(`${KAP_API_URL}/disclosureDetail/${d.disclosureIndex}?fileType=data`, { headers: HEADERS, cache: "no-store" });
          if (!r.ok) return null;
          return await r.json();
        } catch {
          return null;
        }
      })
    );

    const haberler = detaylar
      .filter(Boolean)
      .map((d: { disclosureIndex: string; subject: { tr: string }; summary: { tr: string }; senderExchCodes: string[]; time: string; link: string }) => ({
        id: d.disclosureIndex,
        baslik: d.summary?.tr || d.subject?.tr || "",
        kaynak: "KAP",
        kaynakUrl: d.link || `https://www.kap.org.tr/tr/Bildirim/${d.disclosureIndex}`,
        tarih: d.time ? parseDate(d.time) : new Date().toISOString(),
        tip: "kap",
        ticker: d.senderExchCodes?.[0] || ticker || "",
      }));

    return NextResponse.json({ haberler, guncelleme: new Date().toISOString() });
  } catch (e) {
    console.error("KAP API hatasi:", e);
    return NextResponse.json({ haberler: [] });
  }
}
