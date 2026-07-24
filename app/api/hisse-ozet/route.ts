import { NextRequest, NextResponse } from "next/server";
import { getHisseVerisi, type HisseOzet } from "@/lib/hisse-veri";
import { normalizeTicker } from "@/lib/utils";
import { yeniKotasyonOverlay } from "@/lib/hisse-evren";

// Overlay hisseleri (islem_goruyor'a gecmis, JSON evrenine henuz sync olmamis halka arzlar)
// statik ALLOWED_TICKERS'ta olmadigi icin normalizeTicker null doner. Format gecerliyse ve
// overlay uyesiyse kabul et — aksi halde detay sayfasinin ozet kartlari sonsuz skeleton'da kalir.
async function tickerCoz(raw: string | null): Promise<string | null> {
  const std = normalizeTicker(raw);
  if (std) return std;
  if (typeof raw !== "string") return null;
  const temiz = raw.trim().toUpperCase().replace(/\.IS$/, "");
  if (!/^[A-Z0-9]{2,10}$/.test(temiz)) return null;
  const overlay = await yeniKotasyonOverlay();
  return overlay.some((o) => o.ticker === temiz) ? temiz : null;
}

// Hisse sayfasinin 15sn'lik canli veri polling'i icin hafif endpoint (Faz 4, A.7).
// Onceden bu is POST /api/analiz {veriOnly:true} uzerinden yuruyordu — agir route'un
// veri servisi olarak kullanilmasi hem invocation hem Yahoo trafigi sisiriyordu.

type CacheEntry = { veri: HisseOzet | null; ts: number };
const g = globalThis as typeof globalThis & { hisseOzetCache?: Map<string, CacheEntry> };
if (!g.hisseOzetCache) g.hisseOzetCache = new Map();

const TTL = 15000;
const MAX_KEYS = 300;

export async function GET(req: NextRequest) {
  const ticker = await tickerCoz(req.nextUrl.searchParams.get("ticker"));
  if (!ticker) return NextResponse.json({ error: "Geçersiz ticker" }, { status: 400 });

  const cache = g.hisseOzetCache!;
  const simdi = Date.now();
  const eski = cache.get(ticker);
  if (eski && simdi - eski.ts < TTL) {
    return NextResponse.json({ veri: eski.veri });
  }

  const veri = await getHisseVerisi(ticker);
  if (cache.size >= MAX_KEYS) {
    for (const [k, v] of cache) {
      if (simdi - v.ts > TTL) cache.delete(k);
      if (cache.size < MAX_KEYS) break;
    }
  }
  cache.set(ticker, { veri, ts: simdi });
  return NextResponse.json({ veri });
}
