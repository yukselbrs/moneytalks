import { NextRequest, NextResponse } from "next/server";
import { kapSonIndex, kapListe, kapDetay } from "@/lib/kap-kaynak";

function parseDate(timeStr: string): string {
  const [datePart, timePart] = timeStr.split(" ");
  const [day, month, year] = datePart.split(".");
  return new Date(`${year}-${month}-${day}T${timePart}`).toISOString();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  try {
    const guncelIndex = await kapSonIndex();
    if (!guncelIndex) return NextResponse.json({ haberler: [] });
    const startIndex = Math.max(guncelIndex - 300, 0);

    const { liste } = await kapListe({ sonIndex: startIndex, ticker });
    const odaList = liste
      .filter((d) => d.disclosureType === "ODA")
      .slice(-10)
      .reverse();

    const detaylar = await Promise.all(odaList.map((d) => kapDetay(d.disclosureIndex)));

    const haberler = detaylar
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => ({
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
