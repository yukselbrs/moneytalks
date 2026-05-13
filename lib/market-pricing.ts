export type MarketQuote = {
  ticker: string;
  fiyat: number;
  oncekiKapanis: number | null;
  degisimYuzde: number | null;
  hacim: number | null;
  piyasaDegeri: number | null;
  yillikYuksek: number | null;
  yillikDusuk: number | null;
  gunlukYuksek: number | null;
  gunlukDusuk: number | null;
  kaynak: "yahoo";
  temettuDuzeltilmis: boolean;
};

type YahooFetchOptions = {
  cache?: RequestCache;
  revalidate?: number;
};

function positiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function lastValidIndex(values: (number | null)[], beforeIndex?: number) {
  const start = beforeIndex === undefined ? values.length - 1 : beforeIndex;
  for (let i = start; i >= 0; i--) {
    const value = values[i];
    if (value !== null && value !== undefined && value > 0) return i;
  }
  return -1;
}

function yahooUrl(ticker: string, range: string) {
  const cleanTicker = ticker.replace(".IS", "").toUpperCase();
  return `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}.IS?interval=1d&range=${range}`;
}

async function fetchYahooJson(ticker: string, range: string, options: YahooFetchOptions) {
  const init: RequestInit & { next?: { revalidate: number } } = {
    headers: { "User-Agent": "Mozilla/5.0" },
  };
  if (options.cache) init.cache = options.cache;
  if (options.revalidate !== undefined) init.next = { revalidate: options.revalidate };

  const res = await fetch(yahooUrl(ticker, range), init);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchMarketQuote(ticker: string, options: YahooFetchOptions = {}): Promise<MarketQuote | null> {
  try {
    const [data5d, data1d] = await Promise.all([
      fetchYahooJson(ticker, "5d", options),
      fetchYahooJson(ticker, "1d", options),
    ]);
    const result = data5d?.chart?.result?.[0];
    const meta = result?.meta;
    const fiyat = positiveNumber(meta?.regularMarketPrice);
    if (!meta || fiyat === null) return null;

    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];
    const adjustedCloses: (number | null)[] = result?.indicators?.adjclose?.[0]?.adjclose || [];
    const meta1d = data1d?.chart?.result?.[0]?.meta;
    const currentSessionPreviousClose = positiveNumber(meta1d?.chartPreviousClose)
      ?? positiveNumber(meta1d?.previousClose);
    const rawOncekiKapanis = currentSessionPreviousClose
      ?? positiveNumber(meta?.chartPreviousClose)
      ?? positiveNumber(meta?.previousClose);

    const latestClose = closes[closes.length - 1];
    const previousCompletedIndex = latestClose === null || latestClose === undefined
      ? lastValidIndex(closes)
      : lastValidIndex(closes, closes.length - 2);
    const oncekiHamKapanis = previousCompletedIndex >= 0 ? positiveNumber(closes[previousCompletedIndex]) : null;
    const oncekiAdjustedKapanis = previousCompletedIndex >= 0 ? positiveNumber(adjustedCloses[previousCompletedIndex]) : null;
    const temettuDuzeltilmis = Boolean(
      oncekiAdjustedKapanis
      && oncekiHamKapanis
      && Math.abs(oncekiAdjustedKapanis - oncekiHamKapanis) / oncekiHamKapanis > 0.001
    );

    let oncekiKapanis = temettuDuzeltilmis
      ? oncekiAdjustedKapanis
      : currentSessionPreviousClose ?? rawOncekiKapanis ?? oncekiHamKapanis ?? oncekiAdjustedKapanis;

    if (rawOncekiKapanis && rawOncekiKapanis > 0) {
      const openPrice = positiveNumber(meta.regularMarketOpen) ?? fiyat;
      const ratio = rawOncekiKapanis / openPrice;
      const rounded = Math.round(ratio);
      if (rounded >= 2 && Math.abs(ratio - rounded) / ratio < 0.10) {
        oncekiKapanis = rawOncekiKapanis / rounded;
      }
    }

    let degisimYuzde = oncekiKapanis && oncekiKapanis > 0
      ? ((fiyat - oncekiKapanis) / oncekiKapanis) * 100
      : positiveNumber(meta.regularMarketChangePercent);

    if (degisimYuzde !== null && Math.abs(degisimYuzde) > 50) {
      degisimYuzde = typeof meta.regularMarketChangePercent === "number"
        ? meta.regularMarketChangePercent
        : degisimYuzde;
    }

    return {
      ticker: ticker.replace(".IS", "").toUpperCase(),
      fiyat,
      oncekiKapanis: oncekiKapanis ?? null,
      degisimYuzde: degisimYuzde ?? null,
      hacim: positiveNumber(meta.regularMarketVolume),
      piyasaDegeri: positiveNumber(meta.marketCap),
      yillikYuksek: positiveNumber(meta.fiftyTwoWeekHigh),
      yillikDusuk: positiveNumber(meta.fiftyTwoWeekLow),
      gunlukYuksek: positiveNumber(meta.regularMarketDayHigh),
      gunlukDusuk: positiveNumber(meta.regularMarketDayLow),
      kaynak: "yahoo",
      temettuDuzeltilmis,
    };
  } catch {
    return null;
  }
}
