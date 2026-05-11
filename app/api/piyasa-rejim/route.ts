import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SnapshotRow = {
  ticker: string;
  degisim_yuzde: number | string | null;
  hacim: number | string | null;
  piyasa_degeri: number | string | null;
};

function sayi(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function yuvarla(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export async function GET() {
  const { data, error } = await supabase
    .from("hisse_snapshots")
    .select("ticker, degisim_yuzde, hacim, piyasa_degeri")
    .not("degisim_yuzde", "is", null)
    .not("hacim", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = ((data || []) as SnapshotRow[])
    .map((row) => ({
      ticker: row.ticker,
      degisim: sayi(row.degisim_yuzde),
      hacim: sayi(row.hacim) ?? 0,
      piyasaDegeri: sayi(row.piyasa_degeri) ?? 0,
    }))
    .filter((row) => row.degisim !== null && Math.abs(row.degisim) <= 12 && row.hacim > 10000) as {
      ticker: string;
      degisim: number;
      hacim: number;
      piyasaDegeri: number;
    }[];

  if (rows.length === 0) {
    return NextResponse.json({
      mod: "Veri Bekleniyor",
      ton: "neutral",
      ozet: "Piyasa rejimi için yeterli snapshot verisi yok.",
      metrikler: { yukselen: 0, dusen: 0, notr: 0, yayilim: 0, ortalamaDegisim: 0, hacimCanliligi: "Veri yok" },
      liderler: [],
      baski: [],
    });
  }

  const yukselen = rows.filter((row) => row.degisim > 0.05).length;
  const dusen = rows.filter((row) => row.degisim < -0.05).length;
  const notr = rows.length - yukselen - dusen;
  const yayilim = yukselen / rows.length;
  const ortalamaDegisim = rows.reduce((sum, row) => sum + row.degisim, 0) / rows.length;
  const toplamHacim = rows.reduce((sum, row) => sum + row.hacim, 0);
  const hacimliPozitif = rows
    .filter((row) => row.degisim > 0)
    .reduce((sum, row) => sum + row.hacim, 0);
  const hacimPozitifPay = toplamHacim > 0 ? hacimliPozitif / toplamHacim : 0;

  let mod = "Yatay";
  let ton: "positive" | "negative" | "neutral" | "selective" = "neutral";
  if (ortalamaDegisim >= 0.65 && yayilim >= 0.58 && hacimPozitifPay >= 0.52) {
    mod = "Risk-On";
    ton = "positive";
  } else if (ortalamaDegisim <= -0.65 && yayilim <= 0.42 && hacimPozitifPay <= 0.48) {
    mod = "Risk-Off";
    ton = "negative";
  } else if (ortalamaDegisim > 0.15 || yayilim > 0.55) {
    mod = "Seçici Pozitif";
    ton = "selective";
  } else if (ortalamaDegisim < -0.15 || yayilim < 0.45) {
    mod = "Seçici Negatif";
    ton = "selective";
  }

  const hacimCanliligi = hacimPozitifPay >= 0.58
    ? "Alıcılı"
    : hacimPozitifPay <= 0.42
      ? "Satıcılı"
      : "Dengeli";

  const liderler = [...rows].sort((a, b) => b.degisim - a.degisim).slice(0, 3).map((row) => ({
    ticker: row.ticker,
    degisim: yuvarla(row.degisim, 2),
  }));
  const baski = [...rows].sort((a, b) => a.degisim - b.degisim).slice(0, 3).map((row) => ({
    ticker: row.ticker,
    degisim: yuvarla(row.degisim, 2),
  }));

  const ozet = `${yukselen} yükselen / ${dusen} düşen; ortalama hareket ${ortalamaDegisim >= 0 ? "+" : ""}${yuvarla(ortalamaDegisim, 2).toLocaleString("tr-TR")}% ve hacim akışı ${hacimCanliligi.toLowerCase()}.`;

  const response = NextResponse.json({
    mod,
    ton,
    ozet,
    metrikler: {
      yukselen,
      dusen,
      notr,
      yayilim: yuvarla(yayilim * 100, 1),
      ortalamaDegisim: yuvarla(ortalamaDegisim, 2),
      hacimCanliligi,
      kapsam: rows.length,
    },
    liderler,
    baski,
  });
  response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  return response;
}
