import madenlerJson from "@/data/madenler.json";
import dovizJson from "@/data/doviz-ciftleri.json";
import { gunlukGetiriler, ortalama, stdDev, rsiHesapla, periyodikGetiri } from "@/lib/risk-hesaplari";

// Doviz + kiymetli maden ORTAK fiyatlama cekirdegi (lib/maden-pricing.ts'in halefi).
// Birincil kaynak: Yahoo chart API (query1 -> query2 host yedegi).
// Ikincil kaynak (yalniz doviz): Frankfurter/ECB gunluk referans kuru.
// Metalde ikincil bagimsiz keyless saglayici yok (log K6); son bilinen snapshot korunur.
// ONEMLI: Metal (COMEX) ve kur (FX) serileri FARKLI islem gunlerine sahip (252 vs 261 bar);
// gram turetmede kur, tarih (timestamp) bazinda hizalanir — kuyruk-slice ile DEGIL.

export const TROY_ONS_GRAM = 31.1035;

export type MadenTanim = {
  kod: string;
  ad: string;
  birim: "gram" | "ons";
  paraBirimi: "TRY" | "USD";
  yahooSembol: string;
  turet: "gram" | "ons";
};

export type DovizTanim = {
  kod: string;
  ad: string;
  aciklama: string;
  yahooSembol: string;
  taban: string;
  karsi: string;
};

export type EnstrumanTanim =
  | ({ tur: "maden" } & MadenTanim)
  | ({ tur: "doviz" } & DovizTanim);

export const MADENLER = madenlerJson as MadenTanim[];
export const DOVIZLER = dovizJson as DovizTanim[];
export const ENSTRUMANLAR: EnstrumanTanim[] = [
  ...DOVIZLER.map(d => ({ tur: "doviz" as const, ...d })),
  ...MADENLER.map(m => ({ tur: "maden" as const, ...m })),
];
export const ENSTRUMAN_KODLARI = new Set(ENSTRUMANLAR.map(e => e.kod));

export function enstrumanBul(kod: string): EnstrumanTanim | undefined {
  return ENSTRUMANLAR.find(e => e.kod === kod);
}

export function enstrumanParaBirimi(e: EnstrumanTanim): string {
  return e.tur === "doviz" ? e.karsi : e.paraBirimi;
}

export type EnstrumanSnapshot = {
  kod: string;
  tur: "doviz" | "maden";
  ad: string;
  birim: string | null;
  para_birimi: string;
  fiyat: number | null;
  degisim_yuzde: number | null;
  gunluk_yuksek: number | null;
  gunluk_dusuk: number | null;
  getiri_1h: number | null;
  getiri_1a: number | null;
  getiri_3a: number | null;
  getiri_6a: number | null;
  getiri_1y: number | null;
  getiri_5y: number | null;
  kaynak: string;
  usdtry_kur: number | null;
};

type YahooChart = {
  meta: { regularMarketPrice?: number; regularMarketDayHigh?: number; regularMarketDayLow?: number };
  timestamp: number[];
  closes: (number | null)[];
};

// query1 dusukse query2 ayni veriyi servis eder (altyapi yedegi, ayni saglayici).
const YAHOO_HOSTLAR = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

async function fetchChart(sembol: string, range: string, interval: string): Promise<YahooChart | null> {
  for (const host of YAHOO_HOSTLAR) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(sembol)}?interval=${interval}&range=${range}`;
      const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const result = (await res.json())?.chart?.result?.[0];
      if (!result?.meta) continue;
      return { meta: result.meta, timestamp: result.timestamp || [], closes: result.indicators?.quote?.[0]?.close || [] };
    } catch {
      continue;
    }
  }
  return null;
}

// Yahoo tamamen dusukse doviz icin ECB gunluk referans serisi (5 yil — 5Y getirisi icin).
async function frankfurterSeri(taban: string, karsi: string): Promise<number[] | null> {
  try {
    const bitis = new Date();
    const baslangic = new Date(bitis.getTime() - 1860 * 24 * 3600 * 1000);
    const gun = (d: Date) => d.toISOString().slice(0, 10);
    const url = `https://api.frankfurter.dev/v1/${gun(baslangic)}..${gun(bitis)}?base=${taban}&symbols=${karsi}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const rates = (await res.json())?.rates as Record<string, Record<string, number>> | undefined;
    if (!rates) return null;
    const seri = Object.keys(rates).sort().map(t => rates[t][karsi]).filter((v): v is number => typeof v === "number" && v > 0);
    return seri.length >= 30 ? seri : null;
  } catch {
    return null;
  }
}

