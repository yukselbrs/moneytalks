import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, supabaseAuth);
  if (!auth.user) return auth.response;

  const tickers = (req.nextUrl.searchParams.get("tickers") ?? "")
    .split(",")
    .map(t => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);

  if (tickers.length === 0) return NextResponse.json({});

  try {
    const res = await fetch("https://scanner.tradingview.com/turkey/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: { tickers: tickers.map(t => `BIST:${t}`) },
        columns: ["beta_1_year", "description"],
      }),
      next: { revalidate: 3600 },
    });

    const data = await res.json() as { data?: Array<{ s: string; d: [number | null, string | null] }> };
    const result: Record<string, { beta: number | null; sirketAdi: string }> = {};

    for (const row of (data.data ?? [])) {
      const ticker = row.s.replace("BIST:", "");
      const [beta, description] = row.d;
      result[ticker] = {
        beta: typeof beta === "number" && Number.isFinite(beta) ? beta : null,
        sirketAdi: description ?? ticker,
      };
    }

    return NextResponse.json(result, { headers: { "Cache-Control": "s-maxage=3600" } });
  } catch {
    return NextResponse.json({ error: "Veri alınamadı" }, { status: 500 });
  }
}
