import madenlerJson from "@/data/madenler.json";
import { gunlukGetiriler, ortalama, stdDev, rsiHesapla, periyodikGetiri } from "@/lib/risk-hesaplari";

// Kiymetli maden fiyatlama cekirdegi (Faz: maden v1).
// Kaynak: Yahoo futures (GC=F, SI=F, PL=F) USD/ons + USDTRY=X ile gram TL turetme.
// gram = ons / 31.1035 (troy ons). Fiziki TR piyasasindan sapabilir — UI'da "spot/turetilmis" etiketi zorunlu.

export const TROY_ONS_GRAM = 31.1035;

export type MadenTanim = {
  kod: string;
  ad: string;
  birim: "gram" | "ons";
  paraBirimi: "TRY" | "USD";
  yahooSembol: string;
  turet: "gram" | "ons";
};

export const MADENLER = madenlerJson as MadenTanim[];
export const MADEN_KODLARI = new Set(MADENLER.map(m => m.kod));

export type MadenSnapshot = {
  kod: string;
  ad: string;
  birim: string;
  para_birimi: string;
  fiyat: number | null;
  degisim_yuzde: number | null;
  gunluk_yuksek: number | null;
  gunluk_dusuk: number | null;
  getiri_1h: number | null;
  getiri_1a: number | null;
  getiri_3a: number | null;
  getiri_1y: number | null;
  kaynak: string;
  usdtry_kur: number | null;
};

type YahooChart = {
  meta: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; regularMarketDayHigh?: number; regularMarketDayLow?: number };
  timestamp?: number[];
  closes: (number | null)[];
};

