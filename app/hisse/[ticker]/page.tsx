"use client";

import { useState, use, useCallback, useEffect, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import { supabase } from "@/components/lib/supabase";
import StockLogo from "@/components/StockLogo";
import { Sparkles, Star, Building2, TrendingUp, Target, AlertTriangle, Activity } from "lucide-react";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/formatters";
import { LS } from "@/lib/storage-keys";
import type HisseGrafikType from "@/components/HisseGrafik";

const HisseGrafik = dynamic<ComponentProps<typeof HisseGrafikType>>(() => import("@/components/HisseGrafik"), {
  ssr: false,
  loading: () => <div style={{ height: 310, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12, marginBottom: 24 }} />,
});

const HisseChatbot = dynamic(() => import("@/components/HisseChatbot"), { ssr: false });

interface HisseVeri {
  fiyat: number;
  oncekiKapanis: number;
  degisim: number | null;
  degisimYuzde?: number | null;
  hacim: number;
  yillikYuksek: number;
  yillikDusuk: number;
  gunlukYuksek: number;
  gunlukDusuk: number;
  sirketAdi?: string;
  domain?: string;
}

function renderMarkdown(text: string) {
  const sections: { title: string; body: string; bullets: string[] }[] = [];
  const lines = text.split("\n");
  let current: { title: string; body: string; bullets: string[] } | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      if (current) sections.push(current);
      current = { title: trimmed.replace(/\*\*/g, ""), body: "", bullets: [] };
    } else if ((trimmed.startsWith("- ") || trimmed.startsWith("• ")) && current) {
      current.bullets.push(trimmed.replace(/^[-•]\s*/, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1"));
    } else if (trimmed && current) {
      current.body += (current.body ? " " : "") + trimmed.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
    }
  }
  if (current) sections.push(current);
  const map: Record<string, string> = {
    "Sirket Profili": "Şirket Profili",
    "Finansal Durum": "Finansal Durum",
    "Piyasa Konumu": "Piyasa Konumu",
    "Dikkat Noktalari": "Dikkat Noktaları",
  };
  return sections.map(s => ({ ...s, title: map[s.title] || s.title }));
}

export default function HissePage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: tickerParam } = use(params);
  const ticker = tickerParam.toUpperCase();
  const [analiz, setAnaliz] = useState("");
  const [analizTarih, setAnalizTarih] = useState<Date | null>(null);
  const [veri, setVeri] = useState<HisseVeri | null>(null);
  const [loading, setLoading] = useState(false);
  const [grafik, setGrafik] = useState<{ tarih: string; fiyat: number }[]>([]);
  const [grafikRange, setGrafikRange] = useState("1d");
  const [getiriler, setGetiriler] = useState<Record<string, string | null>>({});
  const [izlemede, setIzlemede] = useState(false);
  const [portfoy, setPortfoy] = useState<{ticker: string, adet: number, maliyet: number}[]>([]);
  const [fundamentals, setFundamentals] = useState<{pe: string, pb: string} | null>(null);
  const [riskVeri, setRiskVeri] = useState<{ skor: number; seviyeTR: string } | null>(null);

  useEffect(() => {
    document.title = `${ticker} Analizi | ParaKonusur — BIST Yapay Zeka`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) { metaDesc = document.createElement('meta'); metaDesc.setAttribute('name', 'description'); document.head.appendChild(metaDesc); }
    metaDesc.setAttribute('content', `${ticker} hissesi için yapay zeka destekli teknik analiz, fiyat grafiği ve risk skoru. Borsa İstanbul (BIST) yatırımcıları için ParaKonusur.`);
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) { ogTitle = document.createElement('meta'); ogTitle.setAttribute('property', 'og:title'); document.head.appendChild(ogTitle); }
    ogTitle.setAttribute('content', `${ticker} Analizi | ParaKonusur`);
    return () => { document.title = 'ParaKonusur — BIST Yapay Zekâ Analiz Platformu'; };
  }, [ticker]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase.from("watchlist").select("ticker").eq("user_id", session.user.id).eq("ticker", ticker).maybeSingle();
      if (data) setIzlemede(true);
    });
  }, [ticker]);

  async function toggleIzleme() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      if (izlemede) {
        const { error } = await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("ticker", ticker);
        if (!error) setIzlemede(false);
      } else {
        const { error } = await supabase.from("watchlist").insert({ user_id: session.user.id, ticker });
        if (!error) setIzlemede(true);
      }
    } catch (err) {
      console.error("Izleme guncelleme hatasi:", err);
    }
  }
  const fetchGrafik = useCallback((range: string) => {
    fetch(`/api/grafik?ticker=${ticker}.IS&range=${range}`).then(r => r.json()).then(d => { if (d.points) setGrafik(d.points); });
  }, [ticker]);

  const fetchGetiriler = useCallback(() => {
    fetch(`/api/getiri?ticker=${ticker}`)
      .then(r => r.json())
      .then(d => setGetiriler({ "1wk": d["1wk"], "1mo": d["1mo"], "3mo": d["3mo"], "1y": d["1y"] }))
      .catch(() => setGetiriler({}));
  }, [ticker]);

  const fetchVeri = useCallback(async () => {
    const res = await fetch("/api/analiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, veriOnly: true }),
    });
    const data = await res.json();
    if (data.veri) setVeri(data.veri);
  }, [ticker]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchVeri();
      fetchGrafik("1d");
    });
    // Supabase'den analiz yükle
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase.from("analizler").select("analiz,created_at").eq("user_id", session.user.id).eq("ticker", ticker).maybeSingle();
      if (data?.analiz) {
        setAnaliz(data.analiz);
        if (data.created_at) setAnalizTarih(new Date(data.created_at));
      }
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase.from("portfoy").select("ticker,adet,maliyet").eq("user_id", session.user.id);
      if (data) setPortfoy(data);
    });
    const interval = setInterval(fetchVeri, 15000);
    return () => clearInterval(interval);
  }, [fetchGrafik, fetchVeri, ticker]);

  useEffect(() => {
    fetchGetiriler();
    fetch(`/api/risk?ticker=${ticker}`)
      .then(r => r.json())
      .then(d => {
        if (d.skor !== undefined) setRiskVeri({ skor: Math.round(d.skor), seviyeTR: d.seviyeTR || "" });
        if (d.bilesenler) {
          const pe = d.bilesenler.find((f: {ad: string}) => f.ad === "F/K Orani");
          const pb = d.bilesenler.find((f: {ad: string}) => f.ad === "PD/DD Orani");
          setFundamentals({
            pe: pe ? pe.deger : "—",
            pb: pb ? pb.deger : "—",
          });
        }
      })
      .catch(() => {});
  }, [fetchGetiriler, ticker]);

  async function handleAnaliz() {
    const cacheKey = LS.analiz(ticker);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { analiz: cachedAnaliz, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 2 * 60 * 60 * 1000) {
        setAnaliz(cachedAnaliz);
        setAnalizTarih(new Date(timestamp));
        return;
      }
    }
    setLoading(true);
    setAnaliz("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAnaliz("Analiz oluşturmak için giriş yapmanız gerekir.");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/analiz", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ticker }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAnaliz(data.error || "Analiz alınamadı.");
      setLoading(false);
      return;
    }
    setAnaliz(data.analiz);
    if (data.veri) setVeri(data.veri);
    const now = Date.now();
    setAnalizTarih(new Date(now));
    localStorage.setItem(LS.analiz(ticker), JSON.stringify({ analiz: data.analiz, veri: data.veri, timestamp: now }));
    const entry = { ticker, time: new Date().toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) };
    const stored = localStorage.getItem(LS.RECENT);
    const recent = stored ? JSON.parse(stored) : [];
    const updated = [entry, ...recent.filter((r: { ticker: string }) => r.ticker !== ticker)].slice(0, 5);
    localStorage.setItem(LS.RECENT, JSON.stringify(updated));
    // Supabase'e kaydet
    if (session && data.analiz) {
      await supabase.from("analizler").upsert({ user_id: session.user.id, ticker, analiz: data.analiz }, { onConflict: "user_id,ticker" });
    }
    setLoading(false);
  }



  const sections = analiz ? renderMarkdown(analiz) : [];

  const gunlukDegisim = veri ? (veri.degisimYuzde ?? ((veri.fiyat - (veri.oncekiKapanis || veri.gunlukDusuk)) / (veri.oncekiKapanis || veri.gunlukDusuk) * 100)) : 0;
  const fiyatYukselis = gunlukDegisim >= 0;
  const grafikDegisim = (() => {
    if (grafikRange === "1d") return Number.isFinite(gunlukDegisim) ? gunlukDegisim : null;
    const apiGetiri = getiriler[grafikRange];
    if (Object.prototype.hasOwnProperty.call(getiriler, grafikRange) && apiGetiri === null) return null;
    const parsed = apiGetiri !== null && apiGetiri !== undefined ? Number(apiGetiri) : NaN;
    if (Number.isFinite(parsed)) return parsed;
    if (grafik.length < 2) return null;
    const ilk = grafik[0].fiyat;
    const son = grafik[grafik.length - 1].fiyat;
    return ilk ? ((son - ilk) / ilk) * 100 : null;
  })();
  const kartlar = veri ? [
    { label: "52 Hafta En Yüksek", value: formatCurrency(veri.yillikYuksek) },
    { label: "52 Hafta En Düşük", value: formatCurrency(veri.yillikDusuk) },
    { label: "Günlük Hacim", value: formatQuantity(veri.hacim, "adet") },
    { label: "İşlem Hacmi", value: formatCurrency(veri.hacim * veri.fiyat, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) },
    { label: "F/K Oranı", value: fundamentals?.pe ?? "—" },
    { label: "PD/DD Oranı", value: fundamentals?.pb ?? "—" },
  ] : [];

  return (
    <AppShell>
    <div className="min-h-screen" style={{ background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)" }}>


      <style>{`
        .hisse-main { padding: 34px 24px 42px; }
        .hisse-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 22px; margin-bottom: 18px; border: 1px solid rgba(59,130,246,0.14); border-radius: 14px; padding: 18px 20px; background: linear-gradient(135deg, rgba(15,23,42,0.72), rgba(11,18,32,0.96)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.035); position: relative; overflow: hidden; }
          .hisse-title-row { display: flex; align-items: center; gap: 12px; min-height: 42px; }
          .hisse-title-block { min-width: 0; }
          .hisse-ticker-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
          .hisse-company-name { max-width: min(520px, 70vw); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .hisse-price-line { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
          .hisse-price-box { display: inline-flex; align-items: baseline; gap: 9px; }
          .hisse-subline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
          .hisse-delay-pill { display: inline-flex; align-items: center; font-size: 10px; font-weight: 650; color: #F97316; background: rgba(249,115,22,0.07); border: 1px solid rgba(249,115,22,0.16); border-radius: 999px; padding: 2px 7px; white-space: nowrap; }
          .hisse-kartlar { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; margin-bottom: 26px; }
          .hisse-metric-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(59,130,246,0.1); border-radius: 10px; padding: 12px 14px; min-height: 68px; min-width: 0; overflow: hidden; }
          .hisse-metric-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .hisse-metric-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; }
          .hisse-analiz-btn { height: 42px; padding: 0 18px; background: linear-gradient(135deg, #1D4ED8, #3B82F6); color: #F8FAFC; border: 1px solid rgba(147,197,253,0.22); border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; margin-top: 2px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 12px 28px rgba(37,99,235,0.20); transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease; }
          .hisse-analiz-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.06); box-shadow: 0 16px 34px rgba(37,99,235,0.26); }
          .hisse-analiz-btn:disabled { opacity: 0.6; cursor: not-allowed; }
          .hisse-analiz-btn-short { display: none; }
          .hisse-analysis-note { font-size: 12px; color: #334155; margin: 0; }
          .hisse-range-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
          .hisse-range-btns { display: flex; gap: 4px; padding: 3px; border: 1px solid rgba(148,163,184,0.10); border-radius: 8px; background: rgba(255,255,255,0.035); }
          .hisse-chart-shell { background: rgba(255,255,255,0.02); border: 1px solid rgba(59,130,246,0.1); border-radius: 12px; padding: 18px 10px 10px 0; }
          .hisse-analiz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 640px) {
            .hisse-main { padding: 14px 12px !important; }
            .hisse-header { flex-direction: column; gap: 12px; padding: 14px !important; }
            .hisse-header-right { position: fixed; left: 12px; bottom: calc(78px + env(safe-area-inset-bottom)); z-index: 70; width: auto; display: flex; flex-direction: row !important; align-items: center; justify-content: flex-start; margin-top: 0 !important; }
            .hisse-header-right .hisse-analysis-note { display: none !important; }
            .hisse-kartlar { grid-template-columns: 1fr 1fr; gap: 6px; }
            .hisse-analiz-grid { grid-template-columns: 1fr !important; }
            .hisse-title-row { align-items: flex-start !important; }
            .hisse-company-name { max-width: 210px; }
            .hisse-ticker { font-size: 22px !important; }
            .hisse-fiyat { font-size: 17px !important; }
            .hisse-analiz-btn { margin-top: 0; height: 40px; font-size: 12px; padding: 0 13px; border-radius: 999px; box-shadow: 0 10px 28px rgba(37,99,235,0.38), 0 0 0 1px rgba(147,197,253,0.20); }
            .hisse-analiz-btn-full { display: none; }
            .hisse-analiz-btn-short { display: inline; }
            .hisse-metric-card { padding: 11px 12px; min-height: 74px; }
            .hisse-metric-label { font-size: 10px !important; line-height: 1.25; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
            .hisse-metric-value { font-size: clamp(12px, 3.4vw, 15px) !important; }
            .hisse-range-row { flex-direction: column; align-items: flex-start; gap: 8px; }
            .hisse-range-btns button { font-size: 10px !important; padding: 2px 6px !important; }
          }
      `}</style>
      <main className="hisse-main" style={{ maxWidth: 940, margin: "0 auto" }}>
        <div className="hisse-header">
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
          <div>
            <p style={{ fontSize: 11, color: "#3B82F6", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>BIST · Hisse Analizi</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={toggleIzleme} aria-label={izlemede ? `${ticker} izleme listesinden çıkar` : `${ticker} izleme listesine ekle`} style={{ width: 32, height: 32, borderRadius: 9, color: izlemede ? "#F97316" : "#475569", background: izlemede ? "rgba(249,115,22,0.10)" : "rgba(255,255,255,0.035)", border: `1px solid ${izlemede ? "rgba(249,115,22,0.28)" : "rgba(148,163,184,0.10)"}`, cursor: "pointer", padding: 0, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
                <Star size={18} fill={izlemede ? "currentColor" : "none"} />
              </button>
              <div className="hisse-title-row">
                <StockLogo ticker={ticker} domain={veri?.domain} size={40} radius={10} />
                <div className="hisse-title-block">
                  <div className="hisse-ticker-row">
                    <h1 className="hisse-ticker" style={{ fontSize: 30, fontWeight: 500, color: "#F8FAFC", letterSpacing: "-0.5px", margin: 0, lineHeight: 1.05 }}>{ticker}</h1>
                    {veri && <span className="hisse-delay-pill">15 dk gecikmeli</span>}
                  </div>
                  {veri?.sirketAdi && <p className="hisse-company-name" style={{ fontSize: 15, color: "#94A3B8", fontWeight: 400, marginTop: 5, marginBottom: 0, lineHeight: 1.1 }}>{veri.sirketAdi}</p>}
                </div>
              </div>
            </div>
            {veri && (
              <div className="hisse-price-line">
                <div className="hisse-price-box">
                  <span className="hisse-fiyat" style={{ fontSize: 30, fontWeight: 760, color: "#F8FAFC", letterSpacing: "-0.6px", lineHeight: 1 }} suppressHydrationWarning>
                    {formatCurrency(veri.fiyat)}
                  </span>
                  {veri.oncekiKapanis && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: fiyatYukselis ? "#10B981" : "#EF4444", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span>{fiyatYukselis ? "▲" : "▼"}</span>
                      <span suppressHydrationWarning>{formatPercent(veri.degisimYuzde ?? ((veri.fiyat - veri.oncekiKapanis) / veri.oncekiKapanis * 100), { symbolPosition: "prefix", signDisplay: "never" })}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
            {veri && (
              <div className="hisse-subline">
                <span style={{ fontSize: 11, color: "#475569" }}>{`Günlük: ${formatCurrency(veri.gunlukDusuk)} – ${formatCurrency(veri.gunlukYuksek)}`}</span>
              </div>
            )}
            <style>{`.g-tooltip-wrap:hover .g-tooltip { opacity: 1 !important; }`}</style>
          </div>
          <div className="hisse-header-right" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginTop: 8 }}>
          <button
            onClick={handleAnaliz}
            disabled={loading}
            className="hisse-analiz-btn"
            style={{ opacity: loading ? 0.6 : 1 }}
	          >
	            <Sparkles size={15} />
	            <span className="hisse-analiz-btn-full">{loading ? "Analiz ediliyor..." : "Yapay Zeka ile Analiz Et"}</span>
	            <span className="hisse-analiz-btn-short">{loading ? "Analiz..." : "AI Analiz"}</span>
	          </button>
	          {analiz && <p className="hisse-analysis-note">Analiz yaptıktan 2 saat sonra yenilenebilir.</p>}
	          {analiz && <p className="hisse-analysis-note" style={{ marginTop: 4, lineHeight: 1.6, textAlign: "right", maxWidth: 280 }}>Bu analiz teknik göstergeler, fiyat ve hacim verilerini kapsar. Temel analiz, bilanço ve KAP haberleri dahil değildir. Yatırım tavsiyesi değildir.</p>}
          </div>

        </div>

        {!veri && (
          <div className="hisse-kartlar">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="hisse-metric-card" style={{ height: 52 }}>
                <div style={{ width: 80, height: 10, borderRadius: 4, background: "linear-gradient(90deg,#0F1C2E 25%,#162436 50%,#0F1C2E 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", marginBottom: 8 }} />
                <div style={{ width: 60, height: 14, borderRadius: 4, background: "linear-gradient(90deg,#0F1C2E 25%,#162436 50%,#0F1C2E 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
              </div>
            ))}
            <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
          </div>
        )}
        {veri && (
          <div className="hisse-kartlar">
            {kartlar.map((k) => (
              <div key={k.label} className="hisse-metric-card">
                <div className="hisse-metric-label" style={{ fontSize: 12, color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 7 }}>{k.label}</div>
                <div className="hisse-metric-value" style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.2px" }}>{k.value}</div>
              </div>
            ))}
          </div>
        )}

        {grafik.length > 0 && (
          <HisseGrafik
            grafik={grafik}
            grafikRange={grafikRange}
            grafikDegisim={grafikDegisim}
            gunlukDusuk={veri?.gunlukDusuk}
            gunlukYuksek={veri?.gunlukYuksek}
            oncekiKapanis={veri?.oncekiKapanis}
            sonFiyat={veri?.fiyat}
            setGrafikRange={setGrafikRange}
            fetchGrafik={fetchGrafik}
          />
        )}
        {sections.length > 0 && (() => {
          const riskColor = riskVeri
            ? riskVeri.skor < 35
              ? { color: "#10B981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.22)" }
              : riskVeri.skor < 65
              ? { color: "#F59E0B", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.22)" }
              : { color: "#EF4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.22)" }
            : null;
          return (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, marginTop: 4 }}>
                <h2 style={{ fontSize: 12, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>AI Analiz</h2>
                {analizTarih && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#93C5FD", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "3px 9px" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#3B82F6", flexShrink: 0 }} />
                    <span style={{ color: "#94A3B8", fontWeight: 600, letterSpacing: "0.02em" }}>Son analiz</span>
                    <span style={{ width: 1, height: 10, background: "rgba(59,130,246,0.25)", flexShrink: 0 }} />
                    <span style={{ color: "#CBD5E1" }}>
                      {analizTarih.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}
                      {analizTarih.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                )}
              </div>
              {riskColor && riskVeri && (
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", border: `1px solid ${riskColor.border}`, borderRadius: 12, background: riskColor.bg, marginBottom: 14 }}>
                  <style>{`@keyframes risk-draw-${riskVeri.skor} { from { stroke-dashoffset: 138.2; } to { stroke-dashoffset: ${(138.2 - (riskVeri.skor / 100) * 138.2).toFixed(1)}; } }`}</style>
                  <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                    <svg viewBox="0 0 52 52" width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="26" cy="26" r="22" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
                      <circle cx="26" cy="26" r="22" fill="none" stroke={riskColor.color} strokeWidth="2.5" strokeLinecap="round"
                        strokeDasharray="138.2"
                        style={{ strokeDashoffset: 138.2 - (riskVeri.skor / 100) * 138.2, animation: `risk-draw-${riskVeri.skor} 1.1s ease-out forwards`, filter: `drop-shadow(0 0 4px ${riskColor.color}66)` }} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: riskColor.color, lineHeight: 1 }}>{riskVeri.skor}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3 }}>Risk Skoru</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: riskColor.color }}>{riskVeri.seviyeTR}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>100 üzerinden · düşük = daha az riskli</div>
                  </div>
                  <Activity size={20} color={riskColor.color} style={{ opacity: 0.4, flexShrink: 0 }} />
                </div>
              )}
              <div className="hisse-analiz-grid">
                {sections.map((s, i) => {
                  const isDikkat = s.title.includes("Dikkat");
                  const isFinansal = s.title.includes("Finansal");
                  const isPiyasa = s.title.includes("Piyasa");
                  const color = isDikkat ? "#F87171" : isFinansal ? "#34D399" : isPiyasa ? "#A78BFA" : "#60A5FA";
                  const bg = isDikkat ? "rgba(239,68,68,0.04)" : isFinansal ? "rgba(16,185,129,0.04)" : isPiyasa ? "rgba(139,92,246,0.04)" : "rgba(59,130,246,0.04)";
                  const border = isDikkat ? "rgba(239,68,68,0.16)" : isFinansal ? "rgba(16,185,129,0.16)" : isPiyasa ? "rgba(139,92,246,0.16)" : "rgba(59,130,246,0.16)";
                  const headerBorder = isDikkat ? "rgba(239,68,68,0.08)" : isFinansal ? "rgba(16,185,129,0.08)" : isPiyasa ? "rgba(139,92,246,0.08)" : "rgba(59,130,246,0.08)";
                  const IconComp = isDikkat ? AlertTriangle : isFinansal ? TrendingUp : isPiyasa ? Target : Building2;
                  return (
                    <div key={i} style={{ border: `1px solid ${border}`, borderRadius: 12, background: bg, display: "flex", flexDirection: "column" }}>
                      <div style={{ padding: "11px 15px", borderBottom: `1px solid ${headerBorder}`, display: "flex", alignItems: "center", gap: 8, borderRadius: "10px 10px 0 0" }}>
                        <IconComp size={13} color={color} />
                        <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.01em" }}>{s.title}</span>
                      </div>
                      <div style={{ padding: "13px 15px", flex: 1 }}>
                        {s.body && <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.75, margin: 0, marginBottom: s.bullets.length > 0 ? 10 : 0 }}>{s.body}</p>}
                        {s.bullets.length > 0 && (
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                            {s.bullets.map((b, bi) => (
                              <li key={bi} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: "#94A3B8", lineHeight: 1.65 }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 7 }} />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, padding: "11px 15px", border: "1px solid rgba(59,130,246,0.06)", borderRadius: 8 }}>
                <p style={{ fontSize: 11, color: "#1E293B", lineHeight: 1.6, margin: 0 }}>
                  Bu içerik yalnızca teknik veri analizi amacıyla sunulmakta olup SPK mevzuatı kapsamında yatırım tavsiyesi niteliği taşımamaktadır. Yatırım kararlarınız için lisanslı aracı kurumlardan destek alınız.
                </p>
              </div>
            </>
          );
        })()}
      </main>
    </div>
      <HisseChatbot ticker={ticker} veri={veri} analiz={analiz} portfoy={portfoy} />
    </AppShell>
  );
}
