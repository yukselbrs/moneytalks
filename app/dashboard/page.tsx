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

const KAP = [
  { ticker: "THYAO", title: "Esas Sözleşme Tadili", time: "15:56" },
  { ticker: "TKNSA", title: "Pay Bazında Devre Kesici Bildirimi", time: "15:56" },
  { ticker: "AKBNK", title: "Yabancı Yatırımcı İşlemleri", time: "15:51" },
];

type PiyasaKey = "xu100" | "xu030" | "usd" | "eur";
type PiyasaYon = "up" | "down";

function parsePiyasaDeger(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState("");
  const [aramaOneri, setAramaOneri] = useState<DashboardHisse[]>([]);
  const [inputReady, setInputReady] = useState(false);
  const [watchlistInput, setWatchlistInput] = useState("");
  const [watchlistInputAcik, setWatchlistInputAcik] = useState(false);
  const [recent, setRecent] = useState<{ ticker: string; time: string }[]>([]);
  const [watchlist, setWatchlist] = useState<{ ticker: string }[]>([]);
  const [fullName, setFullName] = useState("");
  const [piyasa, setPiyasa] = useState(() => { try { const c = localStorage.getItem("pk_piyasa"); return c ? JSON.parse(c) : { usd: { value: "-", change: "-" }, eur: { value: "-", change: "-" }, xu100: { value: "-", change: "-" }, xu030: { value: "-", change: "-" } }; } catch { return { usd: { value: "-", change: "-" }, eur: { value: "-", change: "-" }, xu100: { value: "-", change: "-" }, xu030: { value: "-", change: "-" } }; } });
  const piyasaRef = useRef(piyasa);
  const piyasaFlashTimeoutRef = useRef<Record<PiyasaKey, ReturnType<typeof setTimeout> | null>>({ xu100: null, xu030: null, usd: null, eur: null });
  const [piyasaFlash, setPiyasaFlash] = useState<Partial<Record<PiyasaKey, PiyasaYon>>>({});
  const [fiyatlar, setFiyatlar] = useState<Record<string, { fiyat: string; degisim: string; yukselis: boolean } | null>>({});
  const [topMovers, setTopMovers] = useState<{yukselenler: {ticker:string;fiyat:string;degisim:number}[]; dusenler: {ticker:string;fiyat:string;degisim:number}[]; hacimliler: {ticker:string;fiyat:string;degisim:number}[]}|null>(null);
  const [piyasaOdagiTab, setPiyasaOdagiTab] = useState("one");

  const selamlama = () => {
    const saat = new Date().getHours();
    if (saat >= 5 && saat < 12) return "Günaydın";
    if (saat >= 12 && saat < 18) return "İyi günler";
    if (saat >= 18 && saat < 24) return "İyi akşamlar";
    return "İyi geceler";
  };
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [buyukGrafik, setBuyukGrafik] = useState<{tarih: string; fiyat: number}[]>([]);
  const [grafikRange, setGrafikRange] = useState("1d");
  const [grafikRangeDegisim, setGrafikRangeDegisim] = useState<Record<string, number>>({});
  const [grafikYukleniyor, setGrafikYukleniyor] = useState(false);
  const [grafikTicker, setGrafikTicker] = useState("XU100.IS");
  const [grafikTickerLabel, setGrafikTickerLabel] = useState("XU100");
  const [grafikArama, setGrafikArama] = useState("");
  const [grafikDropdown, setGrafikDropdown] = useState(false);
  const [aiPanel, setAiPanel] = useState<{skor: number; seviye: string; yorum: string; guven: string; yukleniyor: boolean} | null>(null);
  const [portfoyOzet, setPortfoyOzet] = useState<{toplamMaliyet: number; toplamGuncel: number; toplamPL: number; toplamPLYuzde: number; hisseSayisi: number; hisseDagilim?: {ticker: string; yuzde: number; renk: string}[]} | null>(null);
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
      const satirlar = analizMetin.split("\n")
        .map((s: string) => s.replace(/[#*]/g, "").trim())
        .filter((s: string) => s.length > 20 && !s.toUpperCase().includes("PROFİL") && !s.toUpperCase().includes("ANALİZ") && !s.toUpperCase().includes("ENDEKS"));
      const yorum = satirlar[0] ? (satirlar[0].length > 150 ? satirlar[0].slice(0, 150) + "..." : satirlar[0]) : "Analiz yükleniyor...";
      const guven = risk.seviyeTR === "Düşük" ? "Yüksek" : risk.seviyeTR === "Orta" ? "Orta" : "Düşük";
      setAiPanel({ skor, seviye: risk.seviyeTR || "Orta", yorum, guven, yukleniyor: false });
    } catch {
      setAiPanel({ skor: 50, seviye: "Orta", yorum: "Analiz alınamadı.", guven: "Düşük", yukleniyor: false });
    }
  }, [grafikTicker, grafikTickerLabel]);

  const router = useRouter();
  const watchlistRef = useRef<{ticker:string}[]>([]);

  useEffect(() => {
    const piyasaFlashTimeouts = piyasaFlashTimeoutRef.current;
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

      // Portföy özeti
      try {
        const { data: portfoyData } = await supabase
          .from("portfoy")
          .select("ticker, adet, maliyet");
        if (portfoyData && portfoyData.length > 0) {
          const tickers = portfoyData.map((p: {ticker: string}) => p.ticker.trim()).join(",");
          const fRes = await fetch("/api/fiyatlar?extra=" + tickers);
          const fJson = await fRes.json();
          let toplamMaliyet = 0, toplamGuncel = 0;
          portfoyData.forEach((p: {ticker: string; adet: number; maliyet: number}) => {
            const mal = p.adet * p.maliyet;
            toplamMaliyet += mal;
            const fiyatStr = fJson[p.ticker.trim()]?.fiyat;
            const fiyat = fiyatStr ? parseFloat(fiyatStr.replace(/\./g, "").replace(",", ".")) : p.maliyet;
            toplamGuncel += p.adet * fiyat;
          });
          const toplamPL = toplamGuncel - toplamMaliyet;
          const toplamPLYuzde = toplamMaliyet > 0 ? (toplamPL / toplamMaliyet) * 100 : 0;
          const RENK = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#06B6D4","#EC4899","#F97316"];
          const hisseDagilim = portfoyData.map((p: {ticker: string; adet: number; maliyet: number}, idx: number) => {
            const fs = fJson[p.ticker.trim()]?.fiyat;
            const fiyat = fs ? parseFloat(fs.replace(/\./g,"").replace(",",".")) : p.maliyet;
            return { ticker: p.ticker.trim(), deger: p.adet * fiyat, yuzde: 0, renk: RENK[idx % RENK.length] };
          }).sort((a: {deger: number}, b: {deger: number}) => b.deger - a.deger)
            .map((h: {ticker: string; deger: number; yuzde: number; renk: string}) => ({ ...h, yuzde: toplamGuncel > 0 ? (h.deger / toplamGuncel) * 100 : 0 }));
          setPortfoyOzet({ toplamMaliyet, toplamGuncel, toplamPL, toplamPLYuzde, hisseSayisi: portfoyData.length, hisseDagilim });
        }
      } catch(e) { console.error("Portfoy ozet hatasi:", e); }

    });
    const fetchPiyasaOzeti = async () => {
      try {
        const r = await fetch("/api/piyasa", { cache: "no-store" });
        const d = await r.json();
        (["xu100", "xu030", "usd", "eur"] as PiyasaKey[]).forEach((key) => {
          const onceki = parsePiyasaDeger(piyasaRef.current[key]?.value || "-");
          const yeni = parsePiyasaDeger(d[key]?.value || "-");
          if (onceki === null || yeni === null || onceki === yeni) return;
          if (piyasaFlashTimeouts[key]) clearTimeout(piyasaFlashTimeouts[key]!);
          setPiyasaFlash((prev) => ({ ...prev, [key]: yeni > onceki ? "up" : "down" }));
          piyasaFlashTimeouts[key] = setTimeout(() => {
            setPiyasaFlash((prev) => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
            piyasaFlashTimeouts[key] = null;
          }, 550);
        });
        piyasaRef.current = d;
        setPiyasa(d);
        try { localStorage.setItem("pk_piyasa", JSON.stringify(d)); } catch {}
      } catch {}
    };
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
    const fetchFiyatlar = (extraList?: string[]) => {
      const wl = extraList || watchlistRef.current.map(w => w.ticker);
      const extra = wl.join(",");
      const url = extra ? `/api/fiyatlar?extra=${extra}` : "/api/fiyatlar";
      fetch(url).then(r => r.json()).then(d => setFiyatlar(d)).catch(() => {});
    };
    const fetchPiyasa = async () => {
      try {
        const [yukRes, dusRes, hacimRes] = await Promise.all([
          fetch("/api/hisseler?sort=yukselis&page=1"),
          fetch("/api/hisseler?sort=dusus&page=1"),
          fetch("/api/hisseler?sort=hacim&page=1"),
        ]);
        const yukJson = await yukRes.json();
        const dusJson = await dusRes.json();
        const hacimJson = await hacimRes.json();
        const mapH = (h: {ticker:string;fiyat:string|number;degisim:string|number}) => ({
          ticker: h.ticker,
          fiyat: typeof h.fiyat === "number" ? h.fiyat.toLocaleString("tr-TR", {minimumFractionDigits:2}) : String(h.fiyat),
          degisim: parseFloat(String(h.degisim)),
        });
        const yukselenler = (yukJson.items || []).slice(0, 5).map(mapH);
        const dusenler = (dusJson.items || []).slice(0, 5).map(mapH);
        const hacimliler = (hacimJson.items || []).slice(0, 5).map(mapH);
        setTopMovers({ yukselenler, dusenler, hacimliler });
      } catch(e) { console.error("fetchPiyasa err:", e); }
    };
    fetchPiyasaOzeti();
    fetchPiyasa();
    fetchSparklines();
    const piyasaOzetiInterval = setInterval(fetchPiyasaOzeti, 3000);
    const piyasaInterval = setInterval(fetchPiyasa, 300000);
    const fiyatlarInterval = setInterval(fetchFiyatlar, 5000);
    const sparklineInterval = setInterval(fetchSparklines, 60000);
    const loadRecent = () => {
      const stored = localStorage.getItem("pk_recent");
      if (stored) setRecent(JSON.parse(stored));
    };
    loadRecent();
    window.addEventListener("focus", loadRecent);
    return () => {
      clearInterval(piyasaOzetiInterval);
      clearInterval(piyasaInterval);
      clearInterval(fiyatlarInterval);
      clearInterval(sparklineInterval);
      (["xu100", "xu030", "usd", "eur"] as PiyasaKey[]).forEach((key) => {
        if (piyasaFlashTimeouts[key]) clearTimeout(piyasaFlashTimeouts[key]!);
      });
      window.removeEventListener("focus", loadRecent);
    };
  }, [router]);

  useEffect(() => {
    if (loading || initialGrafikLoadedRef.current) return;
    initialGrafikLoadedRef.current = true;
    fetchBuyukGrafik("1d");
  }, [fetchBuyukGrafik, loading]);

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
          kap={KAP}
          goToHisse={(t) => router.push(`/hisse/${t}`)}
        />
        </div>

      </main>
    </div>
    <div style={{ textAlign: "center", padding: "24px 0 8px", borderTop: "1px solid rgba(59,130,246,0.06)", marginTop: 32 }}>
        {[
          { label: "Gizlilik Politikası", href: "/gizlilik" },
          { label: "Kullanım Şartları", href: "/kullanim-sartlari" },
          { label: "KVKK", href: "/kvkk" },
          { label: "Risk Uyarısı", href: "/risk-uyarisi" },
        ].map(({ label, href }, i, arr) => (
          <span key={label}>
            <a href={href} style={{ fontSize: 11, color: "#475569", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#94A3B8")}
              onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>
              {label}
            </a>
            {i < arr.length - 1 && <span style={{ color: "#334155", margin: "0 8px" }}>·</span>}
          </span>
        ))}
        <p style={{ fontSize: 10, color: "#334155", marginTop: 8, lineHeight: 1.6 }}>
          ParaKonuşur yatırım danışmanlığı hizmeti sunmamaktadır. İçerikler yalnızca bilgilendirme amaçlıdır.
        </p>
        <p style={{ fontSize: 10, color: "#334155", marginTop: 4, lineHeight: 1.6 }}>
          Veriler 15 dakika gecikmeli olarak sunulmaktadır.
        </p>
      </div>
    </AppShell>
  );
}
