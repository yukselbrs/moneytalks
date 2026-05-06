import { BIST_HISSELER } from "@/lib/bist-hisseler";
import { NextRequest } from "next/server";

const ALLOWED_TICKERS = new Set([
  ...BIST_HISSELER.map((h) => h.ticker),
  "XU100",
  "XU030",
  "XU050",
]);

export function normalizeTicker(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const ticker = raw.trim().toUpperCase().replace(/\.IS$/, "").replace(/=X$/, "");
  if (!/^[A-Z0-9]{2,10}$/.test(ticker)) return null;
  if (!ALLOWED_TICKERS.has(ticker)) return null;
  return ticker;
}

export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

const TICKER_RENKLER = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F97316",
  "#10B981", "#06B6D4", "#EAB308", "#EF4444",
  "#6366F1", "#14B8A6",
];

export function tickerRenk(ticker: string): string {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  return TICKER_RENKLER[Math.abs(hash) % TICKER_RENKLER.length];
}
