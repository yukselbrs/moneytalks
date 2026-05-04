import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const range = req.nextUrl.searchParams.get("range") || "1mo";
  if (!ticker) return NextResponse.json({ error: "ticker gerekli" }, { status: 400 });

  const intervalMap: Record<string, string> = {
    "1d": "5m",
    "1wk": "15m",
    "1mo": "1d",
    "3mo": "1d",
    "1y": "1wk",
    "5y": "1mo",
  };
  const interval = intervalMap[range] || "1d";

  try {
    const symbol = ticker.endsWith(".IS") || ticker.endsWith("=X") ? ticker : `${ticker}.IS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return NextResponse.json({ error: "veri yok" }, { status: 404 });

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const prevClose = result.meta?.chartPreviousClose || result.meta?.previousClose || null;

    const formatTarih = (t: number) => {
      const d = new Date(t * 1000);
      if (range === "1d") return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
      if (range === "1wk") return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
      if (range === "1y" || range === "5y") return d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
      return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
    };

    let points = timestamps.map((t: number, i: number) => ({
      tarih: formatTarih(t),
      fiyat: closes[i] ? parseFloat(closes[i].toFixed(2)) : null,
    })).filter((p: {tarih: string; fiyat: number | null}) => p.fiyat !== null);

    if (range === "1d" && prevClose && points.length > 0) {
      points = [{ tarih: "Onceki Kapanis", fiyat: parseFloat(prevClose.toFixed(2)) }, ...points];
    }

    // Tatil/hafta sonu: 1d boş dönüyorsa son 5 günden son işlem gününü çek
    if (points.length === 0 && range === "1d") {
      const url5d = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=5d`;
      const res5d = await fetch(url5d, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
      const data5d = await res5d.json();
      const result5d = data5d?.chart?.result?.[0];
      if (result5d) {
        const ts5d = result5d.timestamp || [];
        const cl5d = result5d.indicators?.quote?.[0]?.close || [];
        if (ts5d.length > 0) {
          const offset = 3 * 60; // TR = UTC+3
          const gunKey = (t: number) => {
            const dtr = new Date(new Date(t * 1000).getTime() + offset * 60000);
            return `${dtr.getUTCFullYear()}-${dtr.getUTCMonth()}-${dtr.getUTCDate()}`;
          };
          const saat = (t: number) => {
            const dtr = new Date(new Date(t * 1000).getTime() + offset * 60000);
            return dtr.getUTCHours().toString().padStart(2,"0") + ":" + dtr.getUTCMinutes().toString().padStart(2,"0");
          };
          // Close değeri olan son günü bul (tatil günleri null olabilir)
          let sonGecerliGun: string | null = null;
          for (let i = ts5d.length - 1; i >= 0; i--) {
            if (cl5d[i] !== null && cl5d[i] !== undefined) {
              sonGecerliGun = gunKey(ts5d[i]);
              break;
            }
          }
          if (sonGecerliGun) {
            points = ts5d.map((t: number, i: number) => ({
              tarih: saat(t),
              fiyat: cl5d[i] ? parseFloat(cl5d[i].toFixed(2)) : null,
              gk: gunKey(t),
            })).filter((p: {tarih: string; fiyat: number | null; gk: string}) => p.fiyat !== null && p.gk === sonGecerliGun)
              .map((p: {tarih: string; fiyat: number; gk: string}) => ({ tarih: p.tarih, fiyat: p.fiyat }));
          }
        }
      }
    }

    return NextResponse.json({ points });
  } catch {
    return NextResponse.json({ error: "hata" }, { status: 500 });
  }
}
