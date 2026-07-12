import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/cron-auth";
import {
  type TefasFundGeneral,
  type TefasFundManagement,
  type TefasFundReturn,
  type TefasFundSize,
  fetchLatestTefasGeneral,
  fetchTefasDailyReturns,
  fetchTefasManagementFees,
  fetchTefasReturns,
  fetchTefasSizeRows,
  mergeTefasSnapshot,
} from "@/lib/tefas-fonlar";

export const runtime = "nodejs";
export const maxDuration = 60;
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
    const snapshots = mergeTefasSnapshot(generalRows, returns, management, sizeRows, dailyRows)
      .filter((row) => row.tefas_durum !== false);

    if (snapshots.length > 0) {
      const { error } = await supabase.from("fon_snapshots").upsert(
        snapshots.map((row) => ({ ...row, updated_at: new Date().toISOString() }))
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
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fon snapshot güncellenemedi" },
      { status: 500 }
    );
  }
}
