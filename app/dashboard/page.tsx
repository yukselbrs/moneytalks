"use client";

import React, { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import DashboardMarketSummary from "@/components/DashboardMarketSummary";
import DashboardAiPanel from "@/components/DashboardAiPanel";
import DashboardChartPanel from "@/components/DashboardChartPanel";
import DashboardMarketFocus from "@/components/DashboardMarketFocus";
import DashboardWatchlistPanel from "@/components/DashboardWatchlistPanel";
import DashboardSidePanel from "@/components/DashboardSidePanel";
import DashboardSearchBox from "@/components/DashboardSearchBox";
import DashboardFooter from "@/components/DashboardFooter";
import { useDashboardMarket } from "@/hooks/useDashboardMarket";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { useWatchlist } from "@/hooks/useWatchlist";

function tickerRenk(ticker: string) {
  const renkler = ["#3B82F6","#8B5CF6","#EC4899","#F97316","#10B981","#06B6D4","#EAB308","#EF4444","#6366F1","#14B8A6"];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  return renkler[Math.abs(hash) % renkler.length];
}

type DashboardHisse = {
  ticker: string;
  name: string;
  kisalt?: string;
  domain?: string;
};

const BIST_HISSELER: DashboardHisse[] = [
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
  { ticker: "TRMET", name: "TR Anadolu Metal" },
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

const KAP: { ticker: string; title: string; time: string }[] = [];

export default function DashboardPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState("");
  const [aramaOneri, setAramaOneri] = useState<DashboardHisse[]>([]);
  const [inputReady, setInputReady] = useState(false);
  const [watchlistInput, setWatchlistInput] = useState("");
  const [watchlistInputAcik, setWatchlistInputAcik] = useState(false);
  const [fullName, setFullName] = useState("");
  const [piyasaOdagiTab, setPiyasaOdagiTab] = useState("one");
  const { piyasa, piyasaFlash, sparklines, topMovers } = useDashboardMarket();
  const { watchlist, recent, fiyatlar, setRecent, loadWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { portfoyOzet, loadPortfolioSummary } = usePortfolioSummary();
  const [kapHaberler, setKapHaberler] = useState<{ ticker: string; title: string; time: string }[]>([]);

  useEffect(() => {
    fetch("/api/haberler")
      .then(r => r.json())
      .then(data => {
        const haberler = (data.haberler || []).slice(0, 5).map((h: { ticker: string; baslik: string; tarih: string }) => ({
          ticker: h.ticker,
          title: h.baslik,
          time: new Date(h.tarih).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
        }));
        setKapHaberler(haberler);
      })
      .catch(() => {});
  }, []);

  const selamlama = () => {
    const saat = new Date().getHours();
    if (saat >= 5 && saat < 12) return "Günaydın";
    if (saat >= 12 && saat < 18) return "İyi günler";
    if (saat >= 18 && saat < 24) return "İyi akşamlar";
    return "İyi geceler";
  };
  const [buyukGrafik, setBuyukGrafik] = useState<{tarih: string; fiyat: number}[]>([]);
  const [grafikRange, setGrafikRange] = useState("1d");
  const [grafikRangeDegisim, setGrafikRangeDegisim] = useState<Record<string, number>>({});
  const [grafikYukleniyor, setGrafikYukleniyor] = useState(false);
  const [grafikTicker, setGrafikTicker] = useState("XU100.IS");
  const [grafikTickerLabel, setGrafikTickerLabel] = useState("XU100");
  const [grafikArama, setGrafikArama] = useState("");
  const [grafikDropdown, setGrafikDropdown] = useState(false);
  const [aiPanel, setAiPanel] = useState<{skor: number; seviye: string; yorum: string; guven: string; yukleniyor: boolean} | null>(null);
  const grafikRef = useRef<HTMLDivElement>(null);
  const grafikObserverRef = useRef<ResizeObserver | null>(null);
  const initialGrafikLoadedRef = useRef(false);
  const [grafikWidth, setGrafikWidth] = useState(0);

  const setGrafikContainerRef = React.useCallback((node: HTMLDivElement | null) => {
    grafikObserverRef.current?.disconnect();
    grafikRef.current = node;
    grafikObserverRef.current = null;
    if (!node) {
      setGrafikWidth(0);
      return;
    }
    setGrafikWidth(Math.floor(node.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => {
      setGrafikWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(node);
    grafikObserverRef.current = observer;
  }, []);

  const fetchBuyukGrafik = React.useCallback(async (range: string, ticker?: string) => {
    setGrafikYukleniyor(true);
    try {
      const t = ticker || grafikTicker;
      const r = await fetch(`/api/grafik?ticker=${t}&range=${range}`);
      const d = await r.json();
      if (d.points) { setBuyukGrafik(d.points); const pts = d.points.map((p: {fiyat: number}) => p.fiyat); if (pts.length > 1) { const pct = ((pts[pts.length - 1] - pts[0]) / pts[0]) * 100; setGrafikRangeDegisim(prev => ({ ...prev, [range]: pct })); } }
    } catch {
      setBuyukGrafik([]);
    } finally {
      setGrafikYukleniyor(false);
    }
  }, [grafikTicker]);

  const fetchAiPanel = React.useCallback(async (ticker?: string) => {
    const t = (ticker || grafikTicker).replace(".IS","").replace("=X","");
    const temiz = ticker ? t : grafikTickerLabel;
    setAiPanel({ skor: 0, seviye: "", yorum: "", guven: "", yukleniyor: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAiPanel({ skor: 50, seviye: "Orta", yorum: "Analiz için giriş gerekli.", guven: "Düşük", yukleniyor: false });
        return;
      }
      const [riskRes, yorumRes] = await Promise.all([
        fetch(`/api/risk?ticker=${temiz}`),
        fetch("/api/analiz", {
          method: "POST",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ ticker: temiz, veriOnly: false, kisaYorum: true }),
        }),
      ]);
      const risk = await riskRes.json();
      const yorumJson = await yorumRes.json();
      const skor = risk.skor ? Math.round(100 - risk.skor) : 50;
      const analizMetin: string = yorumJson.analiz || "";
      const temizMetin = analizMetin.replace(/[#*]/g, "").trim();
      // Satırları gez, 30+ karakter olan ilk tam cümleyi al
      const satirlar = temizMetin.split("\n").map((s: string) => s.trim()).filter((s: string) => s.length > 30);
      const ilkSatir = satirlar[0] || temizMetin;
      const cumleMatch = ilkSatir.match(/^.+?\.(?=\s+[A-ZÇĞİÖŞÜ]|\s*$)|^.+?[!?]/s);
      const yorum = cumleMatch ? cumleMatch[0].trim() : (ilkSatir.length > 160 ? ilkSatir.slice(0, 160) + "..." : ilkSatir);
      const guven = risk.seviyeTR === "Düşük" ? "Yüksek" : risk.seviyeTR === "Orta" ? "Orta" : "Düşük";
      setAiPanel({ skor, seviye: risk.seviyeTR || "Orta", yorum, guven, yukleniyor: false });
    } catch {
      setAiPanel({ skor: 50, seviye: "Orta", yorum: "Analiz alınamadı.", guven: "Düşük", yukleniyor: false });
    }
  }, [grafikTicker, grafikTickerLabel]);

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      setFullName(session.user.user_metadata?.full_name || "");
      await Promise.all([
        loadWatchlist(session.user.id),
        loadPortfolioSummary(),
      ]);
      setLoading(false);
    });
  }, [loadPortfolioSummary, loadWatchlist, router]);

  useEffect(() => {
    if (loading || initialGrafikLoadedRef.current) return;
    initialGrafikLoadedRef.current = true;
    fetchBuyukGrafik("1d");
  }, [fetchBuyukGrafik, loading]);

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
      <style>{`.g-tooltip-wrap:hover .g-tooltip { opacity: 1 !important; }
        .dash-surface { transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease; }
        .dash-surface:hover { border-color: rgba(59,130,246,0.18) !important; background: rgba(15,23,42,0.58) !important; box-shadow: 0 10px 28px rgba(2,6,23,0.14); }
        .dash-search-box:focus-within { border-color: rgba(59,130,246,0.42) !important; background: rgba(59,130,246,0.075) !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.08); }
        .dash-search-submit { transition: transform 0.14s ease, filter 0.14s ease, box-shadow 0.14s ease; }
        .dash-search-submit:hover { filter: brightness(1.08); box-shadow: 0 8px 20px rgba(37,99,235,0.22); transform: translateY(-1px); }
        .dash-main-padding { padding: 24px 32px; }
        .dash-main-grid { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 20px; align-items: start; }
        .dash-piyasa-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
        .dash-grafik-ai-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 12px; }
        .dash-popular-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
        .dash-alt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dash-h1 { font-size: 28px; }
        .dash-piyasa-val { font-size: 26px; }
        @media (max-width: 767px) {
          .dash-main-padding { padding: 12px 14px !important; }
          .dash-main-grid { grid-template-columns: 1fr !important; }
          .dash-piyasa-grid { grid-template-columns: repeat(2,1fr) !important; }
          .dash-grafik-ai-grid { grid-template-columns: 1fr !important; }
          .dash-popular-grid { grid-template-columns: repeat(2,1fr) !important; }
          .dash-alt-grid { grid-template-columns: 1fr !important; }
          .dash-h1 { font-size: 20px !important; }
          .dash-piyasa-val { font-size: 18px !important; }
          .dash-search-box { flex-wrap: wrap; gap: 10px !important; }
          .dash-search-field { order: 2; flex-basis: calc(100% - 28px); }
          .dash-search-submit { order: 3; width: 100%; }
        }`}</style>

      <main className="dash-main-padding" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <div className="dash-main-grid" style={{}}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {/* Header */}
        <h1 className="dash-h1" style={{ fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.5px" }}>{selamlama()}, {firstName}</h1>

        <DashboardSearchBox
          ticker={ticker}
          inputReady={inputReady}
          aramaOneri={aramaOneri}
          bistHisseler={BIST_HISSELER}
          watchlist={watchlist}
          tickerRenk={tickerRenk}
          setTicker={setTicker}
          setInputReady={setInputReady}
          setAramaOneri={setAramaOneri}
          addToWatchlist={addToWatchlist}
          removeFromWatchlist={removeFromWatchlist}
          onSubmit={handleAnaliz}
          goToHisse={(t) => router.push(`/hisse/${t}`)}
        />

        {/* Piyasa Özeti */}
        <DashboardMarketSummary piyasa={piyasa} sparklines={sparklines} flash={piyasaFlash} />

        {/* Piyasa Grafiği + AI Panel */}
        <div className="dash-grafik-ai-grid" style={{ marginTop: 4, alignItems: "stretch" }}>
        <DashboardChartPanel
          bistHisseler={BIST_HISSELER}
          grafikTicker={grafikTicker}
          grafikTickerLabel={grafikTickerLabel}
          grafikRange={grafikRange}
          grafikRangeDegisim={grafikRangeDegisim}
          grafikArama={grafikArama}
          grafikDropdown={grafikDropdown}
          grafikYukleniyor={grafikYukleniyor}
          buyukGrafik={buyukGrafik}
          grafikWidth={grafikWidth}
          setGrafikContainerRef={setGrafikContainerRef}
          setGrafikTicker={setGrafikTicker}
          setGrafikTickerLabel={setGrafikTickerLabel}
          setGrafikRange={setGrafikRange}
          setGrafikArama={setGrafikArama}
          setGrafikDropdown={setGrafikDropdown}
          fetchBuyukGrafik={fetchBuyukGrafik}
        />

        {/* AI Panel */}
        <DashboardAiPanel aiPanel={aiPanel} onAnalyze={() => fetchAiPanel()} />
        </div>

        {/* Piyasa Odakları */}
        <DashboardMarketFocus
          bistHisseler={BIST_HISSELER}
          popular={POPULAR}
          fiyatlar={fiyatlar}
          topMovers={topMovers}
          piyasaOdagiTab={piyasaOdagiTab}
          watchlist={watchlist}
          tickerRenk={tickerRenk}
          setPiyasaOdagiTab={setPiyasaOdagiTab}
          addToWatchlist={addToWatchlist}
          removeFromWatchlist={removeFromWatchlist}
          goToHisse={(t) => router.push(`/hisse/${t}`)}
        />

        <DashboardWatchlistPanel
          bistHisseler={BIST_HISSELER}
          watchlist={watchlist}
          fiyatlar={fiyatlar}
          recent={recent}
          watchlistInput={watchlistInput}
          watchlistInputAcik={watchlistInputAcik}
          tickerRenk={tickerRenk}
          setWatchlistInput={setWatchlistInput}
          setWatchlistInputAcik={setWatchlistInputAcik}
          addToWatchlist={addToWatchlist}
          removeFromWatchlist={removeFromWatchlist}
          goToHisse={(t) => router.push(`/hisse/${t}`)}
        />

        </div>

        <DashboardSidePanel
          portfoyOzet={portfoyOzet}
          topMovers={topMovers}
          kap={kapHaberler}
          goToHisse={(t) => router.push(`/hisse/${t}`)}
        />
        </div>

      </main>
    </div>
    <DashboardFooter />
    </AppShell>
  );
}
