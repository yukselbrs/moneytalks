"use client";

import { useEffect, useRef, useState } from "react";
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
  { ticker: "EREGL", name: "Ereğli Demir Çelik" },
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
    });
    const fetchDoviz = () => fetch("/api/piyasa").then(r => r.json()).then(d => setPiyasa(d)).catch(() => {});
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const firstName = user?.email?.split("@")[0] ?? "";
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
    <div className="min-h-screen" style={{ background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <style>{`.g-tooltip-wrap:hover .g-tooltip { opacity: 1 !important; }`}</style>
      {/* Navbar */}
      <nav style={{ borderBottom: "1px solid rgba(59,130,246,0.1)", padding: "13px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ fontSize: 15, fontWeight: 500, color: "#F8FAFC", textDecoration: "none" }}>
          para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#1E293B" }}>.com</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#F97316", letterSpacing: "0.06em" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#F97316" }} />
            DEMO
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setBildirimAcik(!bildirimAcik)} style={{ background: "none", border: "none", cursor: "pointer", color: bildirimAcik ? "#3B82F6" : "#475569", display: "flex", alignItems: "center", padding: 4, transition: "color 0.15s" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            {bildirimAcik && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", width: 320, background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, zIndex: 100, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#F8FAFC" }}>Bildirimler</span>
                  <span style={{ fontSize: 12, color: "#475569" }}>⚙</span>
                </div>
                {bildirimler.map((b, i) => (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: i < bildirimler.length - 1 ? "1px solid rgba(59,130,246,0.06)" : "none", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 12 }}>{b.tip === "yukselis" ? "🟢" : b.tip === "dusus" ? "🔴" : "📄"}</span>
                    <div>
                      <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>{b.zaman}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>{b.mesaj}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <a href="/profile" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#3B82F6" }}>
              {fullName ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : user?.email?.slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "#475569" }}>{user?.email}</span>
          </a>
          <button onClick={handleLogout} style={{ fontSize: 12, color: "#94A3B8", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "5px 13px", background: "transparent", cursor: "pointer" }}>
            Çıkış Yap
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "#F8FAFC" }}>İyi günler, {firstName}</h1>
          <span style={{ fontSize: 11, color: "#334155" }}>{now}</span>
        </div>

        {/* Arama */}
        <form onSubmit={handleAnaliz} style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(59,130,246,0.15)", paddingBottom: 10 }}>
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
          }} onBlur={() => setTimeout(() => setAramaOneri([]), 150)} placeholder="Hisse kodu veya şirket adı girin..."
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#94A3B8", padding: "4px 0" }} autoComplete="off" readOnly={!inputReady} onFocus={() => setInputReady(true)} />
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
          <button type="submit" style={{ height: 30, padding: "0 12px", background: "rgba(59,130,246,0.12)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
            Analiz Et
          </button>
        </form>

        {/* Piyasa Özeti */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Piyasa Özeti</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[
              { label: "XU100", val: piyasa.xu100.value, change: piyasa.xu100.change, up: !piyasa.xu100.change.startsWith("%-") && piyasa.xu100.change !== "-" },
              { label: "XU030", val: piyasa.xu030.value, change: piyasa.xu030.change, up: !piyasa.xu030.change.startsWith("%-") && piyasa.xu030.change !== "-" },
              { label: "USD/TRY", val: piyasa.usd.value, change: piyasa.usd.change, up: !piyasa.usd.change.startsWith("-") },
              { label: "EUR/TRY", val: piyasa.eur.value, change: piyasa.eur.change, up: !piyasa.eur.change.startsWith("-") },
            ].map((e) => (
              <div key={e.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#475569", fontWeight: 500, marginBottom: 5 }}>{e.label}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#E2E8F0", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  {(e.label === "XU100" || e.label === "XU030") && (
                    <span style={{ position: "relative", display: "inline-flex" }} className="g-tooltip-wrap">
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#F97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 3, padding: "1px 4px", lineHeight: 1.4, cursor: "default" }}>G</span>
                      <span style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1E293B", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap", padding: "4px 8px", borderRadius: 5, pointerEvents: "none", opacity: 0, transition: "opacity 0.15s" }} className="g-tooltip">15 dk gecikmeli</span>
                    </span>
                  )}
                  {e.val}
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: e.up ? "#1D9E75" : "#E24B4A" }}>{e.change}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Popüler Hisseler */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Popüler BIST Hisseleri</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {POPULAR.map((s) => (
              <div key={s.ticker} onClick={() => router.push(`/hisse/${s.ticker}`)}
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 8, padding: "10px 12px", cursor: "pointer", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {(() => { const h = BIST_HISSELER.find(b => b.ticker === s.ticker); return (h as any)?.domain ? (
                    <img src={`https://www.google.com/s2/favicons?domain=${(h as any).domain}&sz=32`} style={{ width: 16, height: 16, objectFit: "contain" }}
                      onError={(e) => { const el = e.target as HTMLImageElement; el.style.display="none"; const span = document.createElement("span"); span.style.cssText=`font-size:9px;font-weight:700;color:${tickerRenk(s.ticker)}`; span.innerText=s.ticker.slice(0,3); el.parentNode?.appendChild(span); }} />
                  ) : <span style={{ fontSize: 9, fontWeight: 700, color: tickerRenk(s.ticker) }}>{s.ticker.slice(0,3)}</span>; })()}
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#E2E8F0" }}>{s.ticker}</div>
                </div>
                <div style={{ fontSize: 10, color: "#334155", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                {fiyatlar[s.ticker] && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#E2E8F0" }}>{"₺"}{fiyatlar[s.ticker].fiyat}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: fiyatlar[s.ticker].yukselis ? "#1D9E75" : "#E24B4A" }}>
                      {fiyatlar[s.ticker].yukselis ? "%" : "%-"}{Math.abs(Number(fiyatlar[s.ticker].degisim)).toFixed(2).replace(".", ",")}
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
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>₺{fiyatlar[w.ticker]!.fiyat}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: fiyatlar[w.ticker]!.yukselis ? "#1D9E75" : "#E24B4A" }}>
                          {fiyatlar[w.ticker]!.yukselis ? "%" : "%-"}{Math.abs(Number(fiyatlar[w.ticker]!.degisim)).toFixed(2).replace(".", ",")}
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
  );
}
