import { NextResponse, NextRequest } from "next/server";

export const revalidate = 300; // 5 dakika cache

async function fetchKAP(): Promise<{baslik: string; link: string; tarih: string; kaynak: string; tip: string}[]> {
  try {
    const res = await fetch("https://www.kap.org.tr/tr/rss/bildirimler", {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });
    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    return items.slice(0, 20).map(item => {
      const baslik = item.match(/<title><![CDATA[(.+?)]]><\/title>/)?.[1] || item.match(/<title>(.+?)<\/title>/)?.[1] || "";
      const link = item.match(/<link>(.+?)<\/link>/)?.[1] || "";
      const tarih = item.match(/<pubDate>(.+?)<\/pubDate>/)?.[1] || "";
      return { baslik: baslik.trim(), link: link.trim(), tarih, kaynak: "KAP", tip: "kap" };
    }).filter(h => h.baslik);
  } catch {
    return [];
  }
}

async function fetchYahooFinance(): Promise<{baslik: string; link: string; tarih: string; kaynak: string; tip: string}[]> {
  try {
    const res = await fetch("https://feeds.finance.yahoo.com/rss/2.0/headline?s=XU100.IS&region=TR&lang=tr-TR", {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });
    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    return items.slice(0, 15).map(item => {
      const baslik = item.match(/<title><![CDATA[(.+?)]]><\/title>/)?.[1] || item.match(/<title>(.+?)<\/title>/)?.[1] || "";
      const link = item.match(/<link>(.+?)<\/link>/)?.[1] || "";
      const tarih = item.match(/<pubDate>(.+?)<\/pubDate>/)?.[1] || "";
      return { baslik: baslik.trim(), link: link.trim(), tarih, kaynak: "Yahoo Finance", tip: "piyasa" };
    }).filter(h => h.baslik);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const tip = req.nextUrl.searchParams.get("tip") || "tumu";
  
  const [kap, yahoo] = await Promise.all([fetchKAP(), fetchYahooFinance()]);
  
  let haberler = [...kap, ...yahoo].sort((a, b) => {
    return new Date(b.tarih).getTime() - new Date(a.tarih).getTime();
  });

  if (tip === "kap") haberler = kap;
  else if (tip === "piyasa") haberler = yahoo;

  return NextResponse.json({ haberler });
}
