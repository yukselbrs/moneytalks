import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import {
  type HistoricalReturnFallback,
  type TefasFundGeneral,
  type TefasFundManagement,
  type TefasFundReturn,
  type TefasFundSize,
  fetchClosedFundReturnFallbacks,
  fetchHistoricalReturnFallbacks,
  fetchLatestTefasGeneral,
  fetchTefasDailyReturns,
  fetchTefasManagementFees,
  fetchTefasReturns,
  fetchTefasSizeRows,
  mergeTefasSnapshot,
} from "@/lib/tefas-fonlar";

export const runtime = "nodejs";
// Historical fallback fetch'leri (5 aralik + bekleme) 60 sn'yi asabilir.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  try {
    const { date, rows: generalRows } = await fetchLatestTefasGeneral(10).catch(() => ({ date: null, rows: [] as TefasFundGeneral[] }));
    const [returns, management, sizeRows, dailyRows] = await Promise.all([
      fetchTefasReturns(),
      fetchTefasManagementFees().catch(() => [] as TefasFundManagement[]),
      fetchTefasSizeRows().catch(() => [] as TefasFundSize[]),
      fetchTefasDailyReturns().catch(() => [] as TefasFundReturn[]),
    ]);
    // getiri_1h ve ret'te olmayan fonlarin donem getirileri bu fallback'ten gelir.
    // Bu olmadan Supabase snapshot'inda 1H kolonu tumden bos kaliyordu.
    const historicalReturns = await fetchHistoricalReturnFallbacks(date, generalRows)
      .catch(() => new Map<string, HistoricalReturnFallback>());

    // Kapali fonlar getiri/genel endpoint'lerinde yok; buyukluk verisinden
    // turetilmis fiyat gecmisiyle getirilerini hesapla.
    const closedReturns = await fetchClosedFundReturnFallbacks(sizeRows)
      .catch(() => new Map<string, HistoricalReturnFallback>());
    closedReturns.forEach((value, kod) => {
      if (!historicalReturns.has(kod)) historicalReturns.set(kod, value);
    });

    // NOT: kapali fonlar (tefas_durum === false) bilerek dahil ediliyor;
    // /api/fonlar "kapali" filtresi bu satirlara ihtiyac duyuyor.
    const snapshots = mergeTefasSnapshot(generalRows, returns, management, sizeRows, dailyRows, historicalReturns);

    const upsertStartedAt = new Date().toISOString();
    if (snapshots.length > 0) {
      const { error } = await supabase.from("fon_snapshots").upsert(
        snapshots.map((row) => ({ ...row, updated_at: upsertStartedAt }))
      );
      if (error) {
        if (error.code === "PGRST205" || error.message.includes("fon_snapshots")) {
          return NextResponse.json({
            success: true,
            source: "TEFAS",
            persistence: "cache-only",
            warning: "fon_snapshots tablosu Supabase'de yok; migration uygulaninca cron otomatik kaydetmeye baslar.",
            veri_tarihi: date,
            saved: 0,
            fetched: snapshots.length,
            returns: returns.length,
            management: management.length,
            sizes: sizeRows.length,
            daily: dailyRows.length,
            duration_ms: Date.now() - start,
          });
        }
        return NextResponse.json(
          { error: error.message, partial_saved: 0 },
          { status: 500 }
        );
      }
    }

    // Delist olan fonlar tabloda bayat kalmasin: bu turdaki upsert'in
    // dokunmadigi satirlari sil. Yalnizca saglikli (genis) snapshot'ta calisir.
    if (snapshots.length >= 1500) {
      await supabase.from("fon_snapshots").delete().lt("updated_at", upsertStartedAt);
    }

    return NextResponse.json({
      success: true,
      source: "TEFAS",
      veri_tarihi: date,
      saved: snapshots.length,
      returns: returns.length,
      management: management.length,
      sizes: sizeRows.length,
      daily: dailyRows.length,
      duration_ms: Date.now() - start,
      hata: 0,
    });
  } catch (error) {
    hataYakala("fon-cron:genel", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fon snapshot güncellenemedi", hata: 1 },
      { status: 500 }
    );
  }
}