async function fetchChart(sembol: string, range: string, interval: string): Promise<YahooChart | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sembol)}?interval=${interval}&range=${range}`;
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const result = (await res.json())?.chart?.result?.[0];
    if (!result?.meta) return null;
    return {
      meta: result.meta,
      timestamp: result.timestamp || [],
      closes: result.indicators?.quote?.[0]?.close || [],
    };
  } catch {
    return null;
  }
}

function sonGecerli(closes: (number | null)[]): number[] {
  return closes.filter((c): c is number => c !== null && c > 0);
}

// Tum madenlerin guncel snapshot'larini tek seferde uretir (cron kullanir).
export async function madenSnapshotlariUret(): Promise<{ satirlar: MadenSnapshot[]; hata: number }> {
  let hata = 0;
  const semboller = [...new Set(MADENLER.map(m => m.yahooSembol))];
  const [kurChart, ...madenChartlar] = await Promise.all([
    fetchChart("USDTRY=X", "1y", "1d"),
    ...semboller.map(s => fetchChart(s, "1y", "1d")),
  ]);
  const chartMap = new Map(semboller.map((s, i) => [s, madenChartlar[i]]));

  const kur = kurChart?.meta.regularMarketPrice ?? null;
  const kurKapanislar = kurChart ? sonGecerli(kurChart.closes) : [];
  if (!kur) hata++;

  const satirlar: MadenSnapshot[] = [];
  for (const m of MADENLER) {
    const chart = chartMap.get(m.yahooSembol);
    if (!chart?.meta.regularMarketPrice) { hata++; continue; }
    const onsFiyat = chart.meta.regularMarketPrice;
    const prev = chart.meta.chartPreviousClose ?? chart.meta.previousClose ?? null;
    const kapanislar = sonGecerli(chart.closes);

    const gramla = (v: number | null): number | null => {
      if (v === null) return null;
      if (m.turet === "ons") return v;
      if (!kur) return null;
      return (v / TROY_ONS_GRAM) * kur;
    };

    // Getiri: ons serisinden hesaplanir; gram enstrumanlarda kur serisiyle carpilmis TL serisi kullanilir
    // (ayni uzunlukta kuyruk hizalama — gun bazinda kaba ama tutarli).
    let seri = kapanislar;
    if (m.turet === "gram" && kurKapanislar.length) {
      const n = Math.min(kapanislar.length, kurKapanislar.length);
      seri = kapanislar.slice(-n).map((v, i) => (v / TROY_ONS_GRAM) * kurKapanislar[kurKapanislar.length - n + i]);
    }

    satirlar.push({
      kod: m.kod,
      ad: m.ad,
      birim: m.birim,
      para_birimi: m.paraBirimi,
      fiyat: gramla(onsFiyat),
      degisim_yuzde: prev && onsFiyat ? ((onsFiyat - prev) / prev) * 100 : null, // yuzde ons bazinda; gramda kur etkisi ayrica var, v1 sadelestirmesi
      gunluk_yuksek: gramla(chart.meta.regularMarketDayHigh ?? null),
      gunluk_dusuk: gramla(chart.meta.regularMarketDayLow ?? null),
      getiri_1h: periyodikGetiri(seri, 5),
      getiri_1a: periyodikGetiri(seri, 21),
      getiri_3a: periyodikGetiri(seri, 63),
      getiri_1y: seri.length > 200 ? periyodikGetiri(seri, seri.length - 1) : null,
      kaynak: m.turet === "gram" ? "yahoo-turetilmis" : "yahoo",
      usdtry_kur: m.turet === "gram" ? kur : null,
    });
  }
  return { satirlar, hata };
}

// Detay sayfasi grafigi: {tarih, fiyat}[] — HisseGrafik bileseninin bekledigi sekil.
export async function madenGrafik(kod: string, range: string): Promise<{ tarih: string; fiyat: number }[]> {
  const m = MADENLER.find(x => x.kod === kod);
  if (!m) return [];
  const interval = range === "1d" ? "15m" : range === "1wk" ? "1h" : range === "1y" ? "1wk" : "1d";
  const [chart, kurChart] = await Promise.all([
    fetchChart(m.yahooSembol, range, interval),
    m.turet === "gram" ? fetchChart("USDTRY=X", range, interval) : Promise.resolve(null),
  ]);
  if (!chart?.timestamp?.length) return [];
  const kurGuncel = kurChart?.meta.regularMarketPrice ?? null;

  const fmt = (t: number) => {
    const d = new Date(t * 1000);
    if (range === "1d") return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
    if (range === "1y") return d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  };

  const kurCloses = kurChart?.closes || [];
  const points: { tarih: string; fiyat: number }[] = [];
  for (let i = 0; i < chart.timestamp.length; i++) {
    const c = chart.closes[i];
    if (c === null || c === undefined || c <= 0) continue;
    let fiyat = c;
    if (m.turet === "gram") {
      const kurNokta = (kurCloses[i] ?? null) || kurGuncel;
      if (!kurNokta) continue;
      fiyat = (c / TROY_ONS_GRAM) * kurNokta;
    }
    points.push({ tarih: fmt(chart.timestamp[i]), fiyat: parseFloat(fiyat.toFixed(m.turet === "gram" ? 2 : 2)) });
  }
  return points;
}

// Oynaklik profili icin 1 yillik ons (USD) kapanis serisi — kur oynakligi karistirilmaz.
export async function fetchOnsSerisi(yahooSembol: string): Promise<number[]> {
  const chart = await fetchChart(yahooSembol, "1y", "1d");
  return chart ? sonGecerli(chart.closes) : [];
}

// Detay sayfasi "oynaklik profili" — hisse risk motorunun madene uyan alt kumesi (beta/F-K/hacim YOK).
export function oynaklikProfili(seri: number[]): { volatilite: number | null; rsi: number | null; momentum1a: number | null } {
  if (seri.length < 30) return { volatilite: null, rsi: null, momentum1a: null };
  const getiriler = gunlukGetiriler(seri);
  const son20 = seri.slice(-20);
  const onceki20 = seri.slice(-40, -20);
  return {
    volatilite: stdDev(getiriler) * Math.sqrt(252) * 100,
    rsi: rsiHesapla(seri),
    momentum1a: onceki20.length ? (ortalama(son20) / ortalama(onceki20) - 1) * 100 : null,
  };
}
