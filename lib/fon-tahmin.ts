import { getFonPortfoy, type FonPortfoyPozisyon } from "@/lib/fon-portfoy";
import { fetchMarketQuote } from "@/lib/market-pricing";
import { fetchTefasFundHistory } from "@/lib/tefas-fonlar";

export type FonTahminPozisyon = {
  kod: string;
  ad: string;
  tur: string;
  oran: number;
  fiyat: number | null;
  degisimYuzde: number | null;
  katkiPuan: number | null;
  fiyatlama: "hisse" | "tefas" | "gefas" | "sabit" | null;
};

export type FonGunIciTahmin = {
  kod: string;
  tahminiGetiri: number | null;
  kapsamOrani: number;
  toplamPortfoyOrani: number;
  hesaplananPozisyonSayisi: number;
  pozisyonlar: FonTahminPozisyon[];
  guncellemeZamani: string;
};

type PriceResult = {
  fiyat: number | null;
  degisimYuzde: number | null;
};

type GefasChartResponse = {
  labels?: string[];
  datas?: number[];
};

const tefasQuoteCache = new Map<string, { fetchedAt: number; result: PriceResult }>();
const gefasQuoteCache = new Map<string, { fetchedAt: number; result: PriceResult }>();
const QUOTE_CACHE_MS = 30_000;

function pricingMode(position: FonPortfoyPozisyon): FonTahminPozisyon["fiyatlama"] {
  if (position.fiyatlama) return position.fiyatlama;
  if (position.tur === "Hisse Senedi") return "hisse";
  if (position.tur === "Katılma Belgesi" || position.tur === "Yatırım Fonu") return "tefas";
  if (position.tur === "Sabit Getirili") return "sabit";
  return null;
}

function percentChange(latest: number, previous: number) {
  if (!Number.isFinite(latest) || !Number.isFinite(previous) || previous === 0) return null;
  return ((latest - previous) / previous) * 100;
}

function dailyReturnFromAnnual(yillikGetiriTahmini: number | undefined) {
  const annual = yillikGetiriTahmini ?? 0;
  return (Math.pow(1 + annual / 100, 1 / 365) - 1) * 100;
}

function cached(cache: Map<string, { fetchedAt: number; result: PriceResult }>, key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  return Date.now() - hit.fetchedAt < QUOTE_CACHE_MS ? hit.result : null;
}

async function fetchTefasPositionQuote(kod: string): Promise<PriceResult> {
  const key = kod.toLocaleUpperCase("tr-TR");
  const hit = cached(tefasQuoteCache, key);
  if (hit) return hit;

  try {
    const rows = await fetchTefasFundHistory(key, "1wk");
    const latest = rows[rows.length - 1];
    const previous = rows.length > 1 ? rows[rows.length - 2] : null;
    const result = {
      fiyat: latest?.fiyat ?? null,
      degisimYuzde: latest && previous ? percentChange(latest.fiyat, previous.fiyat) : null,
    };
    tefasQuoteCache.set(key, { fetchedAt: Date.now(), result });
    return result;
  } catch {
    return { fiyat: null, degisimYuzde: null };
  }
}

async function fetchGefasPositionQuote(isin: string): Promise<PriceResult> {
  const key = isin.toLocaleUpperCase("tr-TR");
  const hit = cached(gefasQuoteCache, key);
  if (hit) return hit;

  try {
    const res = await fetch(`https://gefas.gov.tr/gyf/detay/grafik/${key}/Haftalik/TL/0`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 30 },
    });
    if (!res.ok) return { fiyat: null, degisimYuzde: null };
    const data = await res.json() as GefasChartResponse;
    const prices = (data.datas ?? []).filter((value) => Number.isFinite(value) && value > 0);
    const latest = prices[prices.length - 1] ?? null;
    const previous = prices.length > 1 ? prices[prices.length - 2] : null;
    const result = {
      fiyat: latest,
      degisimYuzde: latest !== null && previous !== null ? percentChange(latest, previous) : null,
    };
    gefasQuoteCache.set(key, { fetchedAt: Date.now(), result });
    return result;
  } catch {
    return { fiyat: null, degisimYuzde: null };
  }
}

async function pricePosition(position: FonPortfoyPozisyon): Promise<FonTahminPozisyon> {
  const fiyatlama = pricingMode(position);
  let result: PriceResult = { fiyat: null, degisimYuzde: null };

  if (fiyatlama === "hisse") {
    const quote = await fetchMarketQuote(position.kod, { revalidate: 15 });
    result = { fiyat: quote?.fiyat ?? null, degisimYuzde: quote?.degisimYuzde ?? null };
  } else if (fiyatlama === "tefas") {
    result = await fetchTefasPositionQuote(position.fiyatlamaKodu ?? position.kod);
  } else if (fiyatlama === "gefas" && position.fiyatlamaKodu) {
    result = await fetchGefasPositionQuote(position.fiyatlamaKodu);
  } else if (fiyatlama === "sabit") {
    result = { fiyat: null, degisimYuzde: dailyReturnFromAnnual(position.yillikGetiriTahmini) };
  }

  return {
    kod: position.kod,
    ad: position.ad,
    tur: position.tur,
    oran: position.oran,
    fiyat: result.fiyat,
    degisimYuzde: result.degisimYuzde,
    katkiPuan: result.degisimYuzde === null ? null : (position.oran / 100) * result.degisimYuzde,
    fiyatlama,
  };
}

export async function calculateFonGunIciTahmin(kod: string): Promise<FonGunIciTahmin | null> {
  const portfoy = getFonPortfoy(kod);
  if (!portfoy) return null;

  const pricedPositions = portfoy.pozisyonlar.filter((position) => pricingMode(position) !== null);
  const pozisyonlar = await Promise.all(pricedPositions.map(pricePosition));

  const calculated = pozisyonlar.filter((position) => position.katkiPuan !== null);
  const tahminiGetiri = calculated.length > 0
    ? calculated.reduce((sum, position) => sum + (position.katkiPuan ?? 0), 0)
    : null;

  return {
    kod: portfoy.kod,
    tahminiGetiri,
    kapsamOrani: calculated.reduce((sum, position) => sum + position.oran, 0),
    toplamPortfoyOrani: pricedPositions.reduce((sum, position) => sum + position.oran, 0),
    hesaplananPozisyonSayisi: calculated.length,
    pozisyonlar,
    guncellemeZamani: new Date().toISOString(),
  };
}
