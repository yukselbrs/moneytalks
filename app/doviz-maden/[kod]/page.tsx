"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import AppShell from "@/components/AppShell";
import { EnstrumanIkon } from "@/components/EnstrumanIkon";
import { supabase } from "@/components/lib/supabase";
import type HisseGrafikType from "@/components/HisseGrafik";

const HisseGrafik = dynamic<ComponentProps<typeof HisseGrafikType>>(() => import("@/components/HisseGrafik"), {
  ssr: false,
  loading: () => <div style={{ height: 310, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12 }} />,
});

type Enstruman = {
  kod: string; tur: "doviz" | "maden"; ad: string; aciklama: string | null;
  birim: string | null; taban: string | null; karsi: string | null; para_birimi: string;
  fiyat: number | null; degisim_yuzde: number | null;
  gunluk_yuksek: number | null; gunluk_dusuk: number | null;
  getiri_1h: number | null; getiri_1a: number | null; getiri_3a: number | null;
  getiri_6a: number | null; getiri_1y: number | null; getiri_5y: number | null;
  kaynak?: string; usdtry_kur: number | null; updated_at?: string;
};
type Profil = { volatilite: number | null; rsi: number | null; momentum1a: number | null };
type Yanit = { enstruman: Enstruman; grafik: { tarih: string; fiyat: number }[]; range: string; profil: Profil };

const PARA_SEMBOL: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€", JPY: "¥" };

function fiyatFmt(v: number | null | undefined, tur: "doviz" | "maden", para: string) {
  if (v === null || v === undefined) return "—";
  const hane = tur === "doviz" ? (v < 10 ? 4 : v < 100 ? 3 : 2) : 2;
  const s = v.toLocaleString("tr-TR", { minimumFractionDigits: hane, maximumFractionDigits: hane });
  return tur === "doviz" ? s : `${s} ${PARA_SEMBOL[para] || para}`;
}

function yuzde(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  const s = Math.abs(v).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `−%${s}` : `+%${s}`;
}

