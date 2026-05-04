"use client";

import React, { useEffect, useRef, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import AppShell from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import RiskProfilWidget from "@/components/RiskProfilWidget";
import StockLogo from "@/components/StockLogo";

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
  const [piyasaFiyatlari, setPiyasaFiyatlari] = useState<Record<string, { fiyat: string; degisim: string; yukselis: boolean } | null>>({});
  const [topMovers, setTopMovers] = useState<{yukselenler: {ticker:string;fiyat:string;degisim:number}[]; dusenler: {ticker:string;fiyat:string;degisim:number}[]; hacimliler: {ticker:string;fiyat:string;degisim:number}[]}|null>(null);
  const [bildirimAcik, setBildirimAcik] = useState(false);
  const [piyasaOdagiTab, setPiyasaOdagiTab] = useState("one");

  useEffect(() => {
    const guncelle = () => {
      const d = new Date();
      const nd = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", weekday: "long" });
      const nt = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
      setNow(`${nd} · ${nt}`);
    };
    guncelle();
    const interval = setInterval(guncelle, 60000);
    return () => clearInterval(interval);
  }, []);

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
  const [grafikYukleniyor, setGrafikYukleniyor] = useState(false);
  const [grafikTicker, setGrafikTicker] = useState("XU100.IS");
  const [grafikTickerLabel, setGrafikTickerLabel] = useState("XU100");
  const [grafikArama, setGrafikArama] = useState("");
  const [grafikDropdown, setGrafikDropdown] = useState(false);
  const [aiPanel, setAiPanel] = useState<{skor: number; seviye: string; yorum: string; guven: string; yukleniyor: boolean} | null>(null);
  const [portfoyOzet, setPortfoyOzet] = useState<{toplamMaliyet: number; toplamGuncel: number; toplamPL: number; toplamPLYuzde: number; hisseSayisi: number; hisseDagilim?: {ticker: string; yuzde: number; renk: string}[]} | null>(null);
  const grafikRef = useRef<HTMLDivElement>(null);
  const grafikObserverRef = useRef<ResizeObserver | null>(null);
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
      if (d.points) setBuyukGrafik(d.points);
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

  const bildirimler = [
    { zaman: "09:55", mesaj: `XU100 güne %${piyasa.xu100.change} ile başladı.`, tip: piyasa.xu100.change.startsWith("%-") ? "dusus" : "yukselis" },
    { zaman: "Dün 18:05", mesaj: "THYAO izleme listenizdeki hisse yeni bir KAP bildirimi yayınladı.", tip: "haber" },
    { zaman: "Dün 09:55", mesaj: "XU100 günü %-0,71 düşüşle kapattı.", tip: "dusus" },
  ];
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
      fetchBuyukGrafik("1d");

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
  const [now, setNow] = useState("");

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
        }`}</style>

      <main className="dash-main-padding" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <div className="dash-main-grid" style={{}}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {/* Header */}
        <h1 className="dash-h1" style={{ fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.5px" }}>{selamlama()}, {firstName}</h1>

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
                  <div onMouseDown={() => { setTicker(h.ticker); setAramaOneri([]); router.push(`/hisse/${h.ticker}`); }} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <StockLogo ticker={h.ticker} domain={h.domain} size={28} radius={6} color={tickerRenk(h.ticker)} />
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Piyasa Özeti</p>
            {(() => {
              const simdi = new Date();
              const trSaat = new Date(simdi.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
              const saat = trSaat.getHours();
              const dakika = trSaat.getMinutes();
              const gun = trSaat.getDay();
              const zamanDk = saat * 60 + dakika;
              const acik = gun >= 1 && gun <= 5 && zamanDk >= 10 * 60 && zamanDk < 18 * 60 + 15;
              return (
                <span style={{ fontSize: 10, fontWeight: 700, color: acik ? "#10B981" : "#EF4444", background: acik ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${acik ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.04em" }}>
                  {acik ? "● AÇIK" : "● KAPALI"}
                </span>
              );
            })()}
          </div>
          <div className="dash-piyasa-grid">
            {[
              { key: "xu100" as const, label: "XU100", val: piyasa.xu100.value, change: piyasa.xu100.change, up: !piyasa.xu100.change.startsWith("%-") && piyasa.xu100.change !== "-", gecikme: true },
              { key: "xu030" as const, label: "XU030", val: piyasa.xu030.value, change: piyasa.xu030.change, up: !piyasa.xu030.change.startsWith("%-") && piyasa.xu030.change !== "-", gecikme: true },
              { key: "usd" as const, label: "USD/TRY", val: piyasa.usd.value, change: piyasa.usd.change, up: !piyasa.usd.change.startsWith("%-") && piyasa.usd.change !== "-" },
              { key: "eur" as const, label: "EUR/TRY", val: piyasa.eur.value, change: piyasa.eur.change, up: !piyasa.eur.change.startsWith("%-") && piyasa.eur.change !== "-" },
            ].map((e) => {
              const color = e.up ? "#10B981" : "#EF4444";
              const bgColor = e.up ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)";
              const flash = piyasaFlash[e.key];
              const flashBg = flash === "up" ? "rgba(16,185,129,0.16)" : flash === "down" ? "rgba(239,68,68,0.16)" : "#0B1220";
              const flashBorder = flash === "up" ? "rgba(16,185,129,0.42)" : flash === "down" ? "rgba(239,68,68,0.42)" : "rgba(255,255,255,0.06)";
              // Gercek sparkline veya fallback
              const rawPts = sparklines[e.label] || [];
              const pts = rawPts.length > 1 ? rawPts : [];
              const w = 90, h = 36;
              const mn = pts.length > 1 ? Math.min(...pts) : 0;
              const mx = pts.length > 1 ? Math.max(...pts) : 1;
              const sx = (i: number) => (i / (pts.length - 1)) * w;
              const sy = (v: number) => h - ((v - mn) / (mx - mn + 1)) * h;
              const d = pts.length > 1 ? pts.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(v)}`).join(" ") : "";
              const area = d ? d + ` L ${w} ${h} L 0 ${h} Z` : "";
              return (
                <div key={e.label} style={{ background: flashBg, border: `1px solid ${flashBorder}`, boxShadow: flash ? `0 0 0 1px ${flashBorder}, 0 0 22px ${flash === "up" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)"}` : "none", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4, position: "relative", overflow: "hidden", transition: "background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>{e.label}</span>
                    {e.gecikme && (
                      <span style={{ position: "relative", display: "inline-flex" }} className="g-tooltip-wrap">
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#F97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 3, padding: "1px 5px", lineHeight: 1.4, cursor: "default" }}>G</span>
                        <span style={{ position: "fixed", background: "#1E293B", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap", padding: "4px 8px", borderRadius: 5, pointerEvents: "none", opacity: 0, transition: "opacity 0.15s", transform: "translateY(-28px)", zIndex: 9999 }} className="g-tooltip">15 dk gecikmeli</span>
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
                    <div>
                      {e.val === "-" ? (
                        <>
                          <div style={{ width: 110, height: 24, borderRadius: 6, background: "linear-gradient(90deg,#1E293B 25%,#2D3F55 50%,#1E293B 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", marginBottom: 8 }} />
                          <div style={{ width: 64, height: 14, borderRadius: 4, background: "linear-gradient(90deg,#1E293B 25%,#2D3F55 50%,#1E293B 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                        </>
                      ) : (
                        <>
                          <div className="dash-piyasa-val" style={{ fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.8px", lineHeight: 1.2 }}>{e.val}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color, display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                            <span>{e.up ? "▲" : "▼"}</span>
                            <span>{e.change}</span>
                          </div>
                        </>
                      )}
                    </div>
                    <svg width="90" height="36" viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
                      <defs>
                        <linearGradient id={`sg-${e.label}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
                          <stop offset="100%" stopColor={color} stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      {area && <path d={area} fill={`url(#sg-${e.label})`}/>}
                      {d && <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Piyasa Grafiği + AI Panel */}
        <div className="dash-grafik-ai-grid" style={{ marginTop: 4, alignItems: "stretch" }}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>Piyasa Grafiği</p>
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
          <div ref={setGrafikContainerRef} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12, padding: "16px 8px 8px 0", position: "relative", height: 280, minWidth: 0, boxSizing: "border-box" }}>
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
              return grafikWidth > 0 ? (
                  <AreaChart width={grafikWidth} height={256} data={buyukGrafik} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
              ) : null;
            })()}
          </div>
        </div>

        {/* AI Panel */}
        <div style={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 12, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 0, minHeight: 280 }}>
          {/* Başlık */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase" }}>Yapay Zekâ Analizi</p>
            <button onClick={() => fetchAiPanel()}
              style={{ fontSize: 10, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 20, padding: "3px 12px", cursor: "pointer" }}>
              ↻ Yeni
            </button>
          </div>

          {aiPanel?.yukleniyor ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "24px 0" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(59,130,246,0.2)", borderTopColor: "#3B82F6", animation: "spin 0.8s linear infinite" }}/>
              <span style={{ fontSize: 11, color: "#334155" }}>Analiz yapılıyor...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            </div>
          ) : aiPanel ? (
            <>
              {/* Yatay layout: sol skor, sağ bilgi */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                {/* Skor dairesi */}
                <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
                  <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, transform: "rotate(-90deg)" }}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7"/>
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={aiPanel.skor >= 65 ? "#10B981" : aiPanel.skor >= 45 ? "#F59E0B" : "#EF4444"}
                      strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={`${(aiPanel.skor / 100) * 263.9} 263.9`}
                      style={{ filter: `drop-shadow(0 0 5px ${aiPanel.skor >= 65 ? "#10B981" : aiPanel.skor >= 45 ? "#F59E0B" : "#EF4444"}88)` }}/>
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-1.2px" }}>{aiPanel.skor}</span>
                    <span style={{ fontSize: 9, color: "#64748B", fontWeight: 600 }}>AI Skoru</span>
                  </div>
                </div>
                {/* Sağ bilgi */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: aiPanel.skor >= 65 ? "#10B981" : aiPanel.skor >= 45 ? "#F59E0B" : "#EF4444", marginBottom: 6, letterSpacing: "-0.3px" }}>
                    {aiPanel.skor >= 65 ? "Güçlü Görünüm" : aiPanel.skor >= 55 ? "Olumlu Görünüm" : aiPanel.skor >= 45 ? "Nötr Görünüm" : aiPanel.skor >= 35 ? "Zayıf Görünüm" : "Olumsuz Görünüm"}
                  </p>
                  <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>{aiPanel.yorum}</p>
                  <p style={{ fontSize: 10, color: "#334155", marginTop: 6 }}>
                    Güven: <span style={{ color: aiPanel.guven === "Yüksek" ? "#10B981" : aiPanel.guven === "Orta" ? "#F59E0B" : "#EF4444", fontWeight: 600 }}>{aiPanel.guven}</span>
                  </p>
                </div>
              </div>

              {/* Alt buton - Pro kilitli */}
              <div style={{ position: "relative", marginTop: "auto" }} className="pro-btn-wrap">
                <a
                  href="/pro"
                  style={{ width: "100%", padding: "9px 0", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 8, fontSize: 12, fontWeight: 500, color: "#F97316", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(249,115,22,0.12)"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(249,115,22,0.06)"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.2)"; }}>
                  ⚡ Pro&apos;ya Yükselt
                </a>
                <div className="pro-tooltip" style={{ display: "none", position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1E293B", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#F97316", whiteSpace: "nowrap", zIndex: 50 }}>
                  Sınırsız analiz ve gerçek zamanlı veriler
                </div>
              </div>
              <style>{`.pro-btn-wrap:hover .pro-tooltip { display: block !important; }`}</style>
              <p style={{ fontSize: 9, color: "#334155", marginTop: 6, textAlign: "center", lineHeight: 1.5 }}>
                Yatırım tavsiyesi değildir. Yalnızca teknik veri analizidir.
              </p>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "32px 16px" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🤖</div>
              <p style={{ fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 1.6 }}>Piyasa analizi için<br/>aşağıya tıklayın</p>
              <button onClick={() => fetchAiPanel()}
                style={{ padding: "9px 24px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>
                ✦ Analiz Et
              </button>
              <p style={{ fontSize: 9, color: "#334155", textAlign: "center", lineHeight: 1.5 }}>Yatırım tavsiyesi değildir.</p>
            </div>
          )}
        </div>
        </div>

        {/* Piyasa Odakları */}
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.4px", marginBottom: 2 }}>Piyasa Odakları</h2>
              <p style={{ fontSize: 12, color: "#475569" }}>BIST'te bugün öne çıkan hisseler.</p>
            </div>
            <a href="/hisseler" style={{ fontSize: 13, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 8, padding: "7px 14px", textDecoration: "none", whiteSpace: "nowrap" }}>
              Tüm Hisseler →
            </a>
          </div>

          {/* Tab bar */}
          {(() => {
            const [piyasaTab, setPiyasaTab] = [piyasaOdagiTab, setPiyasaOdagiTab];
            const tabs = [
              { key: "one", label: "Öne Çıkanlar" },
              { key: "yukselenler", label: "Yükselenler" },
              { key: "dusenler", label: "Düşenler" },
              { key: "hacim", label: "En Yüksek Hacim" },
            ];
            const liste = piyasaTab === "yukselenler"
              ? (topMovers?.yukselenler || []).map(h => ({ ticker: h.ticker, fiyat: h.fiyat, degisim: h.degisim, yukselis: h.degisim >= 0 }))
              : piyasaTab === "dusenler"
              ? (topMovers?.dusenler || []).map(h => ({ ticker: h.ticker, fiyat: h.fiyat, degisim: h.degisim, yukselis: h.degisim >= 0 }))
              : piyasaTab === "hacim"
              ? (topMovers?.hacimliler || []).map(h => ({ ticker: h.ticker, fiyat: h.fiyat, degisim: h.degisim, yukselis: h.degisim >= 0 }))
              : POPULAR.slice(0, 5).map(s => ({ ticker: s.ticker, fiyat: fiyatlar[s.ticker]?.fiyat || "—", degisim: Number(fiyatlar[s.ticker]?.degisim || 0), yukselis: fiyatlar[s.ticker]?.yukselis ?? true }));

            return (
              <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.08)", flexWrap: "wrap" }}>
                  {tabs.map(t => (
                    <button key={t.key} onClick={() => setPiyasaTab(t.key)}
                      style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 20, border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                        background: piyasaTab === t.key ? "#3B82F6" : "transparent",
                        color: piyasaTab === t.key ? "#fff" : "#64748B",
                        borderColor: piyasaTab === t.key ? "#3B82F6" : "rgba(255,255,255,0.08)" }}>
                      {t.label}
                    </button>
                  ))}
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "#334155" }}>15 dk gecikmeli</span>
                </div>
                {liste.map((s, i) => {
                  const h = BIST_HISSELER.find(b => b.ticker === s.ticker);
                  const izlemede = watchlist.find(w => w.ticker === s.ticker);
                  return (
                    <div key={s.ticker} onClick={() => router.push(`/hisse/${s.ticker}`)}
                      style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto 44px", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < liste.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none", cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <StockLogo ticker={s.ticker} domain={h?.domain} size={40} radius={10} color={tickerRenk(s.ticker)} />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.3px" }}>{s.ticker}</div>
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{h?.name || s.ticker}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#334155", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 2 }}>FİYAT</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.3px" }}>{s.fiyat} ₺</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#334155", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 2 }}>GÜNLÜK</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: s.yukselis ? "#10B981" : "#EF4444", display: "flex", alignItems: "center", gap: 3 }}>
                          <span>{s.yukselis ? "▲" : "▼"}</span>
                          <span>{s.yukselis ? "%" : "%-"}{Math.abs(Number(s.degisim)).toFixed(2).replace(".", ",")}</span>
                        </div>
                      </div>
                      <button onClick={ev => { ev.stopPropagation(); izlemede ? removeFromWatchlist(s.ticker) : addToWatchlist(s.ticker); }}
                        style={{ width: 36, height: 36, borderRadius: 8, background: izlemede ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${izlemede ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: izlemede ? "#3B82F6" : "#334155" }}>
                        {izlemede ? "★" : "☆"}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* İzleme Listem */}
        <div style={{ border: "1px solid rgba(59,130,246,0.1)", borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
          {/* Header */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>İzleme Listem</span>
            <button onClick={() => { setWatchlistInputAcik(!watchlistInputAcik); setWatchlistInput(""); }}
              style={{ fontSize: 16, color: watchlistInputAcik ? "#94A3B8" : "#3B82F6", background: "none", border: "none", cursor: "pointer", lineHeight: 1, fontWeight: 300 }}>
              {watchlistInputAcik ? "✕" : "+"}
            </button>
          </div>

          {/* Input */}
          {watchlistInputAcik && (
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", gap: 6 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input autoFocus autoComplete="off" value={watchlistInput}
                  onChange={e => setWatchlistInput(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === "Enter" && watchlistInput.trim()) { addToWatchlist(watchlistInput.trim()); setWatchlistInput(""); setWatchlistInputAcik(false); } if (e.key === "Escape") { setWatchlistInputAcik(false); setWatchlistInput(""); } }}
                  placeholder="THYAO"
                  style={{ width: "100%", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#E2E8F0", outline: "none" }} />
                {watchlistInput.length > 0 && (() => {
                  const q = watchlistInput.toUpperCase();
                  const filtered = BIST_HISSELER.filter(h => h.ticker.startsWith(q) || h.name.toUpperCase().startsWith(q)).slice(0, 5);
                  return filtered.length > 0 ? (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, zIndex: 100, overflow: "hidden" }}>
                      {filtered.map(h => (
                        <div key={h.ticker} onMouseDown={() => { addToWatchlist(h.ticker); setWatchlistInput(""); setWatchlistInputAcik(false); }}
                          style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.08)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{h.ticker}</span>
                          <span style={{ fontSize: 11, color: "#475569" }}>{h.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <button onMouseDown={() => { if (watchlistInput.trim()) { addToWatchlist(watchlistInput.trim()); setWatchlistInput(""); setWatchlistInputAcik(false); } }}
                style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#3B82F6", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Ekle</button>
            </div>
          )}

          {/* İstatistik Barı */}
          {watchlist.length > 0 && (() => {
            const enIyi = watchlist.reduce((best, w) => {
              const d = Number(fiyatlar[w.ticker]?.degisim || 0);
              return d > Number(fiyatlar[best?.ticker]?.degisim || -Infinity) ? w : best;
            }, watchlist[0]);
            const riskler = watchlist.map(w => fiyatlar[w.ticker]?.yukselis ? 1 : -1);
            const netRisk = riskler.reduce((a, b) => a + b, 0);
            const degisimler = watchlist.map(w => Number(fiyatlar[w.ticker]?.degisim || 0)).filter(d => d !== 0);
            const ortDegisim = degisimler.length > 0 ? degisimler.reduce((a, b) => a + b, 0) / degisimler.length : 0;
            const ortRenk = ortDegisim >= 0 ? "#10B981" : "#EF4444";
            const ortLabel = `${ortDegisim >= 0 ? "%" : "%-"}${Math.abs(ortDegisim).toFixed(2).replace(".", ",")}`;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                {[
                  { label: "TOPLAM", value: `${watchlist.length} hisse`, renk: "#E2E8F0" },
                  { label: "GÜNÜN EN İYİSİ", value: enIyi?.ticker || "—", renk: "#10B981" },
                  { label: "ORT. DEĞİŞİM", value: ortLabel, renk: ortRenk },
                ].map((s, i) => (
                  <div key={i} style={{ padding: "12px 16px", borderRight: i < 2 ? "1px solid rgba(59,130,246,0.06)" : "none" }}>
                    <div style={{ fontSize: 9, color: "#475569", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: s.renk }}>{s.value}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Liste */}
          {watchlist.length === 0 ? (
            <div style={{ padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 28 }}>☆</div>
              <p style={{ fontSize: 13, color: "#475569", textAlign: "center" }}>Henüz hisse eklemediniz</p>
              <p style={{ fontSize: 11, color: "#334155", textAlign: "center" }}>Hisse sayfalarındaki yıldız ikonuna tıklayın</p>
            </div>
          ) : (
            watchlist.map((w, i) => {
              const h = BIST_HISSELER.find(b => b.ticker === w.ticker);
              const f = fiyatlar[w.ticker];
              return (
                <div key={w.ticker} onClick={() => router.push(`/hisse/${w.ticker}`)}
                  style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto 36px", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < watchlist.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none", cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <StockLogo ticker={w.ticker} domain={h?.domain} size={40} radius={10} color={tickerRenk(w.ticker)} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.2px" }}>{w.ticker}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{h?.name || w.ticker}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#334155", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 2 }}>FİYAT</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9" }}>{f?.fiyat || "—"} ₺</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#334155", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 2 }}>GÜNLÜK</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: f?.yukselis ? "#10B981" : "#EF4444", display: "flex", alignItems: "center", gap: 2 }}>
                      {f ? <><span>{f.yukselis ? "▲" : "▼"}</span><span>{f.yukselis ? "%" : "%-"}{Math.abs(Number(f.degisim)).toFixed(2).replace(".", ",")}</span></> : "—"}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeFromWatchlist(w.ticker); }}
                    style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#475569" }}>
                    ✕
                  </button>
                </div>
              );
            })
          )}

          {/* Son Analizler alt kısım */}
          <div style={{ borderTop: "1px solid rgba(59,130,246,0.08)", padding: "12px 16px 4px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>Son Analizlerim</div>
            {recent.length === 0 ? (
              <p style={{ fontSize: 12, color: "#1E293B", padding: "8px 0 12px" }}>Henüz analiz yapmadınız</p>
            ) : (
              recent.map((r, i) => {
                const h = BIST_HISSELER.find(b => b.ticker === r.ticker);
                return (
                  <div key={i} onClick={() => router.push(`/hisse/${r.ticker}`)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < recent.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none", cursor: "pointer" }}>
                    <StockLogo ticker={r.ticker} domain={h?.domain} size={32} radius={8} color={tickerRenk(r.ticker)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{r.ticker}</div>
                      <div style={{ fontSize: 10, color: "#475569" }}>{r.time}</div>
                    </div>
                    <span style={{ fontSize: 12, color: "#3B82F6" }}>→</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        </div>

        {/* SAĞ PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Portföy Özeti */}
        {portfoyOzet ? (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Portföy Özeti</span>
              <a href="/portfoy" style={{ fontSize: 10, color: "#3B82F6", textDecoration: "none" }}>Tümü →</a>
            </div>
            {/* Toplam Değer büyük */}
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: "#64748B", marginBottom: 4, fontWeight: 500 }}>Toplam Değer</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.8px" }}>
                {portfoyOzet.toplamGuncel.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: portfoyOzet.toplamPL >= 0 ? "#10B981" : "#EF4444", marginTop: 2 }}>
                {portfoyOzet.toplamPLYuzde >= 0 ? "%" : "%-"}{Math.abs(portfoyOzet.toplamPLYuzde).toFixed(2).replace(".", ",")} ({portfoyOzet.toplamPL >= 0 ? "+" : ""}{portfoyOzet.toplamPL.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺)
              </p>
            </div>
            {portfoyOzet?.hisseDagilim && portfoyOzet.hisseDagilim.length > 0 && (() => {
              const R = 36, cx = 46, cy = 46, sw = 10;
              const circ = 2 * Math.PI * R;
              let acc = 0;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <svg width="92" height="92" viewBox="0 0 92 92" style={{ flexShrink: 0 }}>
                    <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw}/>
                    {portfoyOzet.hisseDagilim!.map((h, i) => {
                      const dl = (h.yuzde / 100) * circ;
                      const el = <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={h.renk} strokeWidth={sw}
                        strokeDasharray={`${dl} ${circ - dl}`}
                        strokeDashoffset={circ * 0.25 - acc}
                        strokeLinecap="butt"/>;
                      acc += dl;
                      return el;
                    })}
                  </svg>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    {portfoyOzet.hisseDagilim!.slice(0, 3).map((h, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: h.renk }}/>
                          <span style={{ fontSize: 10, color: "#94A3B8" }}>{h.ticker}</span>
                        </div>
                        <span style={{ fontSize: 10, color: "#64748B" }}>%{h.yuzde.toFixed(1)}</span>
                      </div>
                    ))}
                    {portfoyOzet.hisseDagilim!.length > 3 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#475569" }}/>
                          <span style={{ fontSize: 10, color: "#94A3B8" }}>Diğer</span>
                        </div>
                        <span style={{ fontSize: 10, color: "#64748B" }}>%{portfoyOzet.hisseDagilim!.slice(3).reduce((a, h) => a + h.yuzde, 0).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "7px 10px" }}>
                <p style={{ fontSize: 9, color: "#475569", marginBottom: 2 }}>Ana Para</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#F1F5F9" }}>{portfoyOzet.toplamMaliyet.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "7px 10px" }}>
                <p style={{ fontSize: 9, color: "#475569", marginBottom: 2 }}>K/Z ₺</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: portfoyOzet.toplamPL >= 0 ? "#10B981" : "#EF4444" }} suppressHydrationWarning>
                  {portfoyOzet.toplamPL >= 0 ? "+" : ""}{portfoyOzet.toplamPL.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                </p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "7px 10px" }}>
                <p style={{ fontSize: 9, color: "#475569", marginBottom: 2 }}>Hisse</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#F1F5F9" }}>{portfoyOzet.hisseSayisi} hisse</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "7px 10px" }}>
                <p style={{ fontSize: 9, color: "#475569", marginBottom: 2 }}>Getiri</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: portfoyOzet.toplamPL >= 0 ? "#10B981" : "#EF4444" }} suppressHydrationWarning>
                  {portfoyOzet.toplamPLYuzde >= 0 ? "+" : ""}{portfoyOzet.toplamPLYuzde.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, padding: "20px 16px", marginBottom: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📊</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginBottom: 4 }}>Portföyünüzü Takip Edin</p>
              <p style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5 }}>Hisselerinizi ekleyin, kâr/zarar ve dağılımı anlık görün.</p>
            </div>
            <a href="/portfoy" style={{ display: "inline-block", background: "#3B82F6", color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>Portföy Oluştur →</a>
          </div>
        )}


          {/* En Çok Yükselenler / Düşenler */}
          {topMovers && (() => {
            const yukselenler = topMovers.yukselenler;
            const dusenler = topMovers.dusenler;
            return (
              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>En Çok Yükselenler</span>
                </div>
                {yukselenler.map((h, i) => (
                  <div key={h.ticker} onClick={() => router.push(`/hisse/${h.ticker}`)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: i < yukselenler.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none", cursor: "pointer" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.2px" }}>{h.ticker}</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500 }}>{h.fiyat} ₺</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#10B981" }}>▲ %{Math.abs(Number(h.degisim)).toFixed(2).replace(".", ",")}</div>
                    </div>
                  </div>
                ))}
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)", borderTop: "1px solid rgba(59,130,246,0.06)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>En Çok Düşenler</span>
                </div>
                {dusenler.map((h, i) => (
                  <div key={h.ticker} onClick={() => router.push(`/hisse/${h.ticker}`)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: i < dusenler.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none", cursor: "pointer" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.2px" }}>{h.ticker}</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500 }}>{h.fiyat} ₺</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#EF4444" }}>▼ %-{Math.abs(Number(h.degisim)).toFixed(2).replace(".", ",")}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <RiskProfilWidget />

        {/* KAP Haberleri */}
          <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Piyasa Haberleri</span>
            </div>
            {KAP.map((k, i) => (
              <div key={i} style={{ padding: "9px 14px", borderBottom: i < KAP.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6", marginBottom: 2 }}>{k.ticker}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.4 }}>{k.title}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{k.time}</div>
              </div>
            ))}
          </div>
        </div>
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
