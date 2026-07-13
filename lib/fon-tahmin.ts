import { getFonPortfoy, type FonPortfoyPozisyon } from "@/lib/fon-portfoy";
import { fetchMarketQuote } from "@/lib/market-pricing";

export type FonTahminPozisyon = {
  kod: string;
  ad: string;
  tur: string;
  oran: number;
  fiyat: number | null;
  degisimYuzde: number | null;
  katkiPuan: number | null;
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

function isLivePricedPosition(position: FonPortfoyPozisyon) {
  return position.tur === "Hisse Senedi";
}

export async function calculateFonGunIciTahmin(kod: string): Promise<FonGunIciTahmin | null> {
  const portfoy = getFonPortfoy(kod);
  if (!portfoy) return null;

  const livePositions = portfoy.pozisyonlar.filter(isLivePricedPosition);
  const quotes = await Promise.all(
    livePositions.map((position) => fetchMarketQuote(position.kod, { revalidate: 15 }))
  );

  const pozisyonlar = livePositions.map((position, index) => {
    const quote = quotes[index];
    const degisimYuzde = quote?.degisimYuzde ?? null;
    return {
      kod: position.kod,
      ad: position.ad,
      tur: position.tur,
      oran: position.oran,
      fiyat: quote?.fiyat ?? null,
      degisimYuzde,
      katkiPuan: degisimYuzde === null ? null : (position.oran / 100) * degisimYuzde,
    };
  });

  const calculated = pozisyonlar.filter((position) => position.katkiPuan !== null);
  const tahminiGetiri = calculated.length > 0
    ? calculated.reduce((sum, position) => sum + (position.katkiPuan ?? 0), 0)
    : null;

  return {
    kod: portfoy.kod,
    tahminiGetiri,
    kapsamOrani: calculated.reduce((sum, position) => sum + position.oran, 0),
    toplamPortfoyOrani: livePositions.reduce((sum, position) => sum + position.oran, 0),
    hesaplananPozisyonSayisi: calculated.length,
    pozisyonlar,
    guncellemeZamani: new Date().toISOString(),
  };
}
