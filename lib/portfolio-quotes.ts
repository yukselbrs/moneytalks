import { supabase } from "@/components/lib/supabase";

export type PortfolioAsset = { ticker: string; tur?: string };
export type PortfolioQuote = { fiyat: number; degisim: number };

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
  const add = (key: string, price: unknown, change: unknown) => {
    const fiyat = marketNumber(price);
    const degisim = marketNumber(change);
    if (fiyat !== null && fiyat > 0 && degisim !== null) map[key] = { fiyat, degisim };
  };
  const tasks: Promise<void>[] = [];
  for (let i = 0; i < stocks.length; i += 50) {
    const tickers = stocks.slice(i, i + 50);
    tasks.push((async () => {
      const json = await getJson(`/api/fiyatlar?extra=${encodeURIComponent(tickers.join(","))}`);
      for (const ticker of tickers) add(ticker, json[ticker]?.fiyat, json[ticker]?.degisim);
    })());
  }
  if (funds.length) tasks.push((async () => {
    const { data, error } = await supabase.from("fon_snapshots").select("kod, fiyat, gunluk_getiri").in("kod", funds);
    if (error) throw error;
    for (const fund of data ?? []) add(fund.kod, fund.fiyat, fund.gunluk_getiri);
  })());
  if (hasInstruments) tasks.push((async () => {
    const json = await getJson("/api/doviz-maden");
    for (const item of json.items ?? []) add(item.kod, item.fiyat, item.degisim_yuzde);
  })());
  await Promise.allSettled(tasks);
  return map;
}
