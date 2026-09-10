export type PortfolioAsset = { ticker: string; tur?: string };
export type PortfolioQuote = { fiyat: number; degisim: number; veriTarihi?: string };

export function marketNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.replace("%", "").trim();
  const number = Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
  return Number.isFinite(number) ? number : null;
}

async function getJson(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Fiyat kaynağına erişilemiyor");
  return response.json();
}

export async function portfolioQuotes(items: PortfolioAsset[]): Promise<Record<string, PortfolioQuote>> {
  const stocks = items.filter(p => !p.tur || p.tur === "hisse").map(p => p.ticker.trim());
  const funds = items.filter(p => p.tur === "fon").map(p => p.ticker.trim());
  const hasInstruments = items.some(p => p.tur === "maden" || p.tur === "doviz");
  const map: Record<string, PortfolioQuote> = {};
  const add = (key: string, price: unknown, change: unknown, date?: unknown) => {
    const fiyat = marketNumber(price);
    const degisim = marketNumber(change);
    if (fiyat !== null && fiyat > 0 && degisim !== null && degisim > -100) map[key] = { fiyat, degisim, ...(typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? { veriTarihi: date } : {}) };
  };
  const tasks: Promise<void>[] = [];
  for (let i = 0; i < stocks.length; i += 50) {
    const tickers = stocks.slice(i, i + 50);
    tasks.push((async () => {
      const json = await getJson(`/api/fiyatlar?extra=${encodeURIComponent(tickers.join(","))}`);
      for (const ticker of tickers) add(ticker, json[ticker]?.fiyat, json[ticker]?.degisim);
    })());
  }
  for (let i = 0; i < funds.length; i += 25) {
    const codes = funds.slice(i, i + 25);
    tasks.push((async () => {
      const json = await getJson(`/api/fonlar?kodlar=${encodeURIComponent(codes.join(","))}`);
      for (const fund of json.items ?? []) add(fund.kod, fund.fiyat, fund.gunluk_getiri, fund.veri_tarihi);
    })());
  }
  if (hasInstruments) tasks.push((async () => {
    const json = await getJson("/api/doviz-maden");
    for (const item of json.items ?? []) add(item.kod, item.fiyat, item.degisim_yuzde);
  })());
  await Promise.allSettled(tasks);
  return map;
}
