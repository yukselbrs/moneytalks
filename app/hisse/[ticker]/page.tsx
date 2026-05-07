"use client";

import { useState, use, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import { supabase } from "@/components/lib/supabase";
import StockLogo from "@/components/StockLogo";
import { Sparkles, Star, Building2, TrendingUp, Target, AlertTriangle, Activity } from "lucide-react";

const HisseGrafik = dynamic(() => import("@/components/HisseGrafik"), {
  ssr: false,
  loading: () => <div style={{ height: 310, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12, marginBottom: 24 }} />,
});

const HisseChatbot = dynamic(() => import("@/components/HisseChatbot"), { ssr: false });

interface HisseVeri {
  fiyat: number;
  oncekiKapanis: number;
  degisim: number | null;
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
  const [veri, setVeri] = useState<HisseVeri | null>(null);
  const [loading, setLoading] = useState(false);
  const [grafik, setGrafik] = useState<{ tarih: string; fiyat: number }[]>([]);
  const [grafikRange, setGrafikRange] = useState("1d");
  const [getiriler, setGetiriler] = useState<Record<string, string | null>>({});
  const [izlemede, setIzlemede] = useState(false);
  const [portfoy, setPortfoy] = useState<{ticker: string, adet: number, alis_fiyati: number}[]>([]);
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
    fetchVeri();
    fetchGrafik("1d");
    // Supabase'den analiz yükle
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase.from("analizler").select("analiz").eq("user_id", session.user.id).eq("ticker", ticker).maybeSingle();
      if (data?.analiz) {
        setAnaliz(data.analiz);
      }
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase.from("portfoy").select("ticker,adet,alis_fiyati").eq("user_id", session.user.id);
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
    const cacheKey = `pk_analiz_${ticker}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { analiz: cachedAnaliz, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 2 * 60 * 60 * 1000) {
        setAnaliz(cachedAnaliz);
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
    localStorage.setItem(`pk_analiz_${ticker}`, JSON.stringify({ analiz: data.analiz, veri: data.veri, timestamp: Date.now() }));
    const entry = { ticker, time: new Date().toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) };
    const stored = localStorage.getItem("pk_recent");
    const recent = stored ? JSON.parse(stored) : [];
    const updated = [entry, ...recent.filter((r: { ticker: string }) => r.ticker !== ticker)].slice(0, 5);
    localStorage.setItem("pk_recent", JSON.stringify(updated));
    // Supabase'e kaydet
    if (session && data.analiz) {
      await supabase.from("analizler").upsert({ user_id: session.user.id, ticker, analiz: data.analiz }, { onConflict: "user_id,ticker" });
    }
    setLoading(false);
  }



  const sections = analiz ? renderMarkdown(analiz) : [];

  const gunlukDegisim = veri ? ((veri.fiyat - (veri.oncekiKapanis || veri.gunlukDusuk)) / (veri.oncekiKapanis || veri.gunlukDusuk) * 100) : 0;
  const fiyatYukselis = veri ? veri.fiyat >= veri.oncekiKapanis : true;
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
    { label: "52 Hafta En Yüksek", value: `${veri.yillikYuksek} ₺` },
    { label: "52 Hafta En Düşük", value: `${veri.yillikDusuk} ₺` },
    { label: "Günlük Hacim", value: typeof window !== "undefined" ? veri.hacim.toLocaleString("tr-TR", { useGrouping: true }) + " adet" : veri.hacim + " adet" },
    { label: "İşlem Hacmi", value: typeof window !== "undefined" ? (veri.hacim * veri.fiyat).toLocaleString("tr-TR", { maximumFractionDigits: 0, useGrouping: true }) + " ₺" : (veri.hacim * veri.fiyat).toFixed(0) + " ₺" },
    { label: "F/K Oranı", value: fundamentals?.pe ?? "—" },
    { label: "PD/DD Oranı", value: fundamentals?.pb ?? "—" },
  ] : [];

  return (
    <AppShell>
    <div className="min-h-screen" style={{ background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)" }}>


      <style>{`
        .hisse-main { padding: 34px 24px 42px; }
        .hisse-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 22px; margin-bottom: 18px; border: 1px solid rgba(59,130,246,0.14); border-radius: 14px; padding: 18px 20px; background: linear-gradient(135deg, rgba(15,23,42,0.72), rgba(11,18,32,0.96)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.035); }
        .hisse-title-row { display: flex; align-items: center; gap: 12px; min-height: 42px; }
        .hisse-title-block { min-width: 0; }
        .hisse-ticker-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .hisse-price-line { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
        .hisse-price-box { display: inline-flex; align-items: baseline; gap: 9px; }
        .hisse-subline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
        .hisse-delay-pill { display: inline-flex; align-items: center; font-size: 10px; font-weight: 650; color: #F97316; background: rgba(249,115,22,0.07); border: 1px solid rgba(249,115,22,0.16); border-radius: 999px; padding: 2px 7px; white-space: nowrap; }
        .hisse-kartlar { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; margin-bottom: 26px; }
        .hisse-metric-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(59,130,246,0.1); border-radius: 10px; padding: 12px 14px; min-height: 68px; }
        .hisse-analiz-btn { height: 42px; padding: 0 18px; background: linear-gradient(135deg, #1D4ED8, #3B82F6); color: #F8FAFC; border: 1px solid rgba(147,197,253,0.22); border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; margin-top: 2px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 12px 28px rgba(37,99,235,0.20); transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease; }
        .hisse-analiz-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.06); box-shadow: 0 16px 34px rgba(37,99,235,0.26); }
        .hisse-analiz-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .hisse-range-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .hisse-range-btns { display: flex; gap: 4px; padding: 3px; border: 1px solid rgba(148,163,184,0.10); border-radius: 8px; background: rgba(255,255,255,0.035); }
        .hisse-chart-shell { background: rgba(255,255,255,0.02); border: 1px solid rgba(59,130,246,0.1); border-radius: 12px; padding: 18px 10px 10px 0; }
        .hisse-analiz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 640px) {
          .hisse-main { padding: 14px 12px !important; }
          .hisse-header { flex-direction: column; gap: 12px; padding: 14px !important; }
          .hisse-header-right { width: 100%; display: flex; flex-direction: row !important; align-items: center; justify-content: space-between; }
          .hisse-kartlar { grid-template-columns: 1fr 1fr; gap: 6px; }
          .hisse-analiz-grid { grid-template-columns: 1fr !important; }
          .hisse-title-row { align-items: flex-start !important; }
          .hisse-ticker { font-size: 22px !important; }
          .hisse-fiyat { font-size: 17px !important; }
          .hisse-analiz-btn { margin-top: 0; height: 36px; font-size: 12px; padding: 0 14px; }
          .hisse-range-row { flex-direction: column; align-items: flex-start; gap: 8px; }
          .hisse-range-btns button { font-size: 10px !important; padding: 2px 6px !important; }
        }
      `}</style>
      <main className="hisse-main" style={{ maxWidth: 940, margin: "0 auto" }}>
        <div className="hisse-header">
          <div>
            <p style={{ fontSize: 11, color: "#3B82F6", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>BIST · Hisse Analizi</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={toggleIzleme} aria-label={izlemede ? "İzleme listesinden çıkar" : "İzleme listesine ekle"} style={{ width: 32, height: 32, borderRadius: 9, color: izlemede ? "#F97316" : "#475569", background: izlemede ? "rgba(249,115,22,0.10)" : "rgba(255,255,255,0.035)", border: `1px solid ${izlemede ? "rgba(249,115,22,0.28)" : "rgba(148,163,184,0.10)"}`, cursor: "pointer", padding: 0, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
                <Star size={18} fill={izlemede ? "currentColor" : "none"} />
              </button>
              <div className="hisse-title-row">
                <StockLogo ticker={ticker} domain={veri?.domain} size={40} radius={10} />
                <div className="hisse-title-block">
                  <div className="hisse-ticker-row">
                    <h1 className="hisse-ticker" style={{ fontSize: 30, fontWeight: 500, color: "#F8FAFC", letterSpacing: "-0.5px", margin: 0, lineHeight: 1.05 }}>{ticker}</h1>
                    {veri && <span className="hisse-delay-pill">15 dk gecikmeli</span>}
                  </div>
                  {veri?.sirketAdi && <p style={{ fontSize: 15, color: "#94A3B8", fontWeight: 400, marginTop: 5, marginBottom: 0, lineHeight: 1.1 }}>{veri.sirketAdi}</p>}
                </div>
              </div>
            </div>
            {veri && (
              <div className="hisse-price-line">
                <div className="hisse-price-box">
                  <span className="hisse-fiyat" style={{ fontSize: 30, fontWeight: 760, color: "#F8FAFC", letterSpacing: "-0.6px", lineHeight: 1 }} suppressHydrationWarning>
                    {veri.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                  </span>
                  {veri.oncekiKapanis && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: fiyatYukselis ? "#10B981" : "#EF4444", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span>{fiyatYukselis ? "▲" : "▼"}</span>
                      <span suppressHydrationWarning>%{Math.abs(((veri.fiyat - veri.oncekiKapanis) / veri.oncekiKapanis * 100)).toFixed(2).replace(".", ",")}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
            {veri && (
              <div className="hisse-subline">
                <span style={{ fontSize: 11, color: "#475569" }}>{`Günlük: ${veri.gunlukDusuk} – ${veri.gunlukYuksek} ₺`}</span>
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
            {loading ? "Analiz ediliyor..." : "Yapay Zeka ile Analiz Et"}
          </button>
          {analiz && <p style={{ fontSize: 12, color: "#334155" }}>Analiz yaptıktan 2 saat sonra yenilenebilir.</p>}
          {analiz && <p style={{ fontSize: 12, color: "#334155", marginTop: 4, lineHeight: 1.6, textAlign: "right", maxWidth: 280 }}>Bu analiz teknik göstergeler, fiyat ve hacim verilerini kapsar. Temel analiz, bilanço ve KAP haberleri dahil değildir. Yatırım tavsiyesi değildir.</p>}
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
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 7 }}>{k.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.2px" }}>{k.value}</div>
              </div>
            ))}
          </div>
        )}

        {grafik.length > 0 && (
          <HisseGrafik
            grafik={grafik}
            grafikRange={grafikRange}
            grafikDegisim={grafikDegisim}
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
              </div>
              {riskColor && riskVeri && (
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", border: `1px solid ${riskColor.border}`, borderRadius: 12, background: riskColor.bg, marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", border: `2.5px solid ${riskColor.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "rgba(0,0,0,0.18)" }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: riskColor.color, lineHeight: 1 }}>{riskVeri.skor}</span>
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
