"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Check, Layers3 } from "lucide-react";
import { useEffect, useState } from "react";

type Quote = { fiyat: string; degisim: string };
const COMPANIES = [{ kod: "THYAO", ad: "Türk Hava Yolları" }, { kod: "GARAN", ad: "Garanti BBVA" }, { kod: "ASELS", ad: "Aselsan" }];

export default function Hero() {
  const [quotes, setQuotes] = useState<Record<string, Quote | null>>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/fiyatlar", { signal: controller.signal });
        if (!response.ok) throw new Error("Fiyat alınamadı");
        const data = await response.json();
        setQuotes(data);
        setState(COMPANIES.some(c => data[c.kod]) ? "ready" : "error");
      } catch {
        if (!controller.signal.aborted) setState("error");
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  return (
    <section className="launch-hero relative z-10 mx-auto max-w-[1280px] px-6 pb-20 pt-36 lg:px-10 lg:pb-28 lg:pt-44">
      <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/5 px-3 py-2 text-xs font-semibold tracking-wide text-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" aria-hidden="true" /> TÜRKİYE PİYASALARI, DAHA ANLAŞILIR
          </div>
          <h1 className="font-[family-name:var(--font-geist)] text-[clamp(2.7rem,5.8vw,5.3rem)] font-semibold leading-[1.06] tracking-[-0.055em] text-slate-50">
            Veriyi gör.<br />Bağlamı anla.<br /><span className="text-blue-400">Kararı sen ver.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-slate-300 lg:text-lg lg:leading-8">
            Hisseler, fonlar, döviz ve halka arzlar tek çalışma alanında. Pako AI ile bilanço ve haberleri sade Türkçe oku; portföyünü ve risklerini birlikte izle.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-blue-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-400">Ücretsiz hesap aç <ArrowRight size={18} /></Link>
            <Link href="/hisseler" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-600/60 bg-slate-900/40 px-6 py-3 text-base font-semibold text-slate-200 transition hover:border-slate-400">Piyasaları keşfet</Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Check size={14} /> Kart bilgisi gerekmez</span>
            <span className="inline-flex items-center gap-1.5"><Check size={14} /> Pako AI: günlük 3 mesaj</span>
          </div>
        </div>
        <div className="relative">
          <div aria-hidden="true" className="pointer-events-none absolute -inset-8 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-slate-600/40 bg-[#0c1525] shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-5">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-100"><BarChart3 size={18} className="text-blue-400" /> Piyasaya bir bakış</div>
              <span className="rounded-md border border-slate-600/40 px-2 py-1 text-xs text-slate-400">BIST</span>
            </div>
            <div className="flex justify-between px-6 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-slate-400"><span>Hisse</span><span>Fiyat / Günlük değişim</span></div>
            <div aria-busy={state === "loading"}>
              {COMPANIES.map(c => {
                const q = quotes[c.kod];
                const change = Number(q?.degisim);
                const up = change >= 0;
                return <Link key={c.kod} href={`/hisse/${c.kod}`} className="group flex items-center justify-between gap-4 border-b border-slate-700/30 px-6 py-5 transition hover:bg-slate-800/50">
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-400/5 text-xs font-bold text-blue-200">{c.kod.slice(0,3)}</span><div><p className="text-sm font-bold text-slate-100">{c.kod}</p><p className="mt-0.5 text-xs text-slate-400">{c.ad}</p></div></div>
                  <div className="text-right tabular-nums"><p className="text-base font-semibold text-slate-100">{q ? `${q.fiyat} ₺` : "—"}</p><p className={`mt-1 flex items-center justify-end gap-1 text-xs font-medium ${q ? up ? "text-emerald-400" : "text-rose-400" : "text-slate-400"}`}>{q ? <>{up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{change.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" })}%</> : state === "loading" ? "Yükleniyor" : "Veri alınamadı"}</p></div>
                </Link>;
              })}
            </div>
            <div className="p-6"><div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-blue-300"><Layers3 size={15} /> FİYATIN ÖTESİNİ OKU</div><p className="text-sm leading-6 text-slate-300">Şirketin bilançosu, KAP bildirimleri ve teknik görünümü aynı sayfada. Kaynakları incele, ardından sorunu Pako’ya sor.</p><Link href="/hisse/THYAO" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200">Hisse detayını incele <ArrowRight size={16} /></Link></div>
            <div className="border-t border-slate-700/40 bg-slate-950/30 px-6 py-3 text-xs leading-5 text-slate-400">Yahoo Finance · 15 dakika gecikmeli. Piyasa kapalıyken son işlem verisi gösterilir.</div>
          </div>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-2 gap-5 border-t border-slate-700/40 pt-7 text-sm text-slate-400 sm:grid-cols-4"><span><strong className="mb-1 block text-base font-semibold text-slate-200">600+ hisse</strong>BIST kapsamı</span><span><strong className="mb-1 block text-base font-semibold text-slate-200">Kaynaklı veri</strong>Fiyat, bilanço, KAP</span><span><strong className="mb-1 block text-base font-semibold text-slate-200">Kişisel takip</strong>Portföy ve alarmlar</span><Link href="/veri-kaynaklari" className="group"><strong className="mb-1 block text-base font-semibold text-slate-200 group-hover:text-blue-300">Şeffaf metodoloji ↗</strong>Kapsamı ve sınırları oku</Link></div>
    </section>
  );
}
