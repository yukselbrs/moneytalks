import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import AppShell from "@/components/AppShell";
import { MADENLER } from "@/lib/maden-pricing";

export const revalidate = 300;

export const metadata = {
  title: "Kıymetli Maden Fiyatları — Gram Altın, Gümüş, Platin | ParaKonuşur",
  description: "Gram altın, ons altın, gümüş ve platin spot fiyatları — 15 dk gecikmeli, USD/TRY kurundan türetilmiş, kaynak şeffaflığıyla.",
};

type Snap = { kod: string; fiyat: number | null; degisim_yuzde: number | null; para_birimi: string; updated_at?: string };

function fiyatFmt(v: number | null, para: string) {
  if (v === null || v === undefined) return "—";
  return `${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${para === "TRY" ? "₺" : "$"}`;
}

function yuzdeFmt(v: number | null) {
  if (v === null || v === undefined) return "—";
  const s = Math.abs(v).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `−%${s}` : `+%${s}`;
}

export default async function MadenlerPage() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from("maden_snapshots").select("kod, fiyat, degisim_yuzde, para_birimi, updated_at");
  const snapMap = new Map(((data || []) as Snap[]).map(r => [r.kod, r]));

  return (
    <AppShell>
      <div className="min-h-screen dot-grid" style={{ background: "#0B1220" }}>
        <div className="mx-auto w-full max-w-3xl px-5 py-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400/80">Kıymetli Madenler</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100">Altın, Gümüş ve Platin</h1>
          <p className="mt-1 text-sm text-slate-500">
            Spot fiyatlar ~15 dk gecikmelidir; gram fiyatları USD/ons ve USD/TRY kurundan türetilir, fiziki piyasa fiyatından sapabilir.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {MADENLER.map(m => {
              const s = snapMap.get(m.kod);
              const dusus = (s?.degisim_yuzde ?? 0) < 0;
              return (
                <Link key={m.kod} href={`/maden/${m.kod}`}
                  className="card-glass hover-glow flex items-center justify-between gap-4 rounded-xl p-4 transition">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-sm font-extrabold text-amber-300">
                      {m.ad.split(" ").map(k => k[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR")}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-100">{m.ad}</p>
                      <p className="text-[11px] text-slate-500">{m.birim === "gram" ? "Gram · TL (türetilmiş)" : "Ons · USD (spot)"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold tracking-tight text-slate-100">{fiyatFmt(s?.fiyat ?? null, m.paraBirimi)}</p>
                    <p className={`text-xs font-bold ${dusus ? "text-red-400" : "text-emerald-400"}`}>{yuzdeFmt(s?.degisim_yuzde ?? null)}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {!data?.length && (
            <p className="card-glass mt-4 rounded-xl p-4 text-xs text-slate-500">
              Fiyatlar kısa süre içinde burada listelenecek (snapshot cron'unun ilk çalışması bekleniyor).
            </p>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-600">
            Veriler bilgilendirme amaçlıdır; yatırım tavsiyesi değildir. Kaynak: COMEX spot (Yahoo Finance) + USD/TRY.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
