import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import {
  karneHesapla,
  fetchEndeksHaftalik,
  fetchRiskOzetleri,
  haftaBaslangici,
  isoHaftaNo,
  EGITIM_ICERIKLERI,
  type KapOlay,
  type PortfoyRow,
  type SnapshotRow,
} from "@/lib/karne";

// "Karnemi simdi gor" (Faz 4 B.7): Pazar cron'unu beklemeden, kullanicinin guncel karnesini hesaplar.
// Yan etkisiz — karne_gonderim'e yazmaz, e-posta atmaz.

export const maxDuration = 60;

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, supabaseAuth);
  if (!auth.user) return auth.response;
  const userId = auth.user.id;

  const { data: pozisyonlar } = await supabaseAdmin
    .from("portfoy")
    .select("user_id, ticker, adet")
    .eq("user_id", userId);
  if (!pozisyonlar?.length) {
    return NextResponse.json({ karne: null, hafta: haftaBaslangici(), egitim: null, onceki: null });
  }

  const tickers = [...new Set((pozisyonlar as PortfoyRow[]).map(p => p.ticker))];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://parakonusur.com";
  const yediGunOnce = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [snapshotRes, kapRes, endeksHaftalik, oncekiRes] = await Promise.all([
    supabaseAdmin.from("hisse_snapshots").select("ticker, fiyat, getiri_1h").in("ticker", tickers),
    supabaseAdmin.from("kap_bildirimleri")
      .select("disclosure_index, tickerlar, bildirim_tipi, ozet_tek_cumle, baslik")
      .overlaps("tickerlar", tickers)
      .gte("kap_zamani", yediGunOnce)
      .order("kap_zamani", { ascending: false })
      .limit(20),
    fetchEndeksHaftalik(),
    supabaseAdmin.from("karne_gonderim")
      .select("hafta_baslangic, ozet")
      .eq("user_id", userId)
      .order("hafta_baslangic", { ascending: false })
      .limit(1),
  ]);

  const snapshots: Record<string, SnapshotRow> = {};
  for (const s of (snapshotRes.data || []) as SnapshotRow[]) snapshots[s.ticker] = s;

  const riskler = await fetchRiskOzetleri(appUrl, tickers);
  const karne = karneHesapla(pozisyonlar as PortfoyRow[], snapshots, riskler, endeksHaftalik, (kapRes.data || []) as KapOlay[]);

  return NextResponse.json({
    karne,
    hafta: haftaBaslangici(),
    egitim: EGITIM_ICERIKLERI[isoHaftaNo() % EGITIM_ICERIKLERI.length],
    onceki: oncekiRes.data?.[0]?.ozet ?? null,
  });
}
