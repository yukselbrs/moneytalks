// Risk motorunun saf hesap fonksiyonlari — /api/risk route'undan cikarildi (Faz 4 D.1).
// Yan etkisiz, fetch'siz: birim testleri tests/risk-hesaplari.test.ts'te.

export function gunlukGetiriler(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return returns;
}

export function ortalama(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  const mean = ortalama(arr);
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

export function betaHesapla(hisseGetiri: number[], piyasaGetiri: number[]): number {
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

// Wilder (1978) RSI: ilk `period` delta basit ortalama ile seed, kalan seri ustel duzeltme.
export function rsiHesapla(closes: number[], period = 14): number {
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

export function emaHesapla(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let ema = ortalama(closes.slice(0, period));
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

export function periyodikGetiri(closes: number[], gun: number): number | null {
  if (closes.length < gun + 1) return null;
  const son = closes[closes.length - 1];
  const oncesi = closes[closes.length - 1 - gun];
  if (!son || !oncesi || oncesi <= 0) return null;
  return ((son - oncesi) / oncesi) * 100;
}
