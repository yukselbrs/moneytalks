import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { error } = await supabaseAuth.auth.getUser(token);
  if (error) return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });

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