// Her metal timestamp'i icin, o tarihte veya oncesindeki son gecerli kur kapanisi.
function kurAt(metalTs: number, kurTs: number[], kurCloses: (number | null)[]): number | null {
  let bulunan: number | null = null;
  for (let j = 0; j < kurTs.length; j++) {
    if (kurTs[j] > metalTs) break;
    if (kurCloses[j] !== null && kurCloses[j]! > 0) bulunan = kurCloses[j];
  }
  return bulunan;
}

// Metal ons serisini, tarih-hizali kur ile TL gram serisine cevirir (null bar'lari atlar).
function tlSeriHizala(metal: YahooChart, kur: YahooChart): number[] {
  const seri: number[] = [];
  for (let i = 0; i < metal.timestamp.length; i++) {
    const mc = metal.closes[i];
    if (mc === null || mc === undefined || mc <= 0) continue;
    const k = kurAt(metal.timestamp[i], kur.timestamp, kur.closes);
    if (!k) continue;
    seri.push((mc / TROY_ONS_GRAM) * k);
  }
  return seri;
}

function gecerliSeri(chart: YahooChart): number[] {
  return chart.closes.filter((c): c is number => c !== null && c > 0);
}

// Seriden ortak getiri seti (5y'lik gunluk seri): 1H(5), 1A(21), 3A(63), 6A(126), 1Y(252), 5Y(serinin tamami; >1000 bar sarti).
function getiriSeti(seri: number[]) {
  return {
    getiri_1h: periyodikGetiri(seri, 5),
    getiri_1a: periyodikGetiri(seri, 21),
    getiri_3a: periyodikGetiri(seri, 63),
    getiri_6a: periyodikGetiri(seri, 126),
    getiri_1y: periyodikGetiri(seri, 252),
    getiri_5y: seri.length > 1000 ? periyodikGetiri(seri, seri.length - 1) : null,
  };
}

// Gunluk degisim: serinin sondan ikinci kapanisi vs canli fiyat.
// chartPreviousClose 1y range'de YANLIS (1 yil oncesini doner) — maden v1.1'de kanitlandi.
function gunlukDegisim(seri: number[], current: number | null): number | null {
  const onceki = seri.length >= 2 ? seri[seri.length - 2] : null;
  return onceki && current ? ((current - onceki) / onceki) * 100 : null;
}

export async function enstrumanSnapshotlariUret(): Promise<{ satirlar: EnstrumanSnapshot[]; hata: number }> {
  let hata = 0;
  const semboller = [...new Set(ENSTRUMANLAR.map(e => e.yahooSembol))];
  const kurSembolIndex = semboller.indexOf("USDTRY=X");
  const chartlar = await Promise.all(semboller.map(s => fetchChart(s, "5y", "1d")));
  const chartMap = new Map(semboller.map((s, i) => [s, chartlar[i]]));
  const kurChart = kurSembolIndex >= 0 ? chartlar[kurSembolIndex] : null;
  const kurNow = kurChart?.meta.regularMarketPrice ?? null;

  const satirlar: EnstrumanSnapshot[] = [];

  for (const e of ENSTRUMANLAR) {
    const chart = chartMap.get(e.yahooSembol);

    if (e.tur === "doviz") {
      if (chart?.meta.regularMarketPrice) {
        const seri = gecerliSeri(chart);
        const fiyat = chart.meta.regularMarketPrice;
        satirlar.push({
          kod: e.kod, tur: "doviz", ad: e.ad, birim: null, para_birimi: e.karsi,
          fiyat,
          degisim_yuzde: gunlukDegisim(seri, fiyat),
          gunluk_yuksek: chart.meta.regularMarketDayHigh ?? null,
          gunluk_dusuk: chart.meta.regularMarketDayLow ?? null,
          ...getiriSeti(seri),
          kaynak: "yahoo",
          usdtry_kur: null,
        });
        continue;
      }
      // Fallback: ECB gunluk referans (gecikmeli — UI updated_at'ten rozet gosterir)
      const ecbSeri = await frankfurterSeri(e.taban, e.karsi);
      if (ecbSeri) {
        const fiyat = ecbSeri[ecbSeri.length - 1];
        satirlar.push({
          kod: e.kod, tur: "doviz", ad: e.ad, birim: null, para_birimi: e.karsi,
          fiyat,
          degisim_yuzde: gunlukDegisim(ecbSeri, fiyat),
          gunluk_yuksek: null,
          gunluk_dusuk: null,
          ...getiriSeti(ecbSeri),
          kaynak: "frankfurter",
          usdtry_kur: null,
        });
        continue;
      }
      hata++;
      continue;
    }

    // Maden
    if (!chart?.meta.regularMarketPrice) { hata++; continue; }
    const onsNow = chart.meta.regularMarketPrice;
    const gramla = (ons: number | null): number | null => {
      if (ons === null) return null;
      if (e.turet === "ons") return ons;
      return kurNow ? (ons / TROY_ONS_GRAM) * kurNow : null;
    };
    if (e.turet === "gram" && !kurNow) { hata++; continue; }

    const seri = e.turet === "gram" && kurChart ? tlSeriHizala(chart, kurChart) : gecerliSeri(chart);
    const current = gramla(onsNow);
    satirlar.push({
      kod: e.kod, tur: "maden", ad: e.ad, birim: e.birim, para_birimi: e.paraBirimi,
      fiyat: current,
      degisim_yuzde: gunlukDegisim(seri, current),
      gunluk_yuksek: gramla(chart.meta.regularMarketDayHigh ?? null),
      gunluk_dusuk: gramla(chart.meta.regularMarketDayLow ?? null),
      ...getiriSeti(seri),
      kaynak: e.turet === "gram" ? "yahoo-turetilmis" : "yahoo",
      usdtry_kur: e.turet === "gram" ? kurNow : null,
    });
  }

  return { satirlar, hata };
}