export default function DovizMadenDetay({ params }: { params: Promise<{ kod: string }> }) {
  const { kod } = use(params);
  const [veri, setVeri] = useState<Yanit | null>(null);
  const [range, setRange] = useState("1mo");
  const [hata, setHata] = useState(false);
  const [aiAnaliz, setAiAnaliz] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTarih, setAiTarih] = useState<string | null>(null);

  async function handleAnaliz() {
    setAiLoading(true);
    setAiAnaliz("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAiAnaliz("Analiz oluşturmak için giriş yapmanız gerekir.");
        return;
      }
      const res = await fetch("/api/doviz-maden/analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ kod }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiAnaliz(data.error || "Analiz alınamadı.");
        return;
      }
      setAiAnaliz(data.analiz || "Analiz şu an kullanılabilir değil, lütfen tekrar deneyin.");
      if (data.created_at) setAiTarih(data.created_at);
    } catch {
      setAiAnaliz("Analiz alınamadı, lütfen tekrar deneyin.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    let iptal = false;
    fetch(`/api/doviz-maden/${kod}?range=${range}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(j => { if (!iptal) setVeri(j); })
      .catch(() => { if (!iptal) setHata(true); });
    return () => { iptal = true; };
  }, [kod, range]);

  const e = veri?.enstruman;
  const dusus = (e?.degisim_yuzde ?? 0) < 0;
  const doviz = e?.tur === "doviz";
  const bayat = e?.updated_at ? Date.now() - new Date(e.updated_at).getTime() > 60 * 60 * 1000 : false;

  return (
    <AppShell>
      <div className="min-h-screen dot-grid" style={{ background: "#0B1220" }}>
        <div className="mx-auto w-full max-w-3xl px-5 py-9">
          <Link href="/doviz-maden" className="text-xs text-slate-500 hover:text-slate-300">← Döviz ve Kıymetli Madenlere dön</Link>

          {hata && <p className="card-glass mt-4 rounded-xl p-5 text-sm text-red-300">Enstrüman bulunamadı ya da veri alınamadı.</p>}

          {e && (
            <>
              <div className="card-glass mt-4 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${doviz ? "text-blue-400/80" : "text-amber-400/80"}`}>
                      {doviz ? "Döviz · Bankalararası kur" : `Kıymetli Maden · ${e.birim === "gram" ? "Gram (türetilmiş)" : "Ons (spot)"}`}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-100">{e.ad}</h1>
                    {e.aciklama && <p className="mt-0.5 text-xs text-slate-500">{e.aciklama}</p>}
                  </div>
                  <EnstrumanIkon tur={e.tur} kod={e.kod} taban={e.taban} karsi={e.karsi} boyut={44} />
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-4">
                  <p className="text-3xl font-extrabold tracking-tight text-slate-100">{fiyatFmt(e.fiyat, e.tur, e.para_birimi)}</p>
                  <p className={`pb-1 text-base font-bold ${dusus ? "text-red-400" : "text-emerald-400"}`}>{yuzde(e.degisim_yuzde)}</p>
                  {bayat && (
                    <span className="mb-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                      gecikmeli
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {doviz && e.taban && e.karsi ? `1 ${e.taban} = ${fiyatFmt(e.fiyat, "doviz", e.karsi)} ${e.karsi} · ` : ""}
                  {e.gunluk_dusuk !== null && e.gunluk_yuksek !== null
                    ? `Günlük: ${fiyatFmt(e.gunluk_dusuk, e.tur, e.para_birimi)} – ${fiyatFmt(e.gunluk_yuksek, e.tur, e.para_birimi)} · `
                    : ""}
                  ~15 dk gecikmeli
                  {e.usdtry_kur ? ` · USD/TRY ${e.usdtry_kur.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ile türetildi` : ""}
                </p>
              </div>

              <div className="card-glass mt-4 rounded-xl p-5">
                <h2 className="mb-3 text-sm font-semibold text-slate-200">{doviz ? "Kur Grafiği" : "Fiyat Grafiği"}</h2>
                <HisseGrafik grafik={veri.grafik} grafikRange={range} setGrafikRange={setRange} fetchGrafik={(r: string) => setRange(r)} grafikDegisim={e.degisim_yuzde} gunlukDusuk={e.gunluk_dusuk} gunlukYuksek={e.gunluk_yuksek} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
                {([["1 Hafta", e.getiri_1h], ["1 Ay", e.getiri_1a], ["3 Ay", e.getiri_3a], ["6 Ay", e.getiri_6a], ["1 Yıl", e.getiri_1y], ["5 Yıl", e.getiri_5y]] as const).map(([l, v]) => (
                  <div key={l} className="card-glass rounded-xl p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{l}</p>
                    <p className={`mt-1 text-sm font-bold ${(v ?? 0) < 0 ? "text-red-400" : "text-emerald-400"}`}>{yuzde(v)}</p>
                  </div>
                ))}
              </div>

              {veri.profil && (
                <div className="card-glass mt-4 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-slate-200">
                    Oynaklık Profili <span className="ml-1 text-[10px] font-normal text-slate-500">(enstrümana özgü ölçüm — hisse risk skoruyla kıyaslanmaz)</span>
                  </h2>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div><p className="text-[10px] uppercase tracking-wider text-slate-500">Yıllık Volatilite</p><p className="text-sm font-bold text-slate-200">{veri.profil.volatilite !== null ? `%${veri.profil.volatilite.toFixed(1)}` : "—"}</p></div>
                    <div><p className="text-[10px] uppercase tracking-wider text-slate-500">RSI (14)</p><p className="text-sm font-bold text-slate-200">{veri.profil.rsi !== null ? veri.profil.rsi.toFixed(0) : "—"}</p></div>
                    <div><p className="text-[10px] uppercase tracking-wider text-slate-500">Momentum (1A)</p><p className="text-sm font-bold text-slate-200">{yuzde(veri.profil.momentum1a)}</p></div>
                  </div>
                </div>
              )}

              <div className="card-glass mt-4 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-200">AI Analiz</h2>
                    <p className="mt-0.5 text-[11px] text-slate-500">Teknik + temel değerlendirme · 15 dakikada bir yenilenir</p>
                  </div>
                  <button
                    onClick={handleAnaliz}
                    disabled={aiLoading}
                    className="inline-flex h-10 items-center justify-center rounded-[10px] border border-blue-300/20 bg-gradient-to-br from-blue-700 to-blue-500 px-4 text-[13px] font-bold text-slate-50 shadow-[0_12px_28px_rgba(37,99,235,0.20)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiLoading ? "Analiz ediliyor..." : "Yapay Zeka ile Analiz Et"}
                  </button>
                </div>
                {aiAnaliz && (
                  <div className="mt-4 space-y-2">
                    {aiAnaliz.split("\n").filter(s => s.trim()).map((satir, i) => {
                      const baslik = satir.match(/^\*\*(.+)\*\*$/);
                      if (baslik) return <p key={i} className="pt-1 text-[12px] font-bold uppercase tracking-wider text-blue-300">{baslik[1]}</p>;
                      return <p key={i} className="text-[13px] leading-relaxed text-slate-300">{satir.replace(/\*\*/g, "")}</p>;
                    })}
                    {aiTarih && (
                      <p className="pt-1 text-[10px] text-slate-600">
                        {new Date(aiTarih).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })} itibarıyla üretildi.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-600">
                {doviz
                  ? "Kaynak: Yahoo Finance (bankalararası kur, kesintide ECB günlük referansı). Banka gişe ve efektif kurlarından farklıdır."
                  : `Kaynak: COMEX spot (Yahoo Finance)${e.usdtry_kur ? " + USD/TRY kuru" : ""}. Fiziki piyasa (kapalıçarşı/banka) fiyatlarından sapabilir.`}
                {" "}Bu sayfa yatırım tavsiyesi değildir; al/sat yönlendirmesi içermez.
              </p>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
