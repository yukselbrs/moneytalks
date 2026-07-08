import { NextRequest, NextResponse } from "next/server";
import { rateLimitHit, istekIpAdresi } from "@/lib/rate-limit";
import { getMacroRiskSnapshot } from "@/lib/macro-risk";

async function fetchOHLCV(ticker: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=3mo`,
    { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
  );
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta;
  const quotes = result.indicators?.quote?.[0];
  const closes: number[] = (quotes?.close || []).filter((c: number | null) => c !== null);
  const volumes: number[] = (quotes?.volume || []).filter((v: number | null) => v !== null);
  return {
    closes,
    volumes,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    currentPrice: meta.regularMarketPrice,
    currentVolume: meta.regularMarketVolume,
    gunlukYuksek: meta.regularMarketDayHigh,
    gunlukDusuk: meta.regularMarketDayLow,
    oncekiKapanis: meta.chartPreviousClose,
  };
}

function gunlukGetiriler(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return returns;
}

function ortalama(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  const mean = ortalama(arr);
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function betaHesapla(hisseGetiri: number[], piyasaGetiri: number[]): number {
  const n = Math.min(hisseGetiri.length, piyasaGetiri.length);
  if (n < 10) return 1;
  const h = hisseGetiri.slice(-n);
  const p = piyasaGetiri.slice(-n);
  const hMean = ortalama(h);
  const pMean = ortalama(p);
  let cov = 0, varP = 0;
  for (let i = 0; i < n; i++) {
    cov += (h[i] - hMean) * (p[i] - pMean);
    varP += Math.pow(p[i] - pMean, 2);
  }
  if (varP === 0) return 1;
  return cov / varP;
}

function rsiHesapla(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) avgGain += delta;
    else avgLoss -= delta;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (delta > 0 ? delta : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (delta < 0 ? -delta : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function emaHesapla(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let ema = ortalama(closes.slice(0, period));
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

function periyodikGetiri(closes: number[], gun: number): number | null {
  if (closes.length < gun + 1) return null;
  const son = closes[closes.length - 1];
  const oncesi = closes[closes.length - 1 - gun];
  if (!son || !oncesi || oncesi <= 0) return null;
  return ((son - oncesi) / oncesi) * 100;
}

type RiskCacheEntry = { payload: Record<string, unknown>; ts: number };

const gRisk = globalThis as typeof globalThis & { riskCache?: Map<string, RiskCacheEntry> };
if (!gRisk.riskCache) gRisk.riskCache = new Map();

const RISK_CACHE_TTL = 60000;
const RISK_CACHE_MAX = 300;
const RISK_IP_LIMIT = 30;
const RISK_IP_WINDOW_SANIYE = 60;

function riskCacheOku(ticker: string): Record<string, unknown> | null {
  const entry = gRisk.riskCache!.get(ticker);
  if (!entry || Date.now() - entry.ts > RISK_CACHE_TTL) return null;
  return entry.payload;
}

function riskCacheYaz(ticker: string, payload: Record<string, unknown>) {
  const cache = gRisk.riskCache!;
  if (cache.size >= RISK_CACHE_MAX) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.ts > RISK_CACHE_TTL) cache.delete(k);
    }
    if (cache.size >= RISK_CACHE_MAX) {
      const eskiler = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (const [k] of eskiler.slice(0, cache.size - RISK_CACHE_MAX + 1)) cache.delete(k);
    }
  }
  cache.set(ticker, { payload, ts: Date.now() });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker gerekli" }, { status: 400 });

  const cacheKey = ticker.toUpperCase();
  const cached = riskCacheOku(cacheKey);
  if (cached) return NextResponse.json(cached);

  const ip = istekIpAdresi(req.headers);
  const limit = await rateLimitHit(`risk:ip:${ip}`, RISK_IP_WINDOW_SANIYE, RISK_IP_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen 1 dakika bekleyin." }, { status: 429 });
  }

  try {
    const endeksler = ["XU100", "XU030", "XU050"];
  const isEndeks = endeksler.includes(ticker.toUpperCase());

  const [hisse, piyasa] = await Promise.all([
      fetchOHLCV(`${ticker}.IS`),
      fetchOHLCV("XU100.IS"),
    ]);

    if (!hisse) return NextResponse.json({ error: "Veri alinamadi" }, { status: 500 });

    const hisseGetiri = gunlukGetiriler(hisse.closes);
    const piyasaGetiri = piyasa ? gunlukGetiriler(piyasa.closes) : [];

    // === FAKTÖRLER ===

    // 1. Beta (sistematik risk) — CAPM
    const beta = isEndeks ? 1 : betaHesapla(hisseGetiri, piyasaGetiri);
    const betaRisk = isEndeks ? 0 : (beta < 0.5 ? 15 : beta < 0.8 ? 25 : beta < 1.2 ? 40 : beta < 1.6 ? 65 : 85);

    // 2. Volatilite (annualized) — genişletilmiş bant
    const volatilite = stdDev(hisseGetiri) * Math.sqrt(252) * 100;
    const volRisk = volatilite < 15 ? 5 : volatilite < 25 ? 20 : volatilite < 40 ? 40 : volatilite < 60 ? 65 : volatilite < 80 ? 85 : 95;

    // 3. Kısa vade trend (1H, 5 gün) — NEGATİF GETİRİ = YÜKSEK RİSK
    const getiri1H = periyodikGetiri(hisse.closes, 5);
    const trend1HRisk = getiri1H === null ? 40
      : getiri1H <= -10 ? 95
      : getiri1H <= -5 ? 80
      : getiri1H <= -2 ? 60
      : getiri1H < 2 ? 30
      : getiri1H < 5 ? 20
      : getiri1H < 10 ? 25
      : 45; // aşırı yükseliş de risk (geri çekilme olasılığı)

    // 4. Orta vade trend (1A, 21 gün)
    const getiri1A = periyodikGetiri(hisse.closes, 21);
    const trend1ARisk = getiri1A === null ? 40
      : getiri1A <= -20 ? 90
      : getiri1A <= -10 ? 70
      : getiri1A <= -3 ? 50
      : getiri1A < 5 ? 25
      : getiri1A < 15 ? 20
      : getiri1A < 30 ? 35
      : 55;

    // 5. Kısa-Orta Momentum EMA(5) / EMA(20) — son haftaya tepki verir
    const ema5 = emaHesapla(hisse.closes, 5);
    const ema20 = emaHesapla(hisse.closes, 20);
    const emaSpread = ema20 > 0 ? ((ema5 - ema20) / ema20) * 100 : 0;
    const momentumRisk = emaSpread <= -5 ? 85
      : emaSpread <= -2 ? 65
      : emaSpread <= -0.5 ? 50
      : emaSpread < 0.5 ? 35
      : emaSpread < 2 ? 25
      : emaSpread < 5 ? 20
      : 40; // çok pozitif spread = aşırı alım biası
    // EMA ile uyumlu momentum oranı (UI bileşenlerinde gösterim için)
    const momentumRatio = emaSpread;

    // 6. 52 Hafta Pozisyonu — YÖNLE BİRLEŞTİRİLMİŞ
    const range52 = hisse.fiftyTwoWeekHigh - hisse.fiftyTwoWeekLow;
    const pozisyon52 = range52 > 0 ? (hisse.currentPrice - hisse.fiftyTwoWeekLow) / range52 : 0.5;
    // 52H pozisyonu yüksek + son trend negatif = TEPE FORMASYONU riski
    // 52H pozisyonu düşük + son trend pozitif = DİP TOPLAMA fırsatı
    const trendYonu = (getiri1H ?? 0) + (getiri1A ?? 0); // basit toplam
    let pozisyonRisk: number;
    if (pozisyon52 > 0.85) {
      pozisyonRisk = trendYonu < -3 ? 80 : trendYonu < 3 ? 55 : 35;
    } else if (pozisyon52 > 0.6) {
      pozisyonRisk = trendYonu < -5 ? 60 : trendYonu < 3 ? 30 : 20;
    } else if (pozisyon52 > 0.35) {
      pozisyonRisk = trendYonu < -5 ? 55 : trendYonu < 3 ? 35 : 25;
    } else if (pozisyon52 > 0.15) {
      pozisyonRisk = trendYonu < -5 ? 65 : trendYonu < 3 ? 45 : 30;
    } else {
      pozisyonRisk = trendYonu < 0 ? 80 : 55;
    }

    // 7. Hacim Anomalisi — YONLU: düşüşре yüksek hacim = risk artışı
    const ortHacim = ortalama(hisse.volumes.filter(v => v > 0));
    const hacimOrani = ortHacim > 0 ? hisse.currentVolume / ortHacim : 1;
    const hacimYonu = (getiri1H ?? 0) < -2 ? "satis" : (getiri1H ?? 0) > 2 ? "alis" : "yatay";
    const hacimRisk = hacimOrani > 2.5
      ? (hacimYonu === "satis" ? 85 : hacimYonu === "alis" ? 25 : 50)
      : hacimOrani > 1.5
        ? (hacimYonu === "satis" ? 60 : hacimYonu === "alis" ? 20 : 35)
        : hacimOrani > 0.5 ? 25 : 45; // düşük hacim = belirsizlik

    // 8. RSI (aşırı alım/satım)
    const rsi = rsiHesapla(hisse.closes);
    const rsiRisk = rsi > 80 ? 80 : rsi > 70 ? 55 : rsi > 55 ? 25 : rsi > 45 ? 15 : rsi > 30 ? 35 : rsi > 20 ? 65 : 85;

    // 9. Günlük Range (intraday volatilite)
    const gunlukRange = hisse.currentPrice > 0
      ? (hisse.gunlukYuksek - hisse.gunlukDusuk) / hisse.currentPrice * 100
      : 0;
    const gunlukRangeRisk = gunlukRange > 6 ? 80 : gunlukRange > 4 ? 60 : gunlukRange > 2 ? 30 : gunlukRange > 1 ? 15 : 10;

    // 10. Temel Analiz (TradingView Scanner)
    let fk: number | null = null;
    let pddd: number | null = null;
    let piyasaDegeri: number | null = null;
    let fkRisk = 0;   // veri yoksa skora dahil olmasın (ağırlık dinamik düşürülüyor)
    let pdddRisk = 0;
    let fkVar = false;
    let pdddVar = false;

    try {
      const tvRes = await fetch("https://scanner.tradingview.com/turkey/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: { tickers: [`BIST:${ticker}`] },
          columns: ["price_earnings_ttm", "price_book_ratio", "market_cap_basic"]
        }),
        cache: "no-store"
      });
      const tvData = await tvRes.json();
      const d = tvData?.data?.[0]?.d;
      if (d) {
        fk = d[0];
        pddd = d[1];
        piyasaDegeri = d[2];
        
        // F/K risk skorlama — veri yoksa ağırlık 0
        if (fk !== null && fk !== undefined) {
          fkVar = true;
          if (fk < 0) fkRisk = 75; // zarar eden firma
          else if (fk < 8) fkRisk = 15;
          else if (fk < 15) fkRisk = 20;
          else if (fk < 25) fkRisk = 35;
          else if (fk < 40) fkRisk = 60;
          else fkRisk = 80;
        }

        // PD/DD risk skorlama — veri yoksa ağırlık 0
        if (pddd !== null && pddd !== undefined) {
          pdddVar = true;
          if (pddd < 0) pdddRisk = 70;
          else if (pddd < 1) pdddRisk = 15;
          else if (pddd < 2) pdddRisk = 25;
          else if (pddd < 4) pdddRisk = 45;
          else pdddRisk = 70;
        }
      }
    } catch (e) {
      console.error("TradingView Scanner hatasi:", e);
    }

    // 11. Likidite Riski (mutlak hacim)
    const ortHacimMutlak = ortalama(hisse.volumes.filter((v: number) => v > 0));
    const liikiditeRisk = ortHacimMutlak < 100000 ? 85 : ortHacimMutlak < 500000 ? 60 : ortHacimMutlak < 2000000 ? 35 : ortHacimMutlak < 10000000 ? 15 : 5;

    // 12. Veri Güvenilirliği
    const veriSayisi = hisse.closes.length;
    const veriGüvenilir = veriSayisi >= 45;

    // === TEKNIK / FINANSAL SKOR ===
    // Trend (1H + 1A + Momentum EMA) toplam %40 ağırlık -> kısa vade düşüş skoru hızlı yansır.
    const fkAg = isEndeks ? 0 : (fkVar ? 0.05 : 0);
    const pdddAg = isEndeks ? 0 : (pdddVar ? 0.05 : 0);
    const teknikBilesenleri = [
      { ad: "Beta (Sistematik Risk)", deger: isEndeks ? "N/A" : beta.toFixed(2), risk: betaRisk, agirlik: isEndeks ? 0 : 0.10 },
      { ad: "Volatilite (Yillik)", deger: volatilite.toFixed(1) + "%", risk: volRisk, agirlik: isEndeks ? 0.15 : 0.10 },
      { ad: "1 Haftalık Trend", deger: getiri1H !== null ? (getiri1H > 0 ? "+" : "") + getiri1H.toFixed(2) + "%" : "N/A", risk: trend1HRisk, agirlik: isEndeks ? 0.25 : 0.18 },
      { ad: "1 Aylık Trend", deger: getiri1A !== null ? (getiri1A > 0 ? "+" : "") + getiri1A.toFixed(2) + "%" : "N/A", risk: trend1ARisk, agirlik: isEndeks ? 0.15 : 0.12 },
      { ad: "Momentum (EMA5/EMA20)", deger: (emaSpread > 0 ? "+" : "") + emaSpread.toFixed(2) + "%", risk: momentumRisk, agirlik: isEndeks ? 0.15 : 0.10 },
      { ad: "52H Pozisyonu (yön ile)", deger: (pozisyon52 * 100).toFixed(0) + "%", risk: pozisyonRisk, agirlik: isEndeks ? 0.10 : 0.08 },
      { ad: "Hacim Anomalisi (yön ile)", deger: hacimOrani.toFixed(2) + "x · " + hacimYonu, risk: hacimRisk, agirlik: isEndeks ? 0.05 : 0.05 },
      { ad: "RSI (14)", deger: rsi.toFixed(0), risk: rsiRisk, agirlik: isEndeks ? 0.10 : 0.08 },
      { ad: "Gunluk Range", deger: gunlukRange.toFixed(2) + "%", risk: gunlukRangeRisk, agirlik: isEndeks ? 0.05 : 0.03 },
      { ad: "Likidite", deger: ortHacimMutlak > 1000000 ? (ortHacimMutlak/1000000).toFixed(1)+"M" : (ortHacimMutlak/1000).toFixed(0)+"K", risk: liikiditeRisk, agirlik: isEndeks ? 0 : 0.03 },
      { ad: "F/K Orani", deger: fk !== null ? fk.toFixed(2) : "N/A", risk: fkRisk, agirlik: fkAg },
      { ad: "PD/DD Orani", deger: pddd !== null ? pddd.toFixed(2) : "N/A", risk: pdddRisk, agirlik: pdddAg },
    ];

    const teknikAgirlik = teknikBilesenleri.reduce((acc, b) => acc + b.agirlik, 0);
    const teknikRiskSkor = teknikBilesenleri.reduce((acc, b) => acc + b.risk * b.agirlik, 0) / teknikAgirlik;

    const macroRisk = await getMacroRiskSnapshot().catch(() => null);
    const macroRiskSkor = macroRisk?.score ?? 0;
    const macroRiskAgirlik = macroRiskSkor >= 35 ? (isEndeks ? 0.28 : 0.14) : 0;

    // === BILESIK SKOR ===
    const skorBilesenleri = [
      ...teknikBilesenleri,
      { ad: "Makro/Siyasi Risk", deger: macroRisk ? `${macroRisk.levelTR} (${macroRisk.score}/100)` : "N/A", risk: macroRiskSkor, agirlik: macroRiskAgirlik },
    ];

    const toplamAgirlik = skorBilesenleri.reduce((acc, b) => acc + b.agirlik, 0);
    const hamSkor = toplamAgirlik > 0
      ? skorBilesenleri.reduce((acc, b) => acc + b.risk * b.agirlik, 0) / toplamAgirlik
      : 50;
    const makroTaban = macroRiskSkor >= 85 ? (isEndeks ? 58 : 52) : macroRiskSkor >= 65 ? (isEndeks ? 48 : 43) : 0;
    const toplamSkor = Math.max(hamSkor, makroTaban);

    // Genişletilmiş bantlar — skorun ortaya yığılması önlenir
    const seviye = toplamSkor >= 65 ? "Yuksek" : toplamSkor >= 50 ? "OrtaUstu" : toplamSkor >= 35 ? "Orta" : toplamSkor >= 20 ? "Dusuk" : "CokDusuk";
    const seviyeTR = toplamSkor >= 65 ? "Yüksek" : toplamSkor >= 50 ? "Orta-Üstü" : toplamSkor >= 35 ? "Orta" : toplamSkor >= 20 ? "Düşük" : "Çok Düşük";
    const renk = toplamSkor >= 65 ? "red" : toplamSkor >= 50 ? "orange" : toplamSkor >= 35 ? "yellow" : toplamSkor >= 20 ? "lightgreen" : "green";

    const payload = {
      ticker,
      skor: Math.round(toplamSkor),
      seviye,
      seviyeTR,
      renk,
      veriGüvenilir,
      veriSayisi,
      bilesenler: skorBilesenleri,
      piyasaDegeri,
      teknikSkor: Math.round(100 - teknikRiskSkor),
      teknikRiskSkor: Math.round(teknikRiskSkor),
      makroRisk: macroRisk ? {
        skor: macroRisk.score,
        seviye: macroRisk.levelTR,
        ozet: macroRisk.summary,
        tetikleyiciler: macroRisk.triggers,
        kaynaklar: macroRisk.sources,
        guncelleme: macroRisk.updatedAt,
      } : null,
      meta: {
        beta: parseFloat(beta.toFixed(3)),
        volatilite: parseFloat(volatilite.toFixed(2)),
        rsi: parseFloat(rsi.toFixed(1)),
        pozisyon52: parseFloat((pozisyon52 * 100).toFixed(1)),
        momentumYuzde: parseFloat(momentumRatio.toFixed(2)),
        hacimOrani: parseFloat(hacimOrani.toFixed(2)),
      }
    };
    riskCacheYaz(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (e) {
    console.error("Risk API hatasi:", e);
    return NextResponse.json({ error: "Hesaplama hatasi" }, { status: 500 });
  }
}
