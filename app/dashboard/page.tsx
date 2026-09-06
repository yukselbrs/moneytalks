"use client";

import React, { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import DashboardMarketSummary from "@/components/DashboardMarketSummary";
import DashboardAiPanel from "@/components/DashboardAiPanel";
import DashboardMarketFocus from "@/components/DashboardMarketFocus";
import DashboardWatchlistPanel from "@/components/DashboardWatchlistPanel";
import DashboardSidePanel from "@/components/DashboardSidePanel";
import DashboardSearchBox from "@/components/DashboardSearchBox";
import DashboardFooter from "@/components/DashboardFooter";
import DashboardMarketRegime from "@/components/DashboardMarketRegime";
import dynamic from "next/dynamic";
import { useDashboardMarket } from "@/hooks/useDashboardMarket";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useChartPanel } from "@/hooks/useChartPanel";
import { tickerRenk, toTitleCase } from "@/lib/utils";
import { LS } from "@/lib/storage-keys";
import Toast from "@/components/ui/Toast";
import { BIST_HISSELER as TUM_BIST_HISSELER } from "@/lib/bist-hisseler";

const DashboardChartPanel = dynamic(() => import("@/components/DashboardChartPanel"), {
  ssr: false,
  loading: () => <div style={{ flex: 1, height: 360, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12 }} />,
});

const POPULAR_TICKERS = ["THYAO", "GARAN", "ASELS", "EREGL", "SISE", "AKBNK", "KCHOL", "BIMAS"];
const AUTH_TIMEOUT_MS = 7000;

const BIST_HISSELER = TUM_BIST_HISSELER.map(h => ({ ticker: h.ticker, name: toTitleCase(h.ad), domain: h.domain }));
const POPULAR = BIST_HISSELER.filter(h => POPULAR_TICKERS.includes(h.ticker));