// Detay sayfasi grafigi: {tarih, fiyat}[] — HisseGrafik bileseninin bekledigi sekil.
export async function enstrumanGrafik(kod: string, range: string): Promise<{ tarih: string; fiyat: number }[]> {
  const e = enstrumanBul(kod);
  if (!e) return [];
  const interval = range === "1d" ? "15m" : range === "1wk" ? "1h" : range === "1y" ? "1wk" : "1d";
  const gramTuret = e.tur === "maden" && e.turet === "gram";
  const [chart, kurChart] = await Promise.all([
    fetchChart(e.yahooSembol, range, interval),
    gramTuret ? fetchChart("USDTRY=X", range, interval) : Promise.resolve(null),
  ]);
  if (!chart?.timestamp?.length) return [];

  const fmt = (t: number) => {
    const d = new Date(t * 1000);
    if (range === "1d") return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
    if (range === "1y") return d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  };

  const points: { tarih: string; fiyat: number }[] = [];
  for (let i = 0; i < chart.timestamp.length; i++) {
    const c = chart.closes[i];
    if (c === null || c === undefined || c <= 0) continue;
    let fiyat = c;
    if (gramTuret) {
      const k = kurChart ? kurAt(chart.timestamp[i], kurChart.timestamp, kurChart.closes) : null;
      if (!k) continue;
      fiyat = (c / TROY_ONS_GRAM) * k;
    }
    points.push({ tarih: fmt(chart.timestamp[i]), fiyat: parseFloat(fiyat.toFixed(4)) });
  }
  return points;
}

// Oynaklik profili serisi: maden -> 1y ons (USD, kur oynakligi karismaz); doviz -> 1y kur serisi.
export async function fetchProfilSerisi(kod: string): Promise<number[]> {
  const e = enstrumanBul(kod);
  if (!e) return [];
  const chart = await fetchChart(e.yahooSembol, "1y", "1d");
  return chart ? gecerliSeri(chart) : [];
}

// Migration/cron oncesi kopru: snapshot tablosu bos/eksikse fiyatlar dogrudan kaynaktan uretilir.
// 60 sn module-cache — ayni serverless instance'taki istekler tek uretimi paylasir.
let canliCache: { zaman: number; map: Map<string, EnstrumanSnapshot> } | null = null;
const CANLI_CACHE_MS = 60_000;

export async function canliSnapshotlar(): Promise<Map<string, EnstrumanSnapshot>> {
  if (canliCache && Date.now() - canliCache.zaman < CANLI_CACHE_MS) return canliCache.map;
  const { satirlar } = await enstrumanSnapshotlariUret();
  const map = new Map(satirlar.map(s => [s.kod, s]));
  if (map.size) canliCache = { zaman: Date.now(), map };
  return map;
}

// Detay sayfasi "oynaklik profili" — hisse risk motorunun enstrumana uyan alt kumesi (beta/F-K/hacim YOK).
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
