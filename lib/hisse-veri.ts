import { BIST_HISSELER } from "@/lib/bist-hisseler";
import { fetchMarketQuote } from "@/lib/market-pricing";

// Hisse ozet verisi — /api/analiz (veriOnly) ve /api/hisse-ozet ortak cekirdegi (Faz 4, A.7).

function titleCaseTr(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1))
    .join(" ");
}

export function displayCompanyName(raw: string) {
  return titleCaseTr(raw)
    .replace(/\s+T\.a\.ş\.$/i, "")
    .replace(/\s+T\.a\.o\.$/i, "")
    .replace(/\s+A\.ş\.$/i, "")
    .replace(/\s+A\.o\.$/i, "")
    .replace(/\s+Anonim Şirketi$/i, "")
    .replace(/\s+Anonim Ortaklığı$/i, "")
    .trim();
}

export type HisseOzet = {
  fiyat: number;
  oncekiKapanis: number | null;
  degisimYuzde: number | null;
  hacim: number;
  yillikYuksek: number | null;
  yillikDusuk: number | null;
  gunlukYuksek: number | null;
  gunlukDusuk: number | null;
  sirketAdi: string;
  domain?: string;
};

export async function getHisseVerisi(ticker: string): Promise<HisseOzet | null> {
  try {
    const quote = await fetchMarketQuote(ticker, { cache: "no-store" });
    if (!quote) return null;
    const localCompany = BIST_HISSELER.find((h) => h.ticker === ticker);
    const companyName = localCompany?.fullName || localCompany?.ad || ticker;
    return {
      fiyat: quote.fiyat,
      oncekiKapanis: quote.oncekiKapanis,
      degisimYuzde: quote.degisimYuzde,
      hacim: quote.hacim ?? 0,
      yillikYuksek: quote.yillikYuksek,
      yillikDusuk: quote.yillikDusuk,
      gunlukYuksek: quote.gunlukYuksek,
      gunlukDusuk: quote.gunlukDusuk,
      sirketAdi: displayCompanyName(companyName),
      domain: localCompany?.domain,
    };
  } catch {
    return null;
  }
}