function aiPanelSkoruHesapla(risk: { skor?: number; teknikSkor?: number; makroKatki?: number; makroRisk?: { skor?: number } }) {
  const teknikSkor = typeof risk.teknikSkor === "number" ? risk.teknikSkor : risk.skor ? Math.round(100 - risk.skor) : 50;
  const makroSkor = risk.makroRisk?.skor ?? 0;
  // Bilesik skor API'de harmanlaniyor (kademeli makro agirlik); client tekrar cap uygulamaz.
  const bilesikSkor = typeof risk.skor === "number" ? Math.round(100 - risk.skor) : teknikSkor;
  const makroKatki = typeof risk.makroKatki === "number" ? risk.makroKatki : Math.max(0, teknikSkor - bilesikSkor);
  return { bilesikSkor, teknikSkor, makroSkor, makroKatki };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState("");
  const [watchlistInput, setWatchlistInput] = useState("");
  const [watchlistInputAcik, setWatchlistInputAcik] = useState(false);
  const [fullName, setFullName] = useState("");
  const [piyasaOdagiTab, setPiyasaOdagiTab] = useState("one");
  const { piyasa, piyasaFlash, sparklines, topMovers, error: marketError, clearError: clearMarketError } = useDashboardMarket(Boolean(user));
  const { watchlist, recent, fiyatlar, error: watchlistError, priceError, clearError: clearWatchlistError, clearPriceError, setRecent, loadWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { portfoyOzet, error: portfolioError, clearError: clearPortfolioError, loadPortfolioSummary } = usePortfolioSummary();
  const [kapHaberler, setKapHaberler] = useState<{ ticker: string; title: string; time: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    fetch("/api/haberler", { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const haberler = (data.haberler || []).slice(0, 8).map((h: { ticker: string; baslik: string; tarih: string }) => ({
          ticker: h.ticker,
          title: h.baslik,
          time: new Date(h.tarih).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
        }));
        setKapHaberler(haberler);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [user]);

  const selamlama = () => {
    const saat = new Date().getHours();
    if (saat >= 5 && saat < 12) return "Günaydın";
    if (saat >= 12 && saat < 18) return "İyi günler";
    if (saat >= 18 && saat < 24) return "İyi akşamlar";
    return "İyi geceler";
  };
  const chart = useChartPanel();
  const { grafikTicker, grafikTickerLabel, initialGrafikLoadedRef, fetchBuyukGrafik } = chart;
  const [aiPanel, setAiPanel] = useState<{skor: number; teknikSkor?: number; makroSkor?: number; makroKatki?: number; seviye: string; yorum: string; guven: string; yukleniyor: boolean} | null>(null);

  const fetchAiPanel = useCallback(async (ticker?: string) => {
    const t = (ticker || grafikTicker).replace(".IS","").replace("=X","");
    const temiz = ticker ? t : grafikTickerLabel;
    setAiPanel({ skor: 0, seviye: "", yorum: "", guven: "", yukleniyor: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAiPanel({ skor: 50, seviye: "Orta", yorum: "Analiz için giriş gerekli.", guven: "Yetersiz", yukleniyor: false });
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
      const { bilesikSkor, teknikSkor, makroSkor, makroKatki } = aiPanelSkoruHesapla(risk);
      let skor = bilesikSkor;
      const analizMetin: string = yorumJson.analiz || "";
      const temizMetin = analizMetin.replace(/[#*]/g, "").trim();
      // Satırları gez, 30+ karakter olan ilk tam cümleyi al
      const satirlar = temizMetin.split("\n").map((s: string) => s.trim()).filter((s: string) => s.length > 30);
      const ilkSatir = satirlar[0] || temizMetin;
      const cumleMatch = ilkSatir.match(/^.+?\.(?=\s+[A-ZÇĞİÖŞÜ]|\s*$)|^.+?[!?]/);
      const ilkCumle = cumleMatch ? cumleMatch[0].trim() : ilkSatir;

      // === TUTARLILIK KONTROLÜ ===
      // Yorum metni bearish kelimeler içeriyorsa "Düşük Risk · Stabil" gösterilemez.
      // Skoru en fazla "Orta Risk" bandına (50-64) çek.
      const metinLower = temizMetin.toLocaleLowerCase("tr-TR");
      const bearishKelimeler = ["geriledi", "düştü", "düşüş", "düşerek", "zayıf", "zayıflama", "kayıp", "değer kaybı", "satış baskısı", "negatif", "kırıldı", "stop", "alt sınır", "destek altı", "panik", "sert düşüş", "ayı"];
      const bullishKelimeler = ["yükseldi", "yükseliş", "toparlandı", "tepki", "rallı", "ralli", "alım baskısı", "pozitif görünüm", "boğa"];
      const bearishHit = bearishKelimeler.some(k => metinLower.includes(k));
      const bullishHit = bullishKelimeler.some(k => metinLower.includes(k));
      if (bearishHit && !bullishHit && skor >= 65) skor = Math.min(skor, 58);
      if (bullishHit && !bearishHit && skor <= 35) skor = Math.max(skor, 42);

      const makroOzet = risk.makroRisk?.skor >= 65
        ? `Teknik skor ${teknikSkor}; ancak ${risk.makroRisk.seviye.toLocaleLowerCase("tr-TR")} makro risk bileşik görünümü baskılıyor.`
        : "";
      const yorumKaynak = makroOzet || ilkCumle;
      const yorum = yorumKaynak.length > 150 ? yorumKaynak.slice(0, 147).trim() + "..." : yorumKaynak;

      // Veri güvenilirliği: 45+ gün veri -> Güvenilir, 25-44 -> Kısmi, <25 -> Yetersiz
      const veriSayisi: number = typeof risk.veriSayisi === "number" ? risk.veriSayisi : 0;
      const guven = veriSayisi >= 45 ? "Güvenilir" : veriSayisi >= 25 ? "Kısmi" : "Yetersiz";
      setAiPanel({ skor, teknikSkor, makroSkor, makroKatki, seviye: risk.seviyeTR || "Orta", yorum, guven, yukleniyor: false });
    } catch {
      setAiPanel({ skor: 50, seviye: "Orta", yorum: "Analiz alınamadı.", guven: "Yetersiz", yukleniyor: false });
    }
  }, [grafikTicker, grafikTickerLabel]);

  const router = useRouter();

  useEffect(() => {
    let canceled = false;

    const loadDashboard = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          "Oturum kontrolü zaman aşımına uğradı."
        );
        if (canceled) return;
        if (!session) {
          setLoading(false);
          router.replace("/login");
          return;
        }

        setUser(session.user);
        setFullName(session.user.user_metadata?.full_name || "");
        await Promise.allSettled([
          loadWatchlist(session.user.id),
          loadPortfolioSummary(),
        ]);
      } catch (error) {
        console.error("Dashboard oturum yükleme hatası:", error);
        if (!canceled) router.replace("/login");
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    void loadDashboard();
    return () => { canceled = true; };
  }, [loadPortfolioSummary, loadWatchlist, router]);

  useEffect(() => {
    if (loading || initialGrafikLoadedRef.current) return;
    initialGrafikLoadedRef.current = true;
    fetchBuyukGrafik("1d");
  }, [fetchBuyukGrafik, initialGrafikLoadedRef, loading]);

  function handleAnaliz() {
    if (!ticker.trim()) return;
    const t = ticker.trim().toUpperCase();
    const entry = { ticker: t, time: new Date().toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) };
    const updated = [entry, ...recent.filter((r) => r.ticker !== t)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem(LS.RECENT, JSON.stringify(updated));
    router.push(`/hisse/${t}`);
  }



  const firstName = fullName ? fullName.split(" ")[0] : user?.email?.split("@")[0] ?? "";
  const dashboardErrorToast =
    watchlistError ? { message: watchlistError, onClose: clearWatchlistError } :
    priceError ? { message: priceError, onClose: clearPriceError } :
    marketError ? { message: marketError, onClose: clearMarketError } :
    portfolioError ? { message: portfolioError, onClose: clearPortfolioError } :
    null;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1220" }}>
        <p style={{ color: "#475569", fontSize: 14 }}>{loading ? "Yükleniyor..." : "Giriş sayfasına yönlendiriliyor..."}</p>
      </div>
    );
  }

  return (
    <AppShell>
    {dashboardErrorToast && <Toast message={dashboardErrorToast.message} ton="error" onClose={dashboardErrorToast.onClose} />}
    <div style={{ background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)", minHeight: "100vh" }}>
      <style>{`.g-tooltip-wrap:hover .g-tooltip { opacity: 1 !important; }
.dash-surface { border-radius: 10px; transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease; }
        .dash-surface:hover { border-color: rgba(59,130,246,0.18) !important; background: rgba(15,23,42,0.58) !important; box-shadow: 0 8px 24px rgba(2,6,23,0.14); }
        .dash-search-box:focus-within { border-color: rgba(59,130,246,0.42) !important; background: rgba(59,130,246,0.075) !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.08); }
        .dash-search-submit { transition: transform 0.14s ease, filter 0.14s ease, box-shadow 0.14s ease; }
        .dash-search-submit:hover { filter: brightness(1.08); box-shadow: 0 8px 20px rgba(37,99,235,0.22); transform: translateY(-1px); }
        .dash-main-padding { padding: 24px 32px; }
        .dash-main-grid { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 20px; align-items: start; }
        .dash-piyasa-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 8px; }
        .dash-grafik-ai-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(220px, 1fr); gap: 12px; }
        .dash-popular-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
        .dash-alt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dash-h1 { font-size: 26px; }
        .dash-piyasa-val { font-size: 22px; }
        @media (max-width: 1280px) {
          .dash-grafik-ai-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 1024px) {
          .dash-main-grid { grid-template-columns: 1fr !important; }
          .dash-piyasa-grid { grid-template-columns: repeat(2,1fr) !important; }
          .dash-popular-grid { grid-template-columns: repeat(4,1fr) !important; }
          .dash-grafik-ai-grid { grid-template-columns: minmax(0,2fr) minmax(220px,1fr) !important; }
        }
        @media (max-width: 767px) {
          .dash-main-padding { padding: 12px 14px !important; }
          .dash-grafik-ai-grid { grid-template-columns: 1fr !important; }
          .dash-popular-grid { grid-template-columns: repeat(2,1fr) !important; }
          .dash-alt-grid { grid-template-columns: 1fr !important; }
          .dash-h1 { font-size: 20px !important; }
          .dash-piyasa-val { font-size: 18px !important; }
          .dash-search-box { flex-wrap: wrap; gap: 10px !important; }
          .dash-search-field { order: 2; flex-basis: calc(100% - 28px); }
          .dash-search-submit { order: 3; width: 100%; }
        }
        @media (max-width: 479px) {
          .dash-piyasa-grid { grid-template-columns: 1fr !important; }
          .dash-popular-grid { grid-template-columns: 1fr !important; }
        }`}</style>

      <main className="dash-main-padding" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <div className="dash-main-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <h1 className="dash-h1 font-[family-name:var(--font-geist)] font-bold tracking-tight text-slate-50">{selamlama()}, {firstName}</h1>

        <DashboardSearchBox
          value={ticker}
          onValueChange={setTicker}
          bistHisseler={BIST_HISSELER}
          watchlist={watchlist}
          fiyatlar={fiyatlar}
          onAddToWatchlist={addToWatchlist}
          onRemoveFromWatchlist={removeFromWatchlist}
          onSubmit={handleAnaliz}
          onSelectHisse={(t) => router.push(`/hisse/${t}`)}
        />

        {/* Piyasa Özeti */}
        <DashboardMarketSummary piyasa={piyasa} sparklines={sparklines} flash={piyasaFlash} />

        {/* Piyasa Grafiği + AI Panel */}
        <div className="dash-grafik-ai-grid" style={{ marginTop: 4, alignItems: "stretch" }}>
        <DashboardChartPanel bistHisseler={BIST_HISSELER} chart={chart} />

        {/* AI Panel */}
        <DashboardAiPanel aiPanel={aiPanel} onAnalyze={() => fetchAiPanel()} />
        </div>

        <DashboardMarketRegime />

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
          kap={kapHaberler}
        />
        </div>

      </main>
    </div>
    <DashboardFooter />
    </AppShell>
  );
}
