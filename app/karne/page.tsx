"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/components/lib/supabase";

type SektorPay = { sektor: string; yuzde: number };
type KapOlay = { disclosure_index: number; tickerlar: string[]; ozet_tek_cumle: string | null; baslik: string | null };
type Karne = {
  toplamDeger: number;
  haftalikGetiri: number | null;
  endeksHaftalik: number | null;
  sektorler: SektorPay[];
  sektorSayisi: number;
  riskSkor: number | null;
  beta: number | null;
  riskKapsamYuzde: number;
  kapOlaylar: KapOlay[];
};
type KarneYaniti = {
  karne: Karne | null;
  hafta: string;
  egitim: { baslik: string; metin: string } | null;
  onceki: { riskSkor: number | null; haftalikGetiri: number | null; toplamDeger: number } | null;
};

function yuzde(v: number | null | undefined, isaret = true) {
  if (v === null || v === undefined) return "—";
  const s = v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isaret && v > 0 ? "+" : ""}%${s.replace("-", "−")}`;
}

export default function KarnePage() {
  const { session, sessionHazir } = useSession();
  const [veri, setVeri] = useState<KarneYaniti | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionHazir) return;
    if (!session) { setYukleniyor(false); return; }
    let iptal = false;
    (async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const res = await fetch("/api/karne", { headers: { authorization: `Bearer ${s?.access_token}` } });
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as KarneYaniti;
        if (!iptal) setVeri(j);
      } catch {
        if (!iptal) setHata("Karne hesaplanamadı — sayfayı yenileyerek tekrar dene.");
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    return () => { iptal = true; };
  }, [session, sessionHazir]);

  const karne = veri?.karne ?? null;
  const riskDelta = veri?.onceki?.riskSkor != null && karne?.riskSkor != null && Math.round(karne.riskSkor) !== veri.onceki.riskSkor
    ? { eski: veri.onceki.riskSkor, yeni: Math.round(karne.riskSkor) }
    : null;

  return (
    <AppShell>
      <div className="min-h-screen dot-grid" style={{ background: "#0B1220" }}>
        <div className="mx-auto w-full max-w-3xl px-5 py-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-400/80">Portföy Karnesi</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100">Karnemi şimdi gör</h1>
          <p className="mt-1 text-sm text-slate-500">
            Bu karne portföyünün mevcut durumunu tarif eder; ne yapman gerektiğini söylemez. Pazar akşamları e-postayla da gelir.
          </p>

          {yukleniyor && (
            <div className="card-glass mt-6 animate-pulse rounded-xl p-6 text-sm text-slate-500">Karnen hesaplanıyor…</div>
          )}

          {!yukleniyor && !session && (
            <div className="card-glass mt-6 rounded-xl p-6 text-sm text-slate-400">
              Karneni görmek için <Link href="/login" className="text-blue-400 underline-offset-2 hover:underline">giriş yap</Link>.
            </div>
          )}

          {!yukleniyor && hata && <div className="card-glass mt-6 rounded-xl p-6 text-sm text-red-300">{hata}</div>}

          {!yukleniyor && session && !hata && !karne && (
            <div className="card-glass mt-6 rounded-xl p-6 text-sm text-slate-400">
              Karne için önce <Link href="/portfoy" className="text-blue-400 underline-offset-2 hover:underline">portföyüne pozisyon ekle</Link>.
            </div>
          )}

          {karne && (
            <div className="mt-6 flex flex-col gap-4">
              <div className="card-glass rounded-xl p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Toplam Değer</p>
                    <p className="text-2xl font-extrabold tracking-tight text-slate-100">
                      {karne.toplamDeger.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Haftalık Hareket</p>
                    <p className={`text-lg font-bold ${karne.haftalikGetiri !== null && karne.haftalikGetiri < 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {yuzde(karne.haftalikGetiri)}
                    </p>
                    <p className="text-xs text-slate-500">XU100: {yuzde(karne.endeksHaftalik)}</p>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-200">Sektör dağılımın</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {karne.sektorler.map(s => (
                    <div key={s.sektor} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 truncate text-xs text-slate-400">{s.sektor}</span>
                      <div className="h-2 flex-1 rounded bg-slate-800">
                        <div className="h-2 rounded bg-blue-500" style={{ width: `${Math.min(s.yuzde, 100)}%` }} />
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs font-semibold text-slate-200">%{s.yuzde.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  {karne.sektorler[0] && karne.sektorler[0].yuzde >= 60
                    ? `Portföyünün %${karne.sektorler[0].yuzde.toFixed(0)}'i ${karne.sektorler[0].sektor} sektöründe. Tek sektör ağırlığı yüksek olduğunda o sektöre özgü dalgalanmalar portföyün geneline daha güçlü yansır.`
                    : `Portföyün ${karne.sektorSayisi} farklı sektöre dağılmış durumda.`}
                </p>
              </div>

              <div className="card-glass rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-200">Risk profilin</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {karne.riskSkor !== null && karne.riskKapsamYuzde >= 60
                    ? `Değer-ağırlıklı risk skorun 100 üzerinden ${karne.riskSkor.toFixed(0)}${karne.beta !== null ? `; portföy betan ${karne.beta.toFixed(2)} — ${karne.beta > 1.15 ? "endeksten daha oynak" : karne.beta < 0.85 ? "endeksten daha yumuşak" : "endekse yakın"} bir profil` : ""}.`
                    : "Risk skoru şu an yeterli veriyle hesaplanamadı."}
                  {" "}Bu bir risk ölçüsüdür, getiri tahmini değildir.
                </p>
                {riskDelta && (
                  <p className="mt-2 text-xs text-slate-500">Son karneye göre risk skorun {riskDelta.eski} → {riskDelta.yeni}.</p>
                )}
              </div>

              {veri?.egitim && (
                <div className="card-glass rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-slate-200">{veri.egitim.baslik}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{veri.egitim.metin}</p>
                </div>
              )}

              <p className="text-center text-[11px] leading-relaxed text-slate-600">
                Veriler ~15 dk gecikmelidir. Bu sayfa yatırım tavsiyesi değildir; al/sat yönlendirmesi içermez.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
