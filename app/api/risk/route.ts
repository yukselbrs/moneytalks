import { NextRequest, NextResponse } from "next/server";

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
  const returns = gunlukGetiriler(closes.slice(-(period + 1)));
  const gains = returns.map(r => r > 0 ? r : 0);
  const losses = returns.map(r => r < 0 ? Math.abs(r) : 0);
  const avgGain = ortalama(gains);
  const avgLoss = ortalama(losses);
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker gerekli" }, { status: 400 });

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
    const betaRisk = isEndeks ? 0 : (beta < 0.5 ? 10 : beta < 0.8 ? 20 : beta < 1.2 ? 35 : beta < 1.6 ? 55 : 75);

    // 2. Volatilite (annualized)
    const volatilite = stdDev(hisseGetiri) * Math.sqrt(252) * 100;
    const volRisk = volatilite < 20 ? 10 : volatilite < 35 ? 25 : volatilite < 50 ? 45 : volatilite < 70 ? 60 : 80;

    // 3. 52 Hafta Pozisyonu — momentum & destek/direnç
    const range52 = hisse.fiftyTwoWeekHigh - hisse.fiftyTwoWeekLow;
    const pozisyon52 = range52 > 0 ? (hisse.currentPrice - hisse.fiftyTwoWeekLow) / range52 : 0.5;
    // Aşırı yüksek (>0.9) → balon riski, aşırı düşük (<0.15) → dip riski
    const pozisyonRisk = pozisyon52 > 0.9 ? 65 : pozisyon52 > 0.7 ? 35 : pozisyon52 > 0.4 ? 20 : pozisyon52 > 0.15 ? 30 : 55;

    // 4. Momentum (son 20 gün vs önceki 40 gün)
    const son20 = hisse.closes.slice(-20);
    const onceki40 = hisse.closes.slice(-60, -20);
    const momentumRatio = onceki40.length > 0
      ? (ortalama(son20) / ortalama(onceki40) - 1) * 100
      : 0;
    const momentumRisk = momentumRatio > 15 ? 55 : momentumRatio > 5 ? 30 : momentumRatio > -5 ? 20 : momentumRisk2(momentumRatio);

    function momentumRisk2(r: number): number {
      return r > -15 ? 35 : 50;
    }

    // 5. Hacim Anomalisi (günlük hacim / 3 aylık ortalama)
    const ortHacim = ortalama(hisse.volumes.filter(v => v > 0));
    const hacimOrani = ortHacim > 0 ? hisse.currentVolume / ortHacim : 1;
    const hacimRisk = hacimOrani > 3 ? 60 : hacimOrani > 2 ? 40 : hacimOrani > 0.5 ? 15 : 35;

    // 6. RSI (aşırı alım/satım)
    const rsi = rsiHesapla(hisse.closes);
    const rsiRisk = rsi > 75 ? 65 : rsi > 60 ? 30 : rsi > 40 ? 15 : rsi > 25 ? 30 : 60;

    // 7. Günlük Range (intraday volatilite)
    const gunlukRange = hisse.currentPrice > 0
      ? (hisse.gunlukYuksek - hisse.gunlukDusuk) / hisse.currentPrice * 100
      : 0;
    const gunlukRangeRisk = gunlukRange > 5 ? 55 : gunlukRange > 3 ? 35 : gunlukRange > 1.5 ? 20 : 10;

    // 8. Temel Analiz (TradingView Scanner)
    let fk: number | null = null;
    let pddd: number | null = null;
    let piyasaDegeri: number | null = null;
    let fkRisk = 40; // varsayilan
    let pdddRisk = 40;

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
        
        // F/K risk skorlama
        if (fk === null || fk === undefined) fkRisk = 40;
        else if (fk < 0) fkRisk = 70; // zarar eden firma
        else if (fk < 8) fkRisk = 15;
        else if (fk < 15) fkRisk = 20;
        else if (fk < 25) fkRisk = 35;
        else if (fk < 40) fkRisk = 55;
        else fkRisk = 70;
        
        // PD/DD risk skorlama
        if (pddd === null || pddd === undefined) pdddRisk = 40;
        else if (pddd < 0) pdddRisk = 65;
        else if (pddd < 1) pdddRisk = 15;
        else if (pddd < 2) pdddRisk = 25;
        else if (pddd < 4) pdddRisk = 40;
        else pdddRisk = 60;
      }
    } catch (e) {
      console.error("TradingView Scanner hatasi:", e);
    }

    // 9. Likidite Riski (mutlak hacim)
    const ortHacimMutlak = ortalama(hisse.volumes.filter((v: number) => v > 0));
    const liikiditeRisk = ortHacimMutlak < 100000 ? 80 : ortHacimMutlak < 500000 ? 55 : ortHacimMutlak < 2000000 ? 30 : ortHacimMutlak < 10000000 ? 15 : 10;

    // 9. Veri Güvenilirliği
    const veriSayisi = hisse.closes.length;
    const veriGüvenilir = veriSayisi >= 45;

    // === AĞIRLIKLI SKOR ===
    const skorBilesenleri = [
      { ad: "Beta (Sistematik Risk)", deger: isEndeks ? "N/A" : beta.toFixed(2), risk: betaRisk, agirlik: isEndeks ? 0 : 0.25 },
      { ad: "Volatilite (Yillik)", deger: volatilite.toFixed(1) + "%", risk: volRisk, agirlik: 0.20 },
      { ad: "52H Pozisyonu", deger: (pozisyon52 * 100).toFixed(0) + "%", risk: pozisyonRisk, agirlik: 0.15 },
      { ad: "Momentum (20g)", deger: (momentumRatio > 0 ? "+" : "") + momentumRatio.toFixed(1) + "%", risk: momentumRisk, agirlik: 0.15 },
      { ad: "Hacim Anomalisi", deger: hacimOrani.toFixed(2) + "x", risk: hacimRisk, agirlik: 0.10 },
      { ad: "RSI (14)", deger: rsi.toFixed(0), risk: rsiRisk, agirlik: 0.10 },
      { ad: "Gunluk Range", deger: gunlukRange.toFixed(2) + "%", risk: gunlukRangeRisk, agirlik: 0.04 },
      { ad: "Likidite", deger: ortHacimMutlak > 1000000 ? (ortHacimMutlak/1000000).toFixed(1)+"M" : (ortHacimMutlak/1000).toFixed(0)+"K", risk: liikiditeRisk, agirlik: 0.05 },
      { ad: "F/K Orani", deger: fk !== null ? fk.toFixed(2) : "N/A", risk: fkRisk, agirlik: 0.05 },
      { ad: "PD/DD Orani", deger: pddd !== null ? pddd.toFixed(2) : "N/A", risk: pdddRisk, agirlik: 0.05 },
    ];

    const toplamAgirlik = skorBilesenleri.reduce((acc, b) => acc + b.agirlik, 0);
    const toplamSkor = skorBilesenleri.reduce((acc, b) => acc + b.risk * b.agirlik, 0) / toplamAgirlik * (isEndeks ? 1 : 1);

    const seviye = toplamSkor >= 60 ? "Yuksek" : toplamSkor >= 35 ? "Orta" : "Dusuk";
    const seviyeTR = toplamSkor >= 60 ? "Yüksek" : toplamSkor >= 35 ? "Orta" : "Düşük";
    const renk = toplamSkor >= 60 ? "red" : toplamSkor >= 35 ? "yellow" : "green";

    return NextResponse.json({
      ticker,
      skor: Math.round(toplamSkor),
      seviye,
      seviyeTR,
      renk,
      veriGüvenilir,
      veriSayisi,
      bilesenler: skorBilesenleri,
      piyasaDegeri,
      meta: {
        beta: parseFloat(beta.toFixed(3)),
        volatilite: parseFloat(volatilite.toFixed(2)),
        rsi: parseFloat(rsi.toFixed(1)),
        pozisyon52: parseFloat((pozisyon52 * 100).toFixed(1)),
        momentumYuzde: parseFloat(momentumRatio.toFixed(2)),
        hacimOrani: parseFloat(hacimOrani.toFixed(2)),
      }
    });
  } catch (e) {
    console.error("Risk API hatasi:", e);
    return NextResponse.json({ error: "Hesaplama hatasi" }, { status: 500 });
  }
}
