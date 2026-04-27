"use client";

import { useState, use, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import HisseChatbot from "@/components/HisseChatbot";

interface HisseVeri {
  fiyat: number;
  oncekiKapanis: number;
  degisim: number | null;
  hacim: number;
  yillikYuksek: number;
  yillikDusuk: number;
  gunlukYuksek: number;
  gunlukDusuk: number;
}

function renderMarkdown(text: string) {
  const sections: { title: string; body: string }[] = [];
  const lines = text.split("\n");
  let current: { title: string; body: string } | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      if (current) sections.push(current);
      current = { title: trimmed.replace(/\*\*/g, ""), body: "" };
    } else if (trimmed && current) {
      current.body += (current.body ? " " : "") + trimmed;
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
  const [izlemede, setIzlemede] = useState(false);
  const [portfoy, setPortfoy] = useState<{ticker: string, adet: number, alis_fiyati: number}[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase.from("watchlist").select("ticker").eq("user_id", session.user.id).eq("ticker", ticker).single();
      if (data) setIzlemede(true);
    });
  }, [ticker]);

  async function toggleIzleme() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (izlemede) {
      await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("ticker", ticker);
      setIzlemede(false);
    } else {
      await supabase.from("watchlist").insert({ user_id: session.user.id, ticker });
      setIzlemede(true);
    }
  }
  const router = useRouter();

  useEffect(() => {
    fetchVeri();
    fetch(`/api/grafik?ticker=${ticker}`).then(r => r.json()).then(d => { if (d.points) setGrafik(d.points); });
    // Supabase'den analiz yükle
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase.from("analizler").select("analiz").eq("user_id", session.user.id).eq("ticker", ticker).single();
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
  }, [ticker]);

  async function fetchVeri() {
    const res = await fetch("/api/analiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, veriOnly: true }),
    });
    const data = await res.json();
    if (data.veri) setVeri(data.veri);
  }

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
    const res = await fetch("/api/analiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    const data = await res.json();
    setAnaliz(data.analiz);
    if (data.veri) setVeri(data.veri);
    localStorage.setItem(`pk_analiz_${ticker}`, JSON.stringify({ analiz: data.analiz, veri: data.veri, timestamp: Date.now() }));
    const entry = { ticker, time: new Date().toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) };
    const stored = localStorage.getItem("pk_recent");
    const recent = stored ? JSON.parse(stored) : [];
    const updated = [entry, ...recent.filter((r: { ticker: string }) => r.ticker !== ticker)].slice(0, 5);
    localStorage.setItem("pk_recent", JSON.stringify(updated));
    // Supabase'e kaydet
    const { data: { session } } = await supabase.auth.getSession();
    if (session && data.analiz) {
      await supabase.from("analizler").upsert({ user_id: session.user.id, ticker, analiz: data.analiz }, { onConflict: "user_id,ticker" });
    }
    setLoading(false);
  }



  const sections = analiz ? renderMarkdown(analiz) : [];

  const gunlukDegisim = veri ? ((veri.fiyat - (veri.oncekiKapanis || veri.gunlukDusuk)) / (veri.oncekiKapanis || veri.gunlukDusuk) * 100) : 0;
  const kartlar = veri ? [
    { label: "52 Hafta En Yüksek", value: `${veri.yillikYuksek} ₺` },
    { label: "52 Hafta En Düşük", value: `${veri.yillikDusuk} ₺` },
    { label: "Günlük Hacim", value: typeof window !== "undefined" ? veri.hacim.toLocaleString("tr-TR", { useGrouping: true }) + " adet" : veri.hacim + " adet" },
    { label: "İşlem Hacmi", value: typeof window !== "undefined" ? (veri.hacim * veri.fiyat).toLocaleString("tr-TR", { maximumFractionDigits: 0, useGrouping: true }) + " ₺" : (veri.hacim * veri.fiyat).toFixed(0) + " ₺" },
  ] : [];

  return (
    <AppShell>
    <div className="min-h-screen" style={{ background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)" }}>


      <style>{`
        .hisse-main { padding: 36px 24px; }
        .hisse-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
        .hisse-kartlar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px; }
        .hisse-analiz-btn { height: 38px; padding: 0 20px; background: linear-gradient(135deg, #1E40AF, #3B82F6); color: #F8FAFC; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; margin-top: 8px; }
        .hisse-analiz-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 640px) {
          .hisse-main { padding: 16px 14px !important; }
          .hisse-header { flex-direction: column; gap: 12px; }
          .hisse-header-right { width: 100%; display: flex; flex-direction: row !important; align-items: center; justify-content: space-between; }
          .hisse-kartlar { grid-template-columns: 1fr 1fr; }
          .hisse-ticker { font-size: 24px !important; }
          .hisse-fiyat { font-size: 18px !important; }
          .hisse-analiz-btn { margin-top: 0; }
        }
      `}</style>
      <main className="hisse-main" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="hisse-header">
          <div>
            <p style={{ fontSize: 11, color: "#3B82F6", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>BIST · Hisse Analizi</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={toggleIzleme} style={{ fontSize: 22, color: izlemede ? "#F97316" : "#334155", background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}>
                {izlemede ? "★" : "☆"}
              </button>
              <h1 className="hisse-ticker" style={{ fontSize: 32, fontWeight: 500, color: "#F8FAFC", letterSpacing: "-0.5px" }}>{ticker}</h1>
              {veri && (
                <span className="hisse-fiyat" style={{ fontSize: 24, fontWeight: 500, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ position: "relative", display: "inline-flex" }} className="g-tooltip-wrap">
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#F97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 3, padding: "1px 4px", lineHeight: 1.4, cursor: "default" }}>G</span>
                    <span style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1E293B", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap", padding: "4px 8px", borderRadius: 5, pointerEvents: "none", opacity: 0, transition: "opacity 0.15s" }} className="g-tooltip">15 dk gecikmeli</span>
                  </span>
                  <span suppressHydrationWarning>{veri.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
                  {veri.oncekiKapanis && (
                    <span style={{ fontSize: 14, fontWeight: 500, color: veri.fiyat >= veri.oncekiKapanis ? "#1D9E75" : "#E24B4A", display: "flex", alignItems: "center", gap: 3 }}>
                      <span>{veri.fiyat >= veri.oncekiKapanis ? "▲" : "▼"}</span>
                      <span suppressHydrationWarning>%{Math.abs(((veri.fiyat - veri.oncekiKapanis) / veri.oncekiKapanis * 100)).toFixed(2).replace(".", ",")}</span>
                    </span>
                  )}
                </span>
              )}
            </div>
            {veri && (
              <p style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                {`Günlük: ${veri.gunlukDusuk} – ${veri.gunlukYuksek} ₺`}
              </p>
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
            {loading ? "Analiz ediliyor..." : "Yapay Zeka ile Analiz Et"}
          </button>
          <p style={{ fontSize: 10, color: "#334155" }}>Analiz yaptıktan 2 saat sonra yenilenebilir.</p>
          </div>

        </div>

        {veri && (
          <div className="hisse-kartlar">
            {kartlar.map((k) => (
              <div key={k.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#475569", fontWeight: 500, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#E2E8F0" }}>{k.value}</div>
              </div>
            ))}
          </div>
        )}

        {grafik.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>1 Aylık Fiyat Grafiği</p>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 10, padding: "16px 8px 8px 0" }}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={grafik}>
                  <defs>
                    <linearGradient id="fiyatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="tarih" tick={{ fontSize: 10, fill: "#334155" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[(dataMin: number) => Math.floor(dataMin * 0.995), (dataMax: number) => Math.ceil(dataMax * 1.005)]} tick={{ fontSize: 10, fill: "#334155" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} ₺`} width={55} />
                  <Tooltip contentStyle={{ background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, fontSize: 12 }} formatter={(v: unknown) => [`${v} ₺`, "Fiyat"]} labelStyle={{ color: "#94A3B8" }} />
                  <Area type="monotone" dataKey="fiyat" stroke="#3B82F6" strokeWidth={1.5} fill="url(#fiyatGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {sections.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>AI Analiz Özeti</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sections.map((s, i) => (
                <div key={i} style={{ border: "1px solid rgba(59,130,246,0.1)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.title === "Dikkat Noktalari" || s.title === "Dikkat Noktaları" ? "#E24B4A" : "#3B82F6", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#94A3B8" }}>{s.title}</span>
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "12px 16px", border: "1px solid rgba(59,130,246,0.06)", borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: "#1E293B", lineHeight: 1.6 }}>
                Bu içerik yalnızca teknik veri analizi amacıyla sunulmakta olup SPK mevzuatı kapsamında yatırım tavsiyesi niteliği taşımamaktadır. Yatırım kararlarınız için lisanslı aracı kurumlardan destek alınız.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
      <HisseChatbot ticker={ticker} veri={veri} analiz={analiz} portfoy={portfoy} />
    </AppShell>
  );
}
