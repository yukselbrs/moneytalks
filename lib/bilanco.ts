import { hataYakala } from "@/lib/hata-yakala";

// Hisse bilanco/temel veri cekirdegi. Kaynak: TradingView Scanner (lisanssiz, projede zaten kullaniliyor).
// Son ceyrek TAM bilanco (_fq / _ttm scalar) + 4-ceyrek trend (_fq_h array, en yeni once).
// Tek-tip format (Midas/Fintables tarzi) — banka dahil tum sektorlerde muhasebe ozdesligi tuttu (K1/K2).

const SCANNER_URL = "https://scanner.tradingview.com/turkey/scan";

// Scalar kolonlar (son ceyrek / ttm) — sira ONEMLI (yanit d[] ayni sirada gelir).
const SCALAR_KOLONLAR = [
  "total_current_assets_fq",       // donen_varlik
  "total_non_current_assets_fq",   // duran_varlik
  "total_assets_fq",               // toplam_varlik
  "total_current_liabilities_fq",  // kv_yukumluluk
  "total_non_current_liabilities_fq", // uv_yukumluluk
  "total_liabilities_fq",          // toplam_yukumluluk
  "total_equity_fq",               // ozkaynak
  "total_revenue_ttm",             // hasilat
  "gross_profit_ttm",              // brut_kar
  "oper_income_ttm",               // faaliyet_kari
  "ebitda_ttm",                    // favok (banka: None)
  "net_income_ttm",                // net_kar
  "price_earnings_ttm",            // fk
  "price_book_ratio",              // pddd
  "return_on_equity",              // roe
  "return_on_assets",              // roa
  "debt_to_equity",                // borc_ozkaynak
  "earnings_per_share_basic_ttm",  // hbk
] as const;

// 4-ceyrek trend icin history array kolonlari (_fq_h). Yanit: [en_yeni, ..., en_eski].
const HISTORY_KOLONLAR = [
  "total_assets_fq_h",
  "total_revenue_fq_h",
  "gross_profit_fq_h",
  "net_income_fq_h",
  "ebitda_fq_h",
  "total_debt_fq_h",
] as const;

const TUM_KOLONLAR = [...SCALAR_KOLONLAR, ...HISTORY_KOLONLAR];
const CEYREK_SAYISI = 4;

export type BilancoSnapshot = {
  ticker: string;
  donen_varlik: number | null;
  duran_varlik: number | null;
  toplam_varlik: number | null;
  kv_yukumluluk: number | null;
  uv_yukumluluk: number | null;
  toplam_yukumluluk: number | null;
  ozkaynak: number | null;
  hasilat: number | null;
  brut_kar: number | null;
  faaliyet_kari: number | null;
  favok: number | null;
  net_kar: number | null;
  fk: number | null;
  pddd: number | null;
  roe: number | null;
  roa: number | null;
  borc_ozkaynak: number | null;
  hbk: number | null;
  ceyrek_seri: CeyrekSeri | null;
};

export type CeyrekSeri = {
  toplam_varlik: (number | null)[];
  hasilat: (number | null)[];
  brut_kar: (number | null)[];
  net_kar: (number | null)[];
  favok: (number | null)[];
  toplam_borc: (number | null)[];
};

function sayi(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function ilkN(v: unknown): (number | null)[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, CEYREK_SAYISI).map(sayi);
}

// Muhasebe ozdesligi: toplam varlik ≈ toplam yukumluluk + ozkaynak (%2 tolerans).
// Tutmuyorsa logla (sessiz yutma yok) ama satiri yine de kaydet — kaynak yuvarlamasi olabilir.
function ozdeslikKontrol(ticker: string, s: BilancoSnapshot): boolean {
  const { toplam_varlik: ta, toplam_yukumluluk: tl, ozkaynak: eq } = s;
  if (ta === null || tl === null || eq === null || ta === 0) return true; // eksik veri = kontrol atlanir
  const sapma = Math.abs(ta - (tl + eq)) / Math.abs(ta);
  if (sapma > 0.02) {
    hataYakala("bilanco:ozdeslik", new Error(`${ticker} muhasebe ozdesligi tutmuyor`), { toplam_varlik: ta, toplam_yukumluluk: tl, ozkaynak: eq, sapma });
    return false;
  }
  return true;
}

function satirIsle(ticker: string, d: unknown[]): BilancoSnapshot {
  const g = (i: number) => sayi(d[i]);
  const hbase = SCALAR_KOLONLAR.length;
  const s: BilancoSnapshot = {
    ticker,
    donen_varlik: g(0),
    duran_varlik: g(1),
    toplam_varlik: g(2),
    kv_yukumluluk: g(3),
    uv_yukumluluk: g(4),
    toplam_yukumluluk: g(5),
    ozkaynak: g(6),
    hasilat: g(7),
    brut_kar: g(8),
    faaliyet_kari: g(9),
    favok: g(10),
    net_kar: g(11),
    fk: g(12),
    pddd: g(13),
    roe: g(14),
    roa: g(15),
    borc_ozkaynak: g(16),
    hbk: g(17),
    ceyrek_seri: {
      toplam_varlik: ilkN(d[hbase + 0]),
      hasilat: ilkN(d[hbase + 1]),
      brut_kar: ilkN(d[hbase + 2]),
      net_kar: ilkN(d[hbase + 3]),
      favok: ilkN(d[hbase + 4]),
      toplam_borc: ilkN(d[hbase + 5]),
    },
  };
  ozdeslikKontrol(ticker, s);
  return s;
}

// TradingView scanner tek istekte cok hisse doner. Tickerlar "BIST:XXXX" formatina cevrilir.
async function fetchBatch(tickerlar: string[]): Promise<BilancoSnapshot[]> {
  try {
    const res = await fetch(SCANNER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: { tickers: tickerlar.map(t => `BIST:${t}`), query: { types: [] } },
        columns: TUM_KOLONLAR,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      hataYakala("bilanco:fetch", new Error(`Scanner ${res.status}`), { adet: tickerlar.length });
      return [];
    }
    const json = await res.json();
    const data = Array.isArray(json?.data) ? json.data : [];
    return data
      .filter((r: { s?: string; d?: unknown[] }) => r?.s && Array.isArray(r.d))
      .map((r: { s: string; d: unknown[] }) => satirIsle(r.s.split(":")[1] || r.s, r.d));
  } catch (e) {
    hataYakala("bilanco:fetch", e, { adet: tickerlar.length });
    return [];
  }
}

// Tum tickerlari CHUNK'lar halinde ceker (scanner tek istekte cogunu alir ama guvenli parcalama).
export async function bilancoSnapshotlariUret(tickerlar: string[], chunk = 100): Promise<{ satirlar: BilancoSnapshot[]; hata: number }> {
  const satirlar: BilancoSnapshot[] = [];
  let hata = 0;
  for (let i = 0; i < tickerlar.length; i += chunk) {
    const grup = tickerlar.slice(i, i + chunk);
    const sonuc = await fetchBatch(grup);
    if (!sonuc.length && grup.length) hata++;
    satirlar.push(...sonuc);
  }
  return { satirlar, hata };
}
