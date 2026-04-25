"use client";

import React, { useEffect, useRef, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AppShell from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

const TICKER_KISALT: Record<string, string> = {
  THYAO: "THY", GARAN: "GARAN", AKBNK: "AKBNK", ISCTR: "ISCTR",
  YKBNK: "YKBNK", HALKB: "HALKB", VAKBN: "VAKBN", TUPRS: "TUPRS",
  EREGL: "EREGL", ASELS: "ASELS", KCHOL: "KCHOL", SAHOL: "SAHOL",
  SISE: "SISE", TCELL: "TCELL", BIMAS: "BIMAS", MGROS: "MGROS",
  FROTO: "FROTO", TOASO: "TOASO", ARCLK: "ARCLK", PETKM: "PETKM",
  PGSUS: "PGSUS", TAVHL: "TAVHL", EKGYO: "EKGYO", KOZAL: "KOZAL",
  ENKAI: "ENKAI", TTKOM: "TTKOM", ULKER: "ULKER", AEFES: "AEFES",
  SOKM: "SOKM", SASA: "SASA",
};

function tickerRenk(ticker: string) {
  const renkler = ["#3B82F6","#8B5CF6","#EC4899","#F97316","#10B981","#06B6D4","#EAB308","#EF4444","#6366F1","#14B8A6"];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  return renkler[Math.abs(hash) % renkler.length];
}

const BIST_HISSELER = [
  { ticker: "THYAO", name: "Türk Hava Yolları", kisalt: "THY", domain: "turkishairlines.com" },
  { ticker: "GARAN", name: "Garanti Bankası", kisalt: "GARANTİ", domain: "garanti.com.tr" },
  { ticker: "ASELS", name: "Aselsan", kisalt: "ASELS" },
  { ticker: "EREGL", name: "Ereğli Demir Çelik", kisalt: "EREĞLİ" },
  { ticker: "SISE", name: "Şişecam", kisalt: "ŞİŞECAM" },
  { ticker: "AKBNK", name: "Akbank", kisalt: "AKBANK", domain: "akbank.com" },
  { ticker: "KCHOL", name: "Koç Holding", kisalt: "KOÇ" },
  { ticker: "BIMAS", name: "BİM Mağazalar", kisalt: "BİM", domain: "bim.com.tr" },
  { ticker: "TUPRS", name: "Tüpraş", domain: "tupras.com.tr" },
  { ticker: "SAHOL", name: "Sabancı Holding", domain: "sabanci.com" },
  { ticker: "YKBNK", name: "Yapı Kredi Bankası", domain: "yapikredi.com.tr" },
  { ticker: "TCELL", name: "Turkcell", domain: "turkcell.com.tr" },
  { ticker: "FROTO", name: "Ford Otosan", domain: "fordotosan.com.tr" },
  { ticker: "TOASO", name: "Tofaş Otomobil", domain: "tofas.com.tr" },
  { ticker: "PETKM", name: "Petkim", domain: "petkim.com.tr" },
  { ticker: "ARCLK", name: "Arçelik", domain: "arcelik.com" },
  { ticker: "KOZAL", name: "Koza Altın" },
  { ticker: "KOZAA", name: "Koza Anadolu Metal" },
  { ticker: "EKGYO", name: "Emlak Konut GYO" },
  { ticker: "ISGYO", name: "İş GYO" },
  { ticker: "HALKB", name: "Halkbank", domain: "halkbank.com.tr" },
  { ticker: "VAKBN", name: "Vakıfbank", domain: "vakifbank.com.tr" },
  { ticker: "ISCTR", name: "İş Bankası", domain: "isbank.com.tr" },
  { ticker: "ENKAI", name: "Enka İnşaat", domain: "enka.com" },
  { ticker: "DOHOL", name: "Doğan Holding" },
  { ticker: "TAVHL", name: "TAV Havalimanları", domain: "tav.aero" },
  { ticker: "PGSUS", name: "Pegasus Hava Yolları", domain: "flypgs.com" },
  { ticker: "LOGO", name: "Logo Yazılım" },
  { ticker: "NETAS", name: "Netaş Telekom" },
  { ticker: "VESBE", name: "Vestel Beyaz Eşya" },
  { ticker: "VESTL", name: "Vestel" },
  { ticker: "MGROS", name: "Migros", domain: "migros.com.tr" },
  { ticker: "SOKM", name: "Şok Marketler", domain: "sokmarket.com.tr" },
  { ticker: "ULKER", name: "Ülker Bisküvi", domain: "ulker.com.tr" },
  { ticker: "AEFES", name: "Anadolu Efes" },
  { ticker: "TTKOM", name: "Türk Telekom", domain: "turktelekom.com.tr" },
  { ticker: "TTRAK", name: "Türk Traktör" },
  { ticker: "OTKAR", name: "Otokar" },
  { ticker: "GUBRF", name: "Gübre Fabrikaları" },
  { ticker: "CIMSA", name: "Çimsa" },
  { ticker: "AKCNS", name: "Akçansa" },
  { ticker: "ALARK", name: "Alarko Holding" },
  { ticker: "GOLTS", name: "Göltaş Çimento" },
  { ticker: "KRDMD", name: "Kardemir" },
  { ticker: "ISDMR", name: "İskenderun Demir Çelik" },
  { ticker: "SASA", name: "Sasa Polyester", domain: "sasa.com.tr" },
  { ticker: "BRYAT", name: "Borusan Yatırım" },
  { ticker: "BRISA", name: "Brisa", domain: "brisa.com.tr" },
  { ticker: "DOAS", name: "Doğuş Otomotiv", domain: "dogusotomotiv.com.tr" },
];

const POPULAR = [
  { ticker: "THYAO", name: "Türk Hava Yolları", kisalt: "THY" },
  { ticker: "GARAN", name: "Garanti Bankası", kisalt: "GARANTİ", domain: "garanti.com.tr" },
  { ticker: "ASELS", name: "Aselsan", kisalt: "ASELS" },
  { ticker: "EREGL", name: "Ereğli Demir Çelik", kisalt: "EREĞLİ" },
  { ticker: "SISE", name: "Şişecam", kisalt: "ŞİŞECAM" },
  { ticker: "AKBNK", name: "Akbank", kisalt: "AKBANK", domain: "akbank.com" },
  { ticker: "KCHOL", name: "Koç Holding", kisalt: "KOÇ" },
  { ticker: "BIMAS", name: "BİM Mağazalar", kisalt: "BİM", domain: "bim.com.tr" },
];

const KAP = [
  { ticker: "THYAO", title: "Esas Sözleşme Tadili", time: "15:56" },
  { ticker: "TKNSA", title: "Pay Bazında Devre Kesici Bildirimi", time: "15:56" },
  { ticker: "AKBNK", title: "Yabancı Yatırımcı İşlemleri", time: "15:51" },
];

export default function DashboardPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState("");
  const [aramaOneri, setAramaOneri] = useState<{ ticker: string; name: string }[]>([]);
  const [inputReady, setInputReady] = useState(false);
  const [watchlistInput, setWatchlistInput] = useState("");
  const [watchlistInputAcik, setWatchlistInputAcik] = useState(false);
  const [recent, setRecent] = useState<{ ticker: string; time: string }[]>([]);
  const [watchlist, setWatchlist] = useState<{ ticker: string }[]>([]);
  const [fullName, setFullName] = useState("");
  const [piyasa, setPiyasa] = useState({ usd: { value: "-", change: "-" }, eur: { value: "-", change: "-" }, xu100: { value: "-", change: "-" }, xu030: { value: "-", change: "-" } });
  const [fiyatlar, setFiyatlar] = useState<Record<string, { fiyat: string; degisim: string; yukselis: boolean } | null>>({});
  const [bildirimAcik, setBildirimAcik] = useState(false);

  const selamlama = () => {
    const saat = new Date().getHours();
    if (saat >= 5 && saat < 12) return "Günaydın";
    if (saat >= 12 && saat < 18) return "İyi günler";
    if (saat >= 18 && saat < 24) return "İyi akşamlar";
    return "İyi geceler";
  };
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [buyukGrafik, setBuyukGrafik] = useState<{tarih: string; fiyat: number}[]>([]);
  const [grafikRange, setGrafikRange] = useState("1mo");
  const [grafikYukleniyor, setGrafikYukleniyor] = useState(false);
  const [grafikTicker, setGrafikTicker] = useState("XU100.IS");
  const [grafikTickerLabel, setGrafikTickerLabel] = useState("XU100");
  const [grafikArama, setGrafikArama] = useState("");
  const [grafikDropdown, setGrafikDropdown] = useState(false);

  const fetchBuyukGrafik = React.useCallback(async (range: string, ticker?: string) => {
    setGrafikYukleniyor(true);
    try {
      const t = ticker || grafikTicker;
      const r = await fetch(`/api/grafik?ticker=${t}&range=${range}`);
      const d = await r.json();
      if (d.points) setBuyukGrafik(d.points);
    } catch {}
    setGrafikYukleniyor(false);
  }, [grafikTicker]);

  const bildirimler = [
    { zaman: "09:55", mesaj: `XU100 güne %${piyasa.xu100.change} ile başladı.`, tip: piyasa.xu100.change.startsWith("%-") ? "dusus" : "yukselis" },
    { zaman: "Dün 18:05", mesaj: "THYAO izleme listenizdeki hisse yeni bir KAP bildirimi yayınladı.", tip: "haber" },
    { zaman: "Dün 09:55", mesaj: "XU100 günü %-0,71 düşüşle kapattı.", tip: "dusus" },
  ];
  const router = useRouter();
  const watchlistRef = useRef<{ticker:string}[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      setFullName(session.user.user_metadata?.full_name || "");
      const { data } = await supabase
        .from("watchlist")
        .select("ticker")
        .eq("user_id", session.user.id)
        .order("added_at", { ascending: false });
      if (data) {
        setWatchlist(data);
        watchlistRef.current = data;
        const tickers = data.map((w: {ticker: string}) => w.ticker);
        fetchFiyatlar(tickers);
      }
      setLoading(false);
      fetchBuyukGrafik("1mo");
    });
    const fetchDoviz = () => fetch("/api/piyasa").then(r => r.json()).then(d => setPiyasa(d)).catch(() => {});
    const fetchSparklines = () => {
      [
        { sym: "XU100.IS", key: "XU100" },
        { sym: "XU030.IS", key: "XU030" },
        { sym: "USDTRY=X", key: "USD/TRY" },
        { sym: "EURTRY=X", key: "EUR/TRY" },
      ].forEach(({ sym, key }) => {
        fetch(`/api/grafik?ticker=${sym}`).then(r => r.json()).then(d => {
          if (d.points) {
            setSparklines(prev => ({ ...prev, [key]: d.points.map((p: {fiyat: number}) => p.fiyat) }));
          }
        }).catch(() => {});
      });
    };
    const fetchXu = () => fetch("/api/xu").then(r => r.json()).then(d => setPiyasa(prev => ({ ...prev, ...d }))).catch(() => {});
    const fetchFiyatlar = (extraList?: string[]) => {
      const wl = extraList || watchlistRef.current.map(w => w.ticker);
      const extra = wl.join(",");
      const url = extra ? `/api/fiyatlar?extra=${extra}` : "/api/fiyatlar";
      fetch(url).then(r => r.json()).then(d => setFiyatlar(d)).catch(() => {});
    };
    fetchDoviz();
    fetchXu();
    fetchFiyatlar();
    fetchSparklines();
    const dovizInterval = setInterval(fetchDoviz, 900000);
    const xuInterval = setInterval(fetchXu, 15000);
    const fiyatlarInterval = setInterval(fetchFiyatlar, 30000);
    const loadRecent = () => {
      const stored = localStorage.getItem("pk_recent");
      if (stored) setRecent(JSON.parse(stored));
    };
    loadRecent();
    window.addEventListener("focus", loadRecent);
    return () => { clearInterval(dovizInterval); clearInterval(xuInterval); clearInterval(fiyatlarInterval); window.removeEventListener("focus", loadRecent); };
  }, [router]);

  async function addToWatchlist(t: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const already = watchlist.find((w) => w.ticker === t);
    if (already) return;
    await supabase.from("watchlist").insert({ user_id: session.user.id, ticker: t });
    setWatchlist((prev) => { const next = [{ ticker: t }, ...prev]; watchlistRef.current = next; return next; });
  }

  async function removeFromWatchlist(t: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("ticker", t);
    setWatchlist((prev) => { const next = prev.filter((w) => w.ticker !== t); watchlistRef.current = next; return next; });
  }

  function handleAnaliz(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;
    const t = ticker.trim().toUpperCase();
    const entry = { ticker: t, time: new Date().toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) };
    const updated = [entry, ...recent.filter((r) => r.ticker !== t)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("pk_recent", JSON.stringify(updated));
    router.push(`/hisse/${t}`);
  }



  const firstName = fullName ? fullName.split(" ")[0] : user?.email?.split("@")[0] ?? "";
  const nowDate = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "short", weekday: "long" });
  const nowTime = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const now = `${nowDate} · ${nowTime}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1220" }}>
        <p style={{ color: "#475569", fontSize: 14 }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <AppShell>
    <div style={{ background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)", minHeight: "100vh" }}>
      <style>{`.g-tooltip-wrap:hover .g-tooltip { opacity: 1 !important; }`}</style>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "#F8FAFC" }}>{selamlama()}, {firstName}</h1>
          <span style={{ fontSize: 11, color: "#334155" }}>{now}</span>
        </div>

        {/* Arama */}
        <form onSubmit={handleAnaliz} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "10px 16px", transition: "border-color 0.2s" }}
          onFocus={() => {}} >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <div style={{ flex: 1, position: "relative" }}>
          <input type="search" value={ticker} onChange={(e) => {
            const val = e.target.value;
            setTicker(val);
            if (val.trim().length < 1) { setAramaOneri([]); return; }
            const q = val.trim().toUpperCase();
            const filtered = BIST_HISSELER.filter(h =>
              h.ticker.startsWith(q) || h.name.toUpperCase().startsWith(q)
            ).slice(0, 6);
            setAramaOneri(filtered);
          }} onBlur={() => setTimeout(() => setAramaOneri([]), 150)}
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#94A3B8", padding: "4px 0" }} autoComplete="off" readOnly={!inputReady} onFocus={() => setInputReady(true)} placeholder="Hisse kodu veya şirket adı ara..." />
          {aramaOneri.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, zIndex: 50, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              {aramaOneri.map((h) => (
                <div key={h.ticker} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div onMouseDown={() => { setTicker(h.ticker); setAramaOneri([]); }} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <div style={{ width: 48, height: 28, borderRadius: 6, background: tickerRenk(h.ticker) + "22", border: `1px solid ${tickerRenk(h.ticker)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: tickerRenk(h.ticker), flexShrink: 0, letterSpacing: "-0.5px", overflow: "hidden" }}>
                      {(h as any).domain ? (
                        <img src={`https://www.google.com/s2/favicons?domain=${(h as any).domain}&sz=64`} style={{ width: 20, height: 20, objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        ((h as {ticker:string;name:string;kisalt?:string}).kisalt || h.ticker).slice(0, 5)
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{h.ticker}</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>{h.name}</div>
                    </div>
                  </div>
                  <button onMouseDown={(e) => { e.preventDefault(); watchlist.find(w => w.ticker === h.ticker) ? removeFromWatchlist(h.ticker) : addToWatchlist(h.ticker); }}
                    style={{ fontSize: 14, color: watchlist.find(w => w.ticker === h.ticker) ? "#F97316" : "#334155", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
                    {watchlist.find(w => w.ticker === h.ticker) ? "★" : "☆"}
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
          <button type="submit" style={{ height: 32, padding: "0 16px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
            Analiz Et
          </button>
        </form>

        {/* Piyasa Özeti */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Piyasa Özeti</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: "XU100", val: piyasa.xu100.value, change: piyasa.xu100.change, up: !piyasa.xu100.change.startsWith("%-") && piyasa.xu100.change !== "-", gecikme: true },
              { label: "XU030", val: piyasa.xu030.value, change: piyasa.xu030.change, up: !piyasa.xu030.change.startsWith("%-") && piyasa.xu030.change !== "-", gecikme: true },
              { label: "USD/TRY", val: piyasa.usd.value, change: piyasa.usd.change, up: !piyasa.usd.change.startsWith("-") },
              { label: "EUR/TRY", val: piyasa.eur.value, change: piyasa.eur.change, up: !piyasa.eur.change.startsWith("-") },
            ].map((e) => {
              const color = e.up ? "#10B981" : "#EF4444";
              const bgColor = e.up ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)";
              // Gercek sparkline veya fallback
              const rawPts = sparklines[e.label] || [];
              const pts = rawPts.length > 1 ? rawPts : (e.up
                ? [40,38,42,37,41,36,39,34,38,32,35,30,33,28,30,25,28,22,26,20]
                : [20,22,25,21,27,23,29,25,31,27,33,30,35,32,37,34,39,36,41,38]);
              const w = 100, h = 40;
              const mn = Math.min(...pts), mx = Math.max(...pts);
              const sx = (i: number) => (i / (pts.length - 1)) * w;
              const sy = (v: number) => h - ((v - mn) / (mx - mn + 1)) * h;
              const d = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(v)}`).join(" ");
              const area = d + ` L ${w} ${h} L 0 ${h} Z`;
              return (
                <div key={e.label} style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, position: "relative", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>{e.label}</span>
                    {e.gecikme && (
                      <span style={{ position: "relative", display: "inline-flex" }} className="g-tooltip-wrap">
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#F97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 3, padding: "1px 5px", lineHeight: 1.4, cursor: "default" }}>G</span>
                        <span style={{ position: "fixed", background: "#1E293B", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap", padding: "4px 8px", borderRadius: 5, pointerEvents: "none", opacity: 0, transition: "opacity 0.15s", transform: "translateY(-28px)", zIndex: 9999 }} className="g-tooltip">15 dk gecikmeli</span>
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.5px", lineHeight: 1.2 }}>{e.val}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color, display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                        <span>{e.up ? "▲" : "▼"}</span>
                        <span>{e.change}</span>
                      </div>
                    </div>
                    <svg width="100" height="40" viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
                      <defs>
                        <linearGradient id={`sg-${e.label}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
                          <stop offset="100%" stopColor={color} stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d={area} fill={`url(#sg-${e.label})`}/>
                      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Piyasa Grafiği */}
        <div style={{ marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase" }}>Piyasa Grafiği</p>
              {/* Ticker seçici */}
              <div style={{ position: "relative" }}>
                <button onClick={() => setGrafikDropdown(v => !v)}
                  style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
                  {grafikTickerLabel} ▾
                </button>
                {grafikDropdown && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, zIndex: 100, minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                    <div style={{ padding: "8px" }}>
                      <input
                        autoFocus
                        placeholder="Hisse kodu yaz... (THYAO, GARAN, SASA...)"
                        value={grafikArama}
                        onChange={e => setGrafikArama(e.target.value.toUpperCase())}
                        onKeyDown={e => {
                          if (e.key === "Enter" && grafikArama.length >= 2) {
                            const t = grafikArama.endsWith(".IS") || grafikArama.includes("=X") ? grafikArama : `${grafikArama}.IS`;
                            setGrafikTicker(t);
                            setGrafikTickerLabel(grafikArama.replace(".IS",""));
                            setGrafikDropdown(false);
                            setGrafikArama("");
                            fetchBuyukGrafik(grafikRange, t);
                          }
                        }}
                        style={{ width: "100%", background: "#1E293B", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "6px 10px", color: "#F1F5F9", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                      />
                      {grafikArama.length >= 2 && (() => {
                        const sabit2 = ["XU100.IS","XU030.IS","USDTRY=X","EURTRY=X"];
                        const eslesmeler = [
                          ...sabit2.filter(t => t.includes(grafikArama)),
                          ...BIST_HISSELER.filter(h => h.ticker.includes(grafikArama) || h.name.toUpperCase().includes(grafikArama))
                        ];
                        if (eslesmeler.length > 0) return null;
                        return (
                        <div
                          onClick={() => {
                            const t = grafikArama.endsWith(".IS") || grafikArama.includes("=X") ? grafikArama : `${grafikArama}.IS`;
                            setGrafikTicker(t);
                            setGrafikTickerLabel(grafikArama.replace(".IS",""));
                            setGrafikDropdown(false);
                            setGrafikArama("");
                            fetchBuyukGrafik(grafikRange, t);
                          }}
                          style={{ marginTop: 4, padding: "7px 10px", background: "rgba(59,130,246,0.12)", borderRadius: 6, fontSize: 12, color: "#3B82F6", cursor: "pointer", fontWeight: 500 }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.2)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "rgba(59,130,246,0.12)")}
                        >
                          → {grafikArama} grafiğini göster
                        </div>
                        );
                      })()}
                    </div>
                    <div style={{ maxHeight: 200, overflowY: "auto" }}>
                      {(() => {
                        const sabit = [
                          { ticker: "XU100.IS", label: "XU100 — BIST 100" },
                          { ticker: "XU030.IS", label: "XU030 — BIST 30" },
                          { ticker: "USDTRY=X", label: "USD/TRY" },
                          { ticker: "EURTRY=X", label: "EUR/TRY" },
                        ];
                        const bist = BIST_HISSELER.map(h => ({ ticker: `${h.ticker}.IS`, label: `${h.ticker} — ${h.name}` }));
                        const sabitTickers = new Set(sabit.map(s => s.ticker));
                        const tumListe = [...sabit, ...bist.filter(b => !sabitTickers.has(b.ticker))];
                        return tumListe.filter(t => !grafikArama || t.label.toUpperCase().includes(grafikArama)).slice(0, 60).map(t => (
                        <div key={t.ticker}
                          onClick={() => {
                            setGrafikTicker(t.ticker);
                            setGrafikTickerLabel(t.label.split(" — ")[0]);
                            setGrafikDropdown(false);
                            setGrafikArama("");
                            fetchBuyukGrafik(grafikRange, t.ticker);
                          }}
                          style={{ padding: "8px 12px", fontSize: 12, color: grafikTicker === t.ticker ? "#3B82F6" : "#94A3B8", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.08)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          {t.label}
                        </div>
                        ));})()}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { label: "1G", value: "1d" },
                { label: "1H", value: "1wk" },
                { label: "1A", value: "1mo" },
                { label: "3A", value: "3mo" },
                { label: "1Y", value: "1y" },
              ].map((r) => (
                <button key={r.value} onClick={() => { setGrafikRange(r.value); fetchBuyukGrafik(r.value); }}
                  style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: grafikRange === r.value ? "#3B82F6" : "rgba(255,255,255,0.05)",
                    color: grafikRange === r.value ? "#fff" : "#64748B" }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12, padding: "16px 8px 8px 0", position: "relative" }}>
            {grafikYukleniyor && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(11,18,32,0.7)", borderRadius: 12, zIndex: 10 }}>
                <span style={{ fontSize: 12, color: "#64748B" }}>Yükleniyor...</span>
              </div>
            )}
            {buyukGrafik.length > 0 && (() => {
              const pts = buyukGrafik.map(p => p.fiyat);
              const isUp = pts[pts.length - 1] >= pts[0];
              const color = isUp ? "#10B981" : "#EF4444";
              const mn = Math.min(...pts);
              const mx = Math.max(...pts);
              const pad = (mx - mn) * 0.05;
              return (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={buyukGrafik} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grafikGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis
                      dataKey="tarih"
                      tick={{ fontSize: 10, fill: "#334155" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[mn - pad, mx + pad]}
                      tick={{ fontSize: 10, fill: "#334155" }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                      tickFormatter={(v: number) => v.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
                    />
                    <Tooltip
                      contentStyle={{ background: "#0F1C2E", border: `1px solid ${color}33`, borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#94A3B8", marginBottom: 4 }}
                      formatter={(v: unknown) => [`${typeof v === "number" ? v.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : v}`, grafikTickerLabel]}
                      cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="fiyat"
                      stroke={color}
                      strokeWidth={1.5}
                      fill="url(#grafikGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>

        {/* Popüler Hisseler */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Popüler BIST Hisseleri</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {POPULAR.map((s) => (
              <div key={s.ticker} onClick={() => router.push(`/hisse/${s.ticker}`)}
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 8, padding: "10px 12px", cursor: "pointer", position: "relative", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.06)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.3)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.1)"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {(() => { const h = BIST_HISSELER.find(b => b.ticker === s.ticker); return (h as any)?.domain ? (
                    <img src={`https://www.google.com/s2/favicons?domain=${(h as any).domain}&sz=32`} style={{ width: 16, height: 16, objectFit: "contain" }}
                      onError={(e) => { const el = e.target as HTMLImageElement; el.style.display="none"; const span = document.createElement("span"); span.style.cssText=`font-size:9px;font-weight:700;color:${tickerRenk(s.ticker)}`; span.innerText=s.ticker.slice(0,3); el.parentNode?.appendChild(span); }} />
                  ) : <span style={{ fontSize: 9, fontWeight: 700, color: tickerRenk(s.ticker) }}>{s.ticker.slice(0,3)}</span>; })()}
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#E2E8F0" }}>{s.ticker}</div>
                </div>
                <div style={{ fontSize: 10, color: "#334155", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                {fiyatlar[s.ticker] && fiyatlar[s.ticker] !== null && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#E2E8F0" }}>{fiyatlar[s.ticker]!.fiyat} ₺</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: fiyatlar[s.ticker]!.yukselis ? "#1D9E75" : "#E24B4A", display: "flex", alignItems: "center", gap: 2 }}>
                      <span>{fiyatlar[s.ticker]!.yukselis ? "▲" : "▼"}</span>
                      <span>{fiyatlar[s.ticker]!.yukselis ? "%" : "%-"}{Math.abs(Number(fiyatlar[s.ticker]!.degisim)).toFixed(2).replace(".", ",")}</span>
                    </span>
                  </div>
                )}
                <button onClick={(ev) => { ev.stopPropagation(); addToWatchlist(s.ticker); }}
                  style={{ position: "absolute", top: 8, right: 8, fontSize: 10, color: "#1E40AF", background: "none", border: "none", cursor: "pointer" }}>
                  {watchlist.find((w) => w.ticker === s.ticker) ? "★" : "☆"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Alt 3 kolon */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {/* İzleme Listesi */}
          <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.07em", textTransform: "uppercase" }}>İzleme Listesi</span>
              <button onClick={() => { setWatchlistInputAcik(!watchlistInputAcik); setWatchlistInput(""); }}
                style={{ fontSize: 16, color: watchlistInputAcik ? "#94A3B8" : "#3B82F6", background: "none", border: "none", cursor: "pointer", lineHeight: 1, fontWeight: 300 }}>
                {watchlistInputAcik ? "✕" : "+"}
              </button>
            </div>
            {watchlistInputAcik && (
              <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", gap: 6 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    autoFocus
                    autoComplete="off"
                    readOnly={false}
                    value={watchlistInput}
                    onChange={e => setWatchlistInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter" && watchlistInput.trim()) { addToWatchlist(watchlistInput.trim()); setWatchlistInput(""); setWatchlistInputAcik(false); } if (e.key === "Escape") { setWatchlistInputAcik(false); setWatchlistInput(""); } }}
                    placeholder="THYAO"
                    style={{ width: "100%", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 5, padding: "4px 8px", fontSize: 12, color: "#E2E8F0", outline: "none" }}
                  />
                  {watchlistInput.length > 0 && (() => {
                    const q = watchlistInput.toUpperCase();
                    const filtered = BIST_HISSELER.filter(h => h.ticker.startsWith(q) || h.name.toUpperCase().startsWith(q)).slice(0, 5);
                    return filtered.length > 0 ? (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, zIndex: 100, overflow: "hidden" }}>
                        {filtered.map(h => (
                          <div key={h.ticker} onMouseDown={() => { addToWatchlist(h.ticker); setWatchlistInput(""); setWatchlistInputAcik(false); }}
                            style={{ padding: "7px 10px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.08)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{h.ticker}</span>
                            <span style={{ fontSize: 10, color: "#475569" }}>{h.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
                <button onMouseDown={() => { if (watchlistInput.trim()) { addToWatchlist(watchlistInput.trim()); setWatchlistInput(""); setWatchlistInputAcik(false); } }}
                  style={{ fontSize: 11, color: "#3B82F6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 5, padding: "4px 8px", cursor: "pointer" }}>Ekle</button>
              </div>
            )}
            {watchlist.length === 0 ? (
              <div style={{ padding: "20px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <p style={{ fontSize: 12, color: "#334155", textAlign: "center" }}>Henüz hisse eklemediniz</p>
                <p style={{ fontSize: 11, color: "#1E293B", textAlign: "center" }}>Hisse kartlarındaki ☆ ile ekleyin</p>
              </div>
            ) : (
              watchlist.map((w) => (
                <div key={w.ticker} onClick={() => router.push(`/hisse/${w.ticker}`)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid rgba(59,130,246,0.05)", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {(() => { const h = BIST_HISSELER.find(b => b.ticker === w.ticker); return (h as any)?.domain ? (
                      <img src={`https://www.google.com/s2/favicons?domain=${(h as any).domain}&sz=32`} style={{ width: 16, height: 16, objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : <span style={{ fontSize: 9, fontWeight: 700, color: tickerRenk(w.ticker) }}>{w.ticker.slice(0,3)}</span>; })()}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#E2E8F0" }}>{w.ticker}</div>
                    {fiyatlar[w.ticker] && (
                      <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>{fiyatlar[w.ticker]!.fiyat} ₺</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: fiyatlar[w.ticker]!.yukselis ? "#1D9E75" : "#E24B4A", display: "flex", alignItems: "center", gap: 2 }}>
                          <span>{fiyatlar[w.ticker]!.yukselis ? "▲" : "▼"}</span>
                          <span>{fiyatlar[w.ticker]!.yukselis ? "%" : "%-"}{Math.abs(Number(fiyatlar[w.ticker]!.degisim)).toFixed(2).replace(".", ",")}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeFromWatchlist(w.ticker); }}
                    style={{ fontSize: 11, color: "#334155", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              ))
            )}
          </div>

          {/* Son Analizler */}
          <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.07em", textTransform: "uppercase" }}>Son Analizlerin</span>
            </div>
            {recent.length === 0 ? (
              <div style={{ padding: "20px 14px" }}>
                <p style={{ fontSize: 12, color: "#334155", textAlign: "center" }}>Henüz analiz yapmadınız</p>
              </div>
            ) : (
              recent.map((r, i) => (
                <div key={i} onClick={() => router.push(`/hisse/${r.ticker}`)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid rgba(59,130,246,0.05)", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {(() => { const h = BIST_HISSELER.find(b => b.ticker === r.ticker); return (h as any)?.domain ? (
                      <img src={`https://www.google.com/s2/favicons?domain=${(h as any).domain}&sz=32`} style={{ width: 16, height: 16, objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : <span style={{ fontSize: 9, fontWeight: 700, color: tickerRenk(r.ticker) }}>{r.ticker.slice(0,3)}</span>; })()}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#E2E8F0" }}>{r.ticker}</div>
                      <div style={{ fontSize: 10, color: "#334155", marginTop: 1 }}>{r.time}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "#1E40AF" }}>→</span>
                </div>
              ))
            )}
          </div>

          {/* KAP Haberleri */}
          <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.07em", textTransform: "uppercase" }}>KAP Haberleri</span>
            </div>
            {KAP.map((k, i) => (
              <div key={i} style={{ padding: "9px 14px", borderBottom: i < KAP.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: "#3B82F6", marginBottom: 2 }}>{k.ticker}</div>
                <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>{k.title}</div>
                <div style={{ fontSize: 10, color: "#1E293B", marginTop: 2 }}>{k.time}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
    </AppShell>
  );
}
