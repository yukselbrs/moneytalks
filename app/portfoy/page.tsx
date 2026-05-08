"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { BIST_HISSELER } from "@/lib/bist-hisseler";
import AppShell from "@/components/AppShell";
import { supabase } from "@/components/lib/supabase";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const PASTA_RENKLER = ["#3B82F6","#10B981","#F59E0B","#8B5CF6","#EF4444","#06B6D4","#F97316","#EC4899","#84CC16","#14B8A6"];

interface PortfoyItem {
  id: string;
  ticker: string;
  adet: number;
  maliyet: number;
}

interface FiyatMap {
  [ticker: string]: { fiyat: number; degisim: number };
}

interface RiskBilesen {
  ad: string; deger: string; risk: number; agirlik: number;
}
interface RiskEntry {
  skor: string; ozet: string; yukleniyor: boolean; acik: boolean; skor100?: number; bilesenler?: RiskBilesen[]; detay?: boolean;
}
interface RiskMap {
  [ticker: string]: RiskEntry;
}

const RISK_ACIKLAMALARI: Record<string, string> = {
  "Beta (Sistematik Risk)": "Piyasa duyarlılığı (CAPM). >1 daha oynak.",
  "Volatilite (Yillik)": "Yıllık oynaklık. Yüksekse belirsizlik artar.",
  "52H Pozisyonu": "%90+ aşırı alım, %15- dip riski.",
  "Momentum (20g)": "20 günlük fiyat trendi.",
  "Hacim Anomalisi": ">2x anormal aktivite göstergesi.",
  "RSI (14)": ">70 aşırı alım, <30 aşırı satım.",
  "Gunluk Range": "Intraday volatilite göstergesi.",
};

function fiyatDegeriOku(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function RiskBilesenGrid({ bilesenler, mobil = false }: { bilesenler: RiskBilesen[]; mobil?: boolean }) {
  return (
    <div className={mobil ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2"}>
      {bilesenler.map((b, i) => {
        const renk = b.risk >= 55
          ? { bar: "#EF4444", text: "#F87171", glow: "rgba(239,68,68,0.35)", accent: "rgba(239,68,68,0.6)" }
          : b.risk >= 35
          ? { bar: "#F59E0B", text: "#FCD34D", glow: "rgba(245,158,11,0.35)", accent: "rgba(245,158,11,0.6)" }
          : { bar: "#10B981", text: "#34D399", glow: "rgba(16,185,129,0.35)", accent: "rgba(16,185,129,0.6)" };
        const pct = Math.min(Math.round((b.risk / 80) * 100), 100);
        const aciklama = RISK_ACIKLAMALARI[b.ad];
        return (
          <div key={`${b.ad}-${i}`} className="rounded-lg p-2.5 flex flex-col justify-between"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `2px solid ${renk.accent}`, minHeight: 72 }}>
            <div className="flex items-start justify-between gap-1 mb-2">
              <span className="text-slate-500 text-[10px] leading-tight">{b.ad}</span>
              <span className="text-xs font-bold shrink-0 leading-none" style={{ color: renk.text }}>{b.deger}</span>
            </div>
            <div className="w-full rounded-full" style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
              <div className="rounded-full transition-all" style={{ width: `${pct}%`, height: 3, background: renk.bar, boxShadow: `0 0 8px ${renk.glow}` }} />
            </div>
            {aciklama && <p className="text-[9px] mt-1.5 leading-tight" style={{ color: "rgba(100,116,139,0.7)" }}>{aciklama}</p>}
          </div>
        );
      })}
    </div>
  );
}

interface LotModal {
  open: boolean;
  ticker: string;
  mevcutAdet: number;
  mevcutMaliyet: number;
  islem: "ekle" | "cikar";
  adet: string;
  fiyat: string;
}

interface EkleModal {
  open: boolean;
  ticker: string;
  adet: string;
  maliyet: string;
  hata: string;
  yukleniyor: boolean;
}

interface SilModal {
  open: boolean;
  ticker: string;
}

export default function PortfoyPage() {
  const router = useRouter();
  const [portfoy, setPortfoy] = useState<PortfoyItem[]>([]);
  const [fiyatlar, setFiyatlar] = useState<FiyatMap>({});
  const [riskler, setRiskler] = useState<RiskMap>({});
  const [yükleniyor, setYükleniyor] = useState(true);
  const [displayDeger, setDisplayDeger] = useState(0);
  const prevDegerRef = useRef(0);

  const [lotModal, setLotModal] = useState<LotModal>({
    open: false, ticker: "", mevcutAdet: 0, mevcutMaliyet: 0,
    islem: "ekle", adet: "", fiyat: "",
  });
  const [lotHata, setLotHata] = useState("");
  const [lotYükleniyor, setLotYükleniyor] = useState(false);

  const [ekleModal, setEkleModal] = useState<EkleModal>({
    open: false, ticker: "", adet: "", maliyet: "", hata: "", yukleniyor: false,
  });

  const [silModal, setSilModal] = useState<SilModal>({ open: false, ticker: "" });
  const [portfoyRiskSkor, setPortfoyRiskSkor] = useState<{ skor: number; seviye: string; yukleniyor: boolean } | null>(null);
  const [sonFiyatGuncelleme, setSonFiyatGuncelleme] = useState<Date | null>(null);
  const [fiyatlarYenileniyor, setFiyatlarYenileniyor] = useState(false);
  const isMobil = useMediaQuery("(max-width: 767px)");
  const [acikHisse, setAcikHisse] = useState<string | null>(null);
  const [getiriModu, setGetiriModu] = useState<"daily" | "total">("total");
  const [sortKolon, setSortKolon] = useState<"kz" | "kzYuzde" | "gunluk" | "guncel" | null>(null);
  const [sortYon, setSortYon] = useState<"asc" | "desc">("desc");
  const [flashTickers, setFlashTickers] = useState<Record<string, "up" | "down">>({});
  const prevFiyatlarRef = useRef<FiyatMap>({});

  const fiyatlariYenile = useCallback(async (items: PortfoyItem[], sessiz = false): Promise<FiyatMap> => {
    const tickers = items.map((p) => p.ticker.trim()).filter(Boolean).join(",");
    if (!tickers) return {};
    if (!sessiz) setFiyatlarYenileniyor(true);
    try {
      const res = await fetch("/api/fiyatlar?extra=" + tickers);
      const json = await res.json();
      const map: FiyatMap = {};
      Object.entries(json).forEach(([ticker, val]) => {
        if (!val) return;
        const v = val as { fiyat?: unknown; degisim?: unknown };
        const fiyat = fiyatDegeriOku(v.fiyat);
        const degisim = fiyatDegeriOku(v.degisim);
        if (fiyat === null) return;
        map[ticker] = { fiyat, degisim: degisim ?? 0 };
      });
      setFiyatlar((prev) => ({ ...prev, ...map }));
      setSonFiyatGuncelleme(new Date());
      return map;
    } catch (e) {
      console.error("Portfoy fiyat yenileme HATA:", e);
      return {};
    } finally {
      if (!sessiz) setFiyatlarYenileniyor(false);
    }
  }, []);

  const portfoyuYukle = useCallback(async () => {
    setYükleniyor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase
        .from("portfoy")
        .select("id, ticker, adet, maliyet")
        .order("created_at", { ascending: true });
      if (error) { console.error("Portfoy yuklenemedi", error); return; }
      if (!data || data.length === 0) {
        setPortfoy([]);
        setFiyatlar({});
        setPortfoyRiskSkor(null);
        return;
      }
      setPortfoy(data);
      try {
        const map = await fiyatlariYenile(data, true);

        // Portföy ortalama risk — tüm hisselerin skorlarını paralel çek
        setPortfoyRiskSkor({ skor: 0, seviye: "", yukleniyor: true });
        const riskSonuclari = await Promise.all(
          data.map(async (p: { ticker: string; adet: number; maliyet: number }) => {
            try {
              const r = await fetch(`/api/risk?ticker=${p.ticker.trim()}`);
              const rj = await r.json();
              const fiyat = map[p.ticker.trim()]?.fiyat || p.maliyet;
              const deger = p.adet * fiyat;
              return { skor: rj.skor || 0, deger };
            } catch { return { skor: 35, deger: p.adet * p.maliyet }; }
          })
        );
        const toplamDeger = riskSonuclari.reduce((a, b) => a + b.deger, 0);
        const agirlikliSkor = toplamDeger > 0
          ? riskSonuclari.reduce((a, b) => a + (b.skor * b.deger / toplamDeger), 0)
          : riskSonuclari.reduce((a, b) => a + b.skor, 0) / riskSonuclari.length;
        const seviye = agirlikliSkor >= 60 ? "Yüksek" : agirlikliSkor >= 35 ? "Orta" : "Düşük";
        setPortfoyRiskSkor({ skor: Math.round(agirlikliSkor), seviye, yukleniyor: false });
      } catch (e) { console.error("Fiyat fetch HATA:", e); }
    } finally { setYükleniyor(false); }
  }, [fiyatlariYenile, router]);

  useEffect(() => { portfoyuYukle(); }, [portfoyuYukle]);

  useEffect(() => {
    if (portfoy.length === 0) return;
    const id = window.setInterval(() => {
      void fiyatlariYenile(portfoy, true);
    }, 15000);
    return () => window.clearInterval(id);
  }, [fiyatlariYenile, portfoy]);


  useEffect(() => {
    const prev = prevFiyatlarRef.current;
    const changed: Record<string, "up" | "down"> = {};
    Object.entries(fiyatlar).forEach(([ticker, { fiyat }]) => {
      const prevFiyat = prev[ticker]?.fiyat;
      if (prevFiyat !== undefined && prevFiyat !== fiyat) {
        changed[ticker] = fiyat > prevFiyat ? "up" : "down";
      }
    });
    prevFiyatlarRef.current = fiyatlar;
    if (Object.keys(changed).length === 0) return;
    setFlashTickers(changed);
    const t = setTimeout(() => setFlashTickers({}), 700);
    return () => clearTimeout(t);
  }, [fiyatlar]);



  const riskSkoru = useCallback(async (ticker: string) => {
    if (riskler[ticker]?.skor) return;
    setRiskler((prev) => ({ ...prev, [ticker]: { skor: "", ozet: "", yukleniyor: true, acik: true } }));
    try {
      const res = await fetch(`/api/risk?ticker=${ticker}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const skor = json.seviyeTR || "Orta";
      const ozet = `Beta: ${json.meta?.beta} · Volatilite: %${json.meta?.volatilite} · RSI: ${json.meta?.rsi}`;
      setRiskler((prev) => ({ ...prev, [ticker]: { skor, ozet, yukleniyor: false, acik: true, skor100: json.skor, bilesenler: json.bilesenler } }));
    } catch {
      setRiskler((prev) => ({ ...prev, [ticker]: { skor: "?", ozet: "Hesaplama hatasi.", yukleniyor: false, acik: true } }));
    }
  }, [riskler]);

  const hisseEkle = async () => {
    setEkleModal((m) => ({ ...m, hata: "" }));
    if (!ekleModal.ticker || !ekleModal.adet || !ekleModal.maliyet) {
      setEkleModal((m) => ({ ...m, hata: "Tum alanlari doldurun." })); return;
    }
    setEkleModal((m) => ({ ...m, yukleniyor: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { error } = await supabase.from("portfoy").upsert(
        {
          user_id: session.user.id,
          ticker: ekleModal.ticker.toUpperCase().replace(/\x00/g, "").trim(),
          adet: parseFloat(ekleModal.adet),
          maliyet: parseFloat(ekleModal.maliyet),
        },
        { onConflict: "user_id,ticker" }
      );
      if (error) { setEkleModal((m) => ({ ...m, hata: error.message, yukleniyor: false })); return; }
      setEkleModal({ open: false, ticker: "", adet: "", maliyet: "", hata: "", yukleniyor: false });
      await portfoyuYukle();
    } catch { setEkleModal((m) => ({ ...m, yukleniyor: false })); }
  };

  const lotGüncelle = async () => {
    setLotHata("");
    const adet = parseFloat(lotModal.adet);
    const fiyat = parseFloat(lotModal.fiyat);
    if (!adet || adet <= 0 || !fiyat || fiyat <= 0) { setLotHata("Gecerli adet ve fiyat girin."); return; }
    if (lotModal.islem === "cikar" && adet > lotModal.mevcutAdet) { setLotHata("Mevcut adetten fazla cikarilamaz."); return; }
    setLotYükleniyor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      let yeniAdet: number;
      let yeniMaliyet: number;
      if (lotModal.islem === "ekle") {
        yeniAdet = lotModal.mevcutAdet + adet;
        yeniMaliyet = ((lotModal.mevcutAdet * lotModal.mevcutMaliyet) + (adet * fiyat)) / yeniAdet;
      } else {
        yeniAdet = lotModal.mevcutAdet - adet;
        yeniMaliyet = lotModal.mevcutMaliyet;
      }
      if (yeniAdet <= 0) {
        const { error } = await supabase.from("portfoy").delete().eq("user_id", session.user.id).eq("ticker", lotModal.ticker);
        if (error) { setLotHata("Islem basarisiz oldu."); return; }
      } else {
        const { error } = await supabase.from("portfoy").update({ adet: yeniAdet, maliyet: parseFloat(yeniMaliyet.toFixed(4)) })
          .eq("user_id", session.user.id).eq("ticker", lotModal.ticker);
        if (error) { setLotHata("Islem basarisiz oldu."); return; }
      }
      setLotModal({ open: false, ticker: "", mevcutAdet: 0, mevcutMaliyet: 0, islem: "ekle", adet: "", fiyat: "" });
      await portfoyuYukle();
    } catch { setLotHata("Beklenmeyen bir hata olustu."); } finally { setLotYükleniyor(false); }
  };

  const hisseSil = async (ticker: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("portfoy").delete().eq("user_id", session.user.id).eq("ticker", ticker);
    if (error) { console.error("Silme hatasi:", error.message); return; }
    setSilModal({ open: false, ticker: "" });
    await portfoyuYukle();
  };

  const plHesapla = (item: PortfoyItem) => {
    const guncel = fiyatlar[item.ticker]?.fiyat;
    if (!guncel) return null;
    const maliyet_toplam = item.adet * item.maliyet;
    const guncel_toplam = item.adet * guncel;
    const pl = guncel_toplam - maliyet_toplam;
    const plYuzde = (pl / maliyet_toplam) * 100;
    return { maliyet_toplam, guncel_toplam, pl, plYuzde };
  };

  const gunlukHesapla = (item: PortfoyItem) => {
    const fiyat = fiyatlar[item.ticker]?.fiyat;
    if (!fiyat) return null;
    const degisim = fiyatlar[item.ticker]?.degisim ?? 0;
    const oncekiFiyat = degisim !== -100 ? fiyat / (1 + degisim / 100) : fiyat;
    const gunluk = item.adet * (fiyat - oncekiFiyat);
    const oncekiDeger = item.adet * oncekiFiyat;
    const gunlukYuzde = oncekiDeger > 0 ? (gunluk / oncekiDeger) * 100 : 0;
    return { gunluk, gunlukYuzde };
  };

  const toplamMaliyet = portfoy.reduce((acc, p) => acc + p.adet * p.maliyet, 0);
  const toplamGuncel = portfoy.reduce((acc, p) => {
    const f = fiyatlar[p.ticker]?.fiyat;
    return acc + (f ? p.adet * f : p.adet * p.maliyet);
  }, 0);
  const toplamPL = toplamGuncel - toplamMaliyet;
  const toplamPLYuzde = toplamMaliyet > 0 ? (toplamPL / toplamMaliyet) * 100 : 0;
  const oncekiToplam = portfoy.reduce((acc, p) => {
    const fiyat = fiyatlar[p.ticker]?.fiyat;
    if (!fiyat) return acc + p.adet * p.maliyet;
    const degisim = fiyatlar[p.ticker]?.degisim ?? 0;
    const oncekiFiyat = degisim !== -100 ? fiyat / (1 + degisim / 100) : fiyat;
    return acc + p.adet * oncekiFiyat;
  }, 0);
  const gunlukPL = toplamGuncel - oncekiToplam;
  const gunlukPLYuzde = oncekiToplam > 0 ? (gunlukPL / oncekiToplam) * 100 : 0;
  const aktifPL = getiriModu === "daily" ? gunlukPL : toplamPL;
  const aktifPLYuzde = getiriModu === "daily" ? gunlukPLYuzde : toplamPLYuzde;
  const aktifPozitif = aktifPL >= 0;

  useEffect(() => {
    if (toplamGuncel === 0) return;
    const start = prevDegerRef.current;
    const end = toplamGuncel;
    const duration = 700;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayDeger(start + (end - start) * eased);
      if (p < 1) requestAnimationFrame(tick);
      else prevDegerRef.current = end;
    };
    requestAnimationFrame(tick);
  }, [toplamGuncel]);

  const riskRenk = (skor: string) => {
    if (skor === "Düşük") return "text-emerald-400 bg-emerald-400/10";
    if (skor === "Yüksek") return "text-red-400 bg-red-400/10";
    return "text-yellow-400 bg-yellow-400/10";
  };

  const sortTikla = (kolon: "kz" | "kzYuzde" | "gunluk" | "guncel") => {
    if (sortKolon === kolon) setSortYon(y => y === "desc" ? "asc" : "desc");
    else { setSortKolon(kolon); setSortYon("desc"); }
  };
  const sortIkon = (kolon: string) => sortKolon === kolon
    ? <span style={{ fontSize: 8, marginLeft: 3 }}>{sortYon === "desc" ? "▼" : "▲"}</span>
    : <span style={{ fontSize: 8, marginLeft: 3, opacity: 0.25 }}>⇅</span>;

  const siraliPortfoy = [...portfoy].sort((a, b) => {
    if (!sortKolon) return 0;
    const plA = plHesapla(a);
    const plB = plHesapla(b);
    const gA = gunlukHesapla(a);
    const gB = gunlukHesapla(b);
    let vA = 0, vB = 0;
    if (sortKolon === "kz") { vA = plA?.pl ?? 0; vB = plB?.pl ?? 0; }
    else if (sortKolon === "kzYuzde") { vA = plA?.plYuzde ?? 0; vB = plB?.plYuzde ?? 0; }
    else if (sortKolon === "gunluk") { vA = gA?.gunluk ?? 0; vB = gB?.gunluk ?? 0; }
    else if (sortKolon === "guncel") { vA = plA?.guncel_toplam ?? 0; vB = plB?.guncel_toplam ?? 0; }
    return sortYon === "desc" ? vB - vA : vA - vB;
  });

  const inputCls = "w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500";

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-6" style={{overflowX: "hidden", paddingLeft: "12px", paddingRight: "12px", boxSizing: "border-box", width: "100%"}}>
        <style>{`
          .portfolio-number { font-variant-numeric: tabular-nums; }
          .portfolio-summary-card { transition: border-color 0.16s ease, background 0.16s ease; }
          .portfolio-summary-card:hover { border-color: rgba(59,130,246,0.24); background: rgba(30,41,59,0.68); }
          .instant-tooltip { position: relative; }
          .instant-tooltip-content {
            position: absolute;
            left: 50%;
            bottom: calc(100% + 8px);
            transform: translateX(-50%) translateY(2px);
            width: max-content;
            max-width: 260px;
            border: 1px solid rgba(59,130,246,0.24);
            border-radius: 8px;
            background: #0F172A;
            color: #CBD5E1;
            box-shadow: 0 12px 28px rgba(0,0,0,0.32);
            font-size: 11px;
            font-weight: 600;
            line-height: 1.35;
            letter-spacing: 0;
            padding: 8px 10px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.08s ease, transform 0.08s ease;
            white-space: normal;
            z-index: 40;
          }
          .instant-tooltip:hover .instant-tooltip-content,
          .instant-tooltip:focus-within .instant-tooltip-content {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        `}</style>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Portföy Takibi</h1>
            <p className="text-slate-400 text-sm mt-1">BIST pozisyonlarınızı takip edin, her hisse için AI risk skoru alın</p>
          </div>
          <button
            onClick={() => setEkleModal({ open: true, ticker: "", adet: "", maliyet: "", hata: "", yukleniyor: false })}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Hisse Ekle
          </button>
        </div>

        {portfoy.length > 0 && (
          <div className="mb-4 relative overflow-hidden rounded-2xl border border-slate-700/50" style={{ background: "linear-gradient(135deg, #0B1929 0%, #0F172A 60%, #0B1929 100%)", boxShadow: "0 0 60px rgba(59,130,246,0.06)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div className="p-5 flex items-start gap-0">
              <div className="flex-1 min-w-0">
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">Portföy Değeri</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <p className="portfolio-number text-white" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.8px", lineHeight: 1 }}>
                    {displayDeger.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-slate-500 font-bold text-xl">₺</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`portfolio-number text-sm font-bold ${aktifPozitif ? "text-emerald-400" : "text-red-400"}`}>
                    {aktifPL >= 0 ? "+" : ""}{aktifPL.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                  </span>
                  <span className={`portfolio-number text-xs font-semibold ${aktifPozitif ? "text-emerald-600" : "text-red-600"}`}>
                    ({aktifPLYuzde >= 0 ? "+" : ""}{aktifPLYuzde.toFixed(2)}%)
                  </span>
                  <div className="inline-flex rounded-lg border border-slate-700/60 bg-slate-900/60 p-0.5 ml-1">
                    {[{ key: "daily" as const, label: "Günlük" }, { key: "total" as const, label: "Toplam" }].map(m => (
                      <button key={m.key} onClick={() => setGetiriModu(m.key)}
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${getiriModu === m.key ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-slate-800/80">
                  <div>
                    <p className="text-slate-600 text-[10px] font-medium mb-0.5">Ana Para</p>
                    <p className="portfolio-number text-slate-300 text-sm font-semibold">{toplamMaliyet.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</p>
                  </div>
                  <div className="w-px h-5 bg-slate-800" />
                  <div>
                    <p className="text-slate-600 text-[10px] font-medium mb-0.5">Pozisyon</p>
                    <p className="text-slate-300 text-sm font-semibold">{portfoy.length} hisse</p>
                  </div>
                  {portfoyRiskSkor && !portfoyRiskSkor.yukleniyor && (
                    <>
                      <div className="w-px h-5 bg-slate-800" />
                      <div>
                        <p className="text-slate-600 text-[10px] font-medium mb-0.5">Portföy Riski</p>
                        <p className={`text-sm font-bold ${portfoyRiskSkor.seviye === "Yüksek" ? "text-red-400" : portfoyRiskSkor.seviye === "Orta" ? "text-yellow-400" : "text-emerald-400"}`}>
                          {portfoyRiskSkor.seviye} · {portfoyRiskSkor.skor}/100
                        </p>
                      </div>
                    </>
                  )}
                  {portfoyRiskSkor?.yukleniyor && (
                    <span className="text-slate-500 text-xs animate-pulse">Risk hesaplanıyor...</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    onClick={() => {
                      portfoy.forEach(item => {
                        if (!riskler[item.ticker] || !riskler[item.ticker].skor) {
                          setRiskler(prev => ({ ...prev, [item.ticker]: { skor: "", ozet: "", yukleniyor: true, acik: false } }));
                          fetch(`/api/risk?ticker=${item.ticker}`)
                            .then(r => r.json())
                            .then(json => {
                              if (json.error) throw new Error(json.error);
                              setRiskler(prev => ({ ...prev, [item.ticker]: { skor: json.seviyeTR || "Orta", ozet: "", yukleniyor: false, acik: false, skor100: json.skor, bilesenler: json.bilesenler } }));
                            })
                            .catch(() => setRiskler(prev => ({ ...prev, [item.ticker]: { skor: "?", ozet: "", yukleniyor: false, acik: false } })));
                        }
                      });
                    }}
                    className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border border-slate-700/60"
                  >
                    ⚡ Portföy Riskini Hesapla
                  </button>
                  <button
                    onClick={() => void fiyatlariYenile(portfoy)}
                    disabled={fiyatlarYenileniyor}
                    className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border border-slate-700/60 disabled:opacity-50"
                  >
                    {fiyatlarYenileniyor ? "Yenileniyor..." : "Yenile"}
                  </button>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/8 px-2.5 py-1 text-[10px] font-semibold text-orange-400 ml-auto">
                    <span className={`h-1.5 w-1.5 rounded-full bg-orange-400 live-dot text-orange-400`} />
                    {fiyatlarYenileniyor ? "Güncelleniyor..." : sonFiyatGuncelleme ? `Son: ${sonFiyatGuncelleme.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : "15 dk gecikmeli"}
                  </span>
                </div>
              </div>
              {toplamGuncel > 0 && (
                <div className="hidden lg:flex items-center gap-5 pl-6 ml-6 border-l border-slate-800 self-stretch">
                  <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={portfoy.map(item => ({ name: item.ticker, value: fiyatlar[item.ticker]?.fiyat ? item.adet * fiyatlar[item.ticker].fiyat : item.adet * item.maliyet }))}
                          cx="50%" cy="50%" innerRadius={36} outerRadius={54}
                          dataKey="value" strokeWidth={2} stroke="rgba(11,25,41,0.95)"
                        >
                          {portfoy.map((_, i) => <Cell key={i} fill={PASTA_RENKLER[i % PASTA_RENKLER.length]} />)}
                        </Pie>
                        <Tooltip
                          formatter={(value: unknown, name: unknown) => [`${(value as number).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`, name as string]}
                          contentStyle={{ background: "#0F172A", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, fontSize: 11 }}
                          labelStyle={{ color: "#E2E8F0", fontWeight: 700 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {portfoy.map((item, i) => {
                      const d = fiyatlar[item.ticker]?.fiyat ? item.adet * fiyatlar[item.ticker].fiyat : item.adet * item.maliyet;
                      const o = toplamGuncel > 0 ? (d / toplamGuncel) * 100 : 0;
                      return (
                        <div key={item.ticker} className="flex items-center gap-2">
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: PASTA_RENKLER[i % PASTA_RENKLER.length], flexShrink: 0 }} />
                          <span className="text-slate-400 text-xs font-medium w-12">{item.ticker}</span>
                          <span className="text-slate-600 text-xs tabular-nums">{o.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {yükleniyor ? (
          <div className="text-slate-400 text-sm text-center py-12">Yükleniyor...</div>
        ) : portfoy.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>💼</div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#E2E8F0", marginBottom: 8 }}>Portföyünüz boş</p>
              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, maxWidth: 280 }}>Hisselerinizi ekleyerek kâr/zarar ve performansınızı anlık takip edin.</p>
            </div>
            <button
              onClick={() => setEkleModal({ open: true, ticker: "", adet: "", maliyet: "", hata: "", yukleniyor: false })}
              style={{ background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}
            >
              + İlk Hisseni Ekle
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8, maxWidth: 400, width: "100%" }}>
              {[
                { icon: "📈", text: "Kâr/Zarar takibi" },
                { icon: "🎯", text: "Risk analizi" },
                { icon: "📊", text: "Dağılım grafiği" },
              ].map(f => (
                <div key={f.text} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{f.icon}</div>
                  <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{f.text}</div>
                </div>
              ))}
            </div>
          </div>
        ) : isMobil ? (
          <div className="flex flex-col gap-2">
            {portfoy.map((item) => {
              const pl = plHesapla(item);
              const fiyat = fiyatlar[item.ticker];
              const risk = riskler[item.ticker];
              const isPos = pl ? pl.pl >= 0 : null;
              const acik = acikHisse === item.ticker;
              const fiyatDegisim = fiyat?.degisim ?? 0;
              const accentColor = isPos === null ? "rgba(71,85,105,0.9)" : isPos ? "rgba(16,185,129,0.85)" : "rgba(239,68,68,0.85)";
              return (
                <div key={item.id} className="relative overflow-hidden rounded-xl" style={{ background: isPos === null ? "rgba(11,18,32,0.92)" : isPos ? "rgba(10,22,17,0.92)" : "rgba(22,10,10,0.92)", border: "1px solid rgba(255,255,255,0.05)", borderLeft: `2px solid ${accentColor}` }}>
                  <div className="cursor-pointer px-4 py-3" onClick={() => setAcikHisse(acik ? null : item.ticker)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/hisse/${item.ticker}`} onClick={e => e.stopPropagation()} className="font-bold text-white hover:text-blue-400 text-[15px]">{item.ticker}</Link>
                          {fiyat && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${fiyatDegisim >= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>{fiyatDegisim >= 0 ? "▲" : "▼"}{Math.abs(fiyatDegisim).toFixed(2)}%</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {fiyat ? `${fiyat.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺` : "—"} · {item.adet.toLocaleString("tr-TR")} lot
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="portfolio-number text-sm font-bold text-white">{pl ? `${pl.guncel_toplam.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺` : "—"}</p>
                        <p className={`portfolio-number mt-0.5 text-xs font-semibold ${isPos === null ? "text-slate-500" : isPos ? "text-emerald-400" : "text-red-400"}`}>
                          {pl ? `${pl.pl >= 0 ? "+" : ""}${pl.pl.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺` : "—"}
                        </p>
                        {pl && <p className={`portfolio-number text-[10px] ${isPos ? "text-emerald-600" : "text-red-600"}`}>{pl.plYuzde >= 0 ? "+" : ""}{pl.plYuzde.toFixed(2)}%</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-600">Maliyet {item.maliyet.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
                        {(() => {
                          const gunluk = gunlukHesapla(item);
                          if (!gunluk) return null;
                          const pozitif = gunluk.gunluk >= 0;
                          return <span className={`portfolio-number text-[10px] font-semibold ${pozitif ? "text-emerald-500" : "text-red-500"}`}>Günlük {gunluk.gunluk >= 0 ? "+" : ""}{gunluk.gunluk.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>;
                        })()}
                      </div>
                      <span className="text-slate-600 text-[10px]">{acik ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {acik && (
                    <div className="px-4 pb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="my-3 grid grid-cols-2 gap-2">
                        {[
                          { label: "Lot", value: item.adet.toLocaleString("tr-TR"), cls: "text-white" },
                          { label: "Ort. Maliyet", value: `${item.maliyet.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`, cls: "text-white" },
                          { label: "Güncel Fiyat", value: fiyat ? `${fiyat.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺` : "—", cls: "text-white" },
                          { label: "K/Z %", value: pl ? `${pl.plYuzde >= 0 ? "+" : ""}${pl.plYuzde.toFixed(2)}%` : "—", cls: isPos === null ? "text-slate-500" : isPos ? "text-emerald-400" : "text-red-400" },
                          { label: "Ana Para", value: `${(item.adet * item.maliyet).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`, cls: "text-slate-300" },
                          { label: "Güncel Değer", value: pl ? `${pl.guncel_toplam.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺` : "—", cls: "text-white" },
                        ].map(s => (
                          <div key={s.label} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                            <p className="text-slate-600 text-[10px] mb-1">{s.label}</p>
                            <p className={`portfolio-number text-sm font-semibold ${s.cls}`}>{s.value}</p>
                          </div>
                        ))}
                        {(() => {
                          const gunluk = gunlukHesapla(item);
                          const pozitif = gunluk ? gunluk.gunluk >= 0 : null;
                          const cls = pozitif === null ? "text-slate-500" : pozitif ? "text-emerald-400" : "text-red-400";
                          return (
                            <>
                              <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                <p className="text-slate-600 text-[10px] mb-1">Günlük ₺</p>
                                <p className={`portfolio-number text-sm font-semibold ${cls}`}>{gunluk ? `${gunluk.gunluk >= 0 ? "+" : ""}${gunluk.gunluk.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺` : "—"}</p>
                              </div>
                              <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                <p className="text-slate-600 text-[10px] mb-1">Günlük %</p>
                                <p className={`portfolio-number text-sm font-semibold ${cls}`}>{gunluk ? `${gunluk.gunlukYuzde >= 0 ? "+" : ""}${gunluk.gunlukYuzde.toFixed(2)}%` : "—"}</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-slate-400">AI Risk Skoru</p>
                          {risk && risk.skor ? (
                            risk.yukleniyor ? (
                              <span className="text-slate-500 text-xs animate-pulse">Hesaplanıyor...</span>
                            ) : (
                              <button
                                onClick={() => setRiskler((prev) => ({ ...prev, [item.ticker]: { ...prev[item.ticker], detay: !prev[item.ticker]?.detay } }))}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded border cursor-pointer transition-all ${risk.skor === "Düşük" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : risk.skor === "Yüksek" ? "text-red-400 bg-red-400/10 border-red-400/20" : "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"}`}
                              >
                                ⚡ {risk.skor} {risk.skor100 !== undefined ? `· ${risk.skor100}/100` : ""} {risk.detay ? "▲" : "▼"}
                              </button>
                            )
                          ) : (
                            <button onClick={() => riskSkoru(item.ticker)} className="text-xs font-semibold px-2.5 py-1 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
                              ⚡ Risk Al
                            </button>
                          )}
                        </div>
                        {risk?.detay && risk?.bilesenler && (
                          <div className="mt-3"><RiskBilesenGrid bilesenler={risk.bilesenler} mobil /></div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setLotModal({ open: true, ticker: item.ticker, mevcutAdet: item.adet, mevcutMaliyet: item.maliyet, islem: "ekle", adet: "", fiyat: "" })}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>± Lot</button>
                        <Link href={`/hisse/${item.ticker}`} className="flex-1 py-2 rounded-lg text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors text-center"
                          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>Analiz →</Link>
                        <button onClick={() => setSilModal({ open: true, ticker: item.ticker })}
                          className="px-3 py-2 rounded-lg text-xs text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl" style={{ background: "rgba(8,14,26,0.9)", border: "1px solid rgba(59,130,246,0.1)", boxShadow: "0 0 48px rgba(59,130,246,0.04), inset 0 0 60px rgba(0,0,0,0.2)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "linear-gradient(90deg, rgba(59,130,246,0.07) 0%, rgba(139,92,246,0.04) 100%)", borderBottom: "1px solid rgba(59,130,246,0.12)" }}>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(96,165,250,0.7)" }}>Hisse</th>
                    <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-[0.12em] hidden sm:table-cell" style={{ color: "rgba(96,165,250,0.7)" }}>Lot</th>
                    <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(96,165,250,0.7)" }}>Maliyet</th>
                    <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(96,165,250,0.7)" }}>Fiyat</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] hidden sm:table-cell" style={{ color: "rgba(96,165,250,0.7)" }}>Ana Para</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] hidden sm:table-cell cursor-pointer select-none hover:text-blue-300 transition-colors" style={{ color: sortKolon === "guncel" ? "rgba(96,165,250,1)" : "rgba(96,165,250,0.7)" }} onClick={() => sortTikla("guncel")}>Güncel{sortIkon("guncel")}</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] hidden md:table-cell cursor-pointer select-none hover:text-blue-300 transition-colors" style={{ color: sortKolon === "gunluk" ? "rgba(96,165,250,1)" : "rgba(96,165,250,0.7)" }} onClick={() => sortTikla("gunluk")}>Günlük{sortIkon("gunluk")}</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] cursor-pointer select-none hover:text-blue-300 transition-colors" style={{ color: sortKolon === "kz" ? "rgba(96,165,250,1)" : "rgba(96,165,250,0.7)" }} onClick={() => sortTikla("kz")}>K/Z ₺{sortIkon("kz")}</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] hidden sm:table-cell cursor-pointer select-none hover:text-blue-300 transition-colors" style={{ color: sortKolon === "kzYuzde" ? "rgba(96,165,250,1)" : "rgba(96,165,250,0.7)" }} onClick={() => sortTikla("kzYuzde")}>K/Z %{sortIkon("kzYuzde")}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {siraliPortfoy.map((item) => {
                    const pl = plHesapla(item);
                    const fiyat = fiyatlar[item.ticker];
                    const risk = riskler[item.ticker];
                    const isPos = pl ? pl.pl >= 0 : null;
                    const gunluk = gunlukHesapla(item);
                    const gunlukPozitif = gunluk ? gunluk.gunluk >= 0 : null;
                    const accentColor = isPos === null ? "rgba(51,65,85,0.8)" : isPos ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)";
                    const rowBg = isPos === null ? "transparent" : isPos ? "rgba(16,185,129,0.018)" : "rgba(239,68,68,0.018)";
                    const flash = flashTickers[item.ticker];
                    const sirketAdi = BIST_HISSELER.find(h => h.ticker === item.ticker)?.ad;
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          style={{ borderLeft: `2px solid ${accentColor}`, background: rowBg, borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.15s ease, border-left-color 0.15s ease" }}
                          onMouseEnter={e => {
                            const el = e.currentTarget as HTMLTableRowElement;
                            el.style.background = isPos === null ? "rgba(59,130,246,0.045)" : isPos ? "rgba(16,185,129,0.055)" : "rgba(239,68,68,0.055)";
                            el.style.borderLeftColor = isPos === null ? "rgba(59,130,246,0.7)" : isPos ? "rgba(16,185,129,1)" : "rgba(239,68,68,1)";
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget as HTMLTableRowElement;
                            el.style.background = rowBg;
                            el.style.borderLeftColor = accentColor;
                          }}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Link href={`/hisse/${item.ticker}`} className="font-extrabold text-white hover:text-blue-400 transition-colors text-[15px] leading-none">
                                {item.ticker}
                              </Link>
                              {fiyat && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${fiyat.degisim >= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>
                                  {fiyat.degisim >= 0 ? "▲" : "▼"}{Math.abs(fiyat.degisim).toFixed(2)}%
                                </span>
                              )}
                            </div>
                            {sirketAdi && <p className="text-[10px] text-slate-600 mt-0.5 leading-none truncate max-w-[140px]">{sirketAdi}</p>}
                            {risk?.skor && !risk.yukleniyor && (
                              <button
                                onClick={() => setRiskler((prev) => ({ ...prev, [item.ticker]: { ...prev[item.ticker], detay: !prev[item.ticker]?.detay } }))}
                                className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded border cursor-pointer transition-all ${risk.skor === "Düşük" ? "text-emerald-400 bg-emerald-400/8 border-emerald-400/20" : risk.skor === "Yüksek" ? "text-red-400 bg-red-400/8 border-red-400/20" : "text-yellow-400 bg-yellow-400/8 border-yellow-400/20"}`}
                              >
                                ⚡ {risk.skor} {risk.skor100 !== undefined ? `${risk.skor100}/100` : ""} {risk.detay ? "▲" : "▼"}
                              </button>
                            )}
                            {risk?.yukleniyor && (
                              <span className="mt-1 text-slate-600 text-[10px] animate-pulse block">Hesaplanıyor...</span>
                            )}
                          </td>
                          <td className="portfolio-number px-3 py-2.5 text-right text-slate-300 text-sm hidden sm:table-cell">{item.adet.toLocaleString("tr-TR")}</td>
                          <td className="portfolio-number px-4 py-2.5 text-right text-slate-500 text-sm">{item.maliyet.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} <span className="text-slate-700">₺</span></td>
                          <td className="portfolio-number px-4 py-2.5 text-right text-sm" style={{ transition: "background 0.7s ease", background: flash === "up" ? "rgba(16,185,129,0.12)" : flash === "down" ? "rgba(239,68,68,0.12)" : "transparent" }}>
                            {fiyat ? <span className="text-white font-semibold">{fiyat.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} <span className="text-slate-600">₺</span></span> : <span className="text-slate-700">—</span>}
                          </td>
                          <td className="portfolio-number px-4 py-2.5 text-right text-slate-500 text-sm hidden sm:table-cell">
                            {(item.adet * item.maliyet).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} <span className="text-slate-700">₺</span>
                          </td>
                          <td className="portfolio-number px-4 py-2.5 text-right text-white text-sm font-semibold hidden sm:table-cell">
                            {pl ? <>{pl.guncel_toplam.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} <span className="text-slate-600">₺</span></> : <span className="text-slate-700">—</span>}
                          </td>
                          <td className={`portfolio-number px-4 py-2.5 text-right text-sm font-medium hidden md:table-cell ${gunlukPozitif === null ? "text-slate-600" : gunlukPozitif ? "text-emerald-400" : "text-red-400"}`}>
                            {gunluk ? (
                              <div>
                                <div>{gunluk.gunluk >= 0 ? "+" : ""}{gunluk.gunluk.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                                <div className="text-[11px] opacity-60">{gunluk.gunlukYuzde >= 0 ? "+" : ""}{gunluk.gunlukYuzde.toFixed(2)}%</div>
                              </div>
                            ) : "—"}
                          </td>
                          <td className={`portfolio-number px-4 py-2.5 text-right font-bold text-[15px] ${isPos === null ? "text-slate-600" : isPos ? "text-emerald-400" : "text-red-400"}`}>
                            {pl ? `${pl.pl >= 0 ? "+" : ""}${pl.pl.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺` : "—"}
                          </td>
                          <td className={`portfolio-number px-4 py-2.5 text-right font-bold text-[15px] hidden sm:table-cell ${isPos === null ? "text-slate-600" : isPos ? "text-emerald-400" : "text-red-400"}`}>
                            {pl ? `${pl.plYuzde >= 0 ? "+" : ""}${pl.plYuzde.toFixed(2)}%` : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-0.5 justify-end">
                              {!risk?.skor && !risk?.yukleniyor && (
                                <button onClick={() => riskSkoru(item.ticker)} title="AI Risk Skoru Al" className="p-1.5 rounded text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors text-xs font-bold">⚡</button>
                              )}
                              <button onClick={() => setLotModal({ open: true, ticker: item.ticker, mevcutAdet: item.adet, mevcutMaliyet: item.maliyet, islem: "ekle", adet: "", fiyat: "" })} title="Lot Ekle/Çıkar" className="p-1.5 rounded text-slate-600 hover:text-white hover:bg-slate-700/80 transition-colors text-sm font-bold">±</button>
                              <Link href={`/hisse/${item.ticker}`} title="Analiz" className="p-1.5 rounded text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 transition-colors text-sm">→</Link>
                              <button onClick={() => setSilModal({ open: true, ticker: item.ticker })} title="Sil" className="p-1.5 rounded text-slate-700 hover:text-red-400 hover:bg-red-900/20 transition-colors text-xs">✕</button>
                            </div>
                          </td>
                        </tr>
                        {risk?.detay && risk?.bilesenler && (
                          <tr key={item.id + "_detay"} style={{ background: "rgba(6,11,22,0.98)", borderBottom: "1px solid rgba(59,130,246,0.1)", borderLeft: "2px solid rgba(59,130,246,0.35)" }}>
                            <td colSpan={10} className="px-4 py-3">
                              <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: "rgba(96,165,250,0.45)" }}>Risk Bileşenleri</p>
                              <RiskBilesenGrid bilesenler={risk.bilesenler} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "1px solid rgba(59,130,246,0.15)", background: "linear-gradient(90deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.04) 100%)" }}>
                    <td className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(96,165,250,0.6)" }} colSpan={6}>Toplam</td>
                    <td className={`portfolio-number px-4 py-2.5 text-right text-sm font-medium hidden md:table-cell ${gunlukPL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {gunlukPL >= 0 ? "+" : ""}{gunlukPL.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </td>
                    <td className={`portfolio-number px-4 py-2.5 text-right font-bold text-[15px] ${toplamPL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {toplamPL >= 0 ? "+" : ""}{toplamPL.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </td>
                    <td className={`portfolio-number px-4 py-2.5 text-right font-bold text-[15px] hidden sm:table-cell ${toplamPLYuzde >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {toplamPLYuzde >= 0 ? "+" : ""}{toplamPLYuzde.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {ekleModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-lg">Hisse Ekle</h2>
              <button onClick={() => setEkleModal((m) => ({ ...m, open: false }))} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Hisse Kodu</label>
                <div style={{ position: "relative" }}>
                  <input className={inputCls + " uppercase"} placeholder="THYAO" value={ekleModal.ticker}
                    onChange={(e) => setEkleModal((m) => ({ ...m, ticker: e.target.value.toUpperCase() }))}
                    autoComplete="off" />
                  {ekleModal.ticker.length >= 2 && (() => {
                    const q = ekleModal.ticker.toUpperCase();
                    const matches = BIST_HISSELER.filter(h => h.ticker.startsWith(q) || (h.ad && h.ad.toUpperCase().includes(q))).slice(0, 6);
                    return matches.length > 0 ? (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, zIndex: 100, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                        {matches.map(h => (
                          <div key={h.ticker} onMouseDown={() => setEkleModal(m => ({ ...m, ticker: h.ticker }))}
                            style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.08)") }
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{h.ticker}</span>
                            <span style={{ fontSize: 11, color: "#475569" }}>{h.ad}</span>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Adet (lot)</label>
                <input type="number" className={inputCls} placeholder="100" value={ekleModal.adet}
                  onChange={(e) => setEkleModal((m) => ({ ...m, adet: e.target.value }))} />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Ortalama Maliyet (₺)</label>
                <input type="number" className={inputCls} placeholder="245.50" value={ekleModal.maliyet}
                  onChange={(e) => setEkleModal((m) => ({ ...m, maliyet: e.target.value }))} />
              </div>
            </div>
            {ekleModal.hata && <p className="text-red-400 text-xs mt-3">{ekleModal.hata}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEkleModal((m) => ({ ...m, open: false }))}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors">
                İptal
              </button>
              <button onClick={hisseEkle} disabled={ekleModal.yukleniyor}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                {ekleModal.yukleniyor ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {lotModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-semibold text-lg">{lotModal.ticker} — Lot Güncelle</h2>
              <button onClick={() => setLotModal((m) => ({ ...m, open: false }))} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-slate-400 text-xs mb-5">
              Mevcut: {lotModal.mevcutAdet} lot · Ort. maliyet: {lotModal.mevcutMaliyet.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
            </p>
            <div className="flex bg-slate-900 rounded-lg p-1 mb-5">
              {(["ekle", "cikar"] as const).map((i) => (
                <button key={i} onClick={() => setLotModal((m) => ({ ...m, islem: i, adet: "", fiyat: "" }))}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${lotModal.islem === i ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
                  {i === "ekle" ? "+ Lot Ekle" : "- Lot Çıkar"}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Adet</label>
                <input type="number" className={inputCls} placeholder="50" value={lotModal.adet}
                  onChange={(e) => setLotModal((m) => ({ ...m, adet: e.target.value }))} />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">
                  {lotModal.islem === "ekle" ? "Alış Fiyatı (₺) — ortalama maliyet güncellenir" : "Satış Fiyatı (₺)"}
                </label>
                <input type="number" className={inputCls} placeholder="320.00" value={lotModal.fiyat}
                  onChange={(e) => setLotModal((m) => ({ ...m, fiyat: e.target.value }))} />
              </div>
              {lotModal.islem === "ekle" && lotModal.adet && lotModal.fiyat && !isNaN(parseFloat(lotModal.adet)) && !isNaN(parseFloat(lotModal.fiyat)) && (
                <div className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400">
                  Yeni ort. maliyet:{" "}
                  <span className="text-white font-medium">
                    {(((lotModal.mevcutAdet * lotModal.mevcutMaliyet) + (parseFloat(lotModal.adet) * parseFloat(lotModal.fiyat))) / (lotModal.mevcutAdet + parseFloat(lotModal.adet))).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                  </span>
                  {" · Toplam lot: "}
                  <span className="text-white font-medium">{(lotModal.mevcutAdet + parseFloat(lotModal.adet)).toLocaleString("tr-TR")}</span>
                </div>
              )}
              {lotModal.islem === "cikar" && lotModal.adet && lotModal.fiyat && !isNaN(parseFloat(lotModal.adet)) && !isNaN(parseFloat(lotModal.fiyat)) && (() => {
                const satisFiyati = parseFloat(lotModal.fiyat);
                const satisAdet = parseFloat(lotModal.adet);
                const kazanc = (satisFiyati - lotModal.mevcutMaliyet) * satisAdet;
                const kazancYuzde = ((satisFiyati - lotModal.mevcutMaliyet) / lotModal.mevcutMaliyet) * 100;
                const kalanAdet = lotModal.mevcutAdet - satisAdet;
                return (
                  <div className={`border rounded-lg px-3 py-2 text-xs ${kazanc >= 0 ? "bg-emerald-900/20 border-emerald-800/40" : "bg-red-900/20 border-red-800/40"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400">Bu satıştan gerçekleşen K/Z:</span>
                      <span className={`font-bold ${kazanc >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {kazanc >= 0 ? "+" : ""}{kazanc.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Getiri oranı · Kalan lot</span>
                      <span className={`${kazanc >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {kazanc >= 0 ? "+" : ""}{kazancYuzde.toFixed(2)}% · {kalanAdet} lot
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
            {lotHata && <p className="text-red-400 text-xs mt-3">{lotHata}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setLotModal((m) => ({ ...m, open: false })); setLotHata(""); }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors">
                İptal
              </button>
              <button onClick={lotGüncelle} disabled={lotYükleniyor}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                {lotYükleniyor ? "Kaydediliyor..." : "Güncelle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {silModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <h2 className="text-white font-semibold text-lg mb-2">Hisseyi Sil</h2>
            <p className="text-slate-400 text-sm mb-6">
              <span className="text-white font-bold">{silModal.ticker}</span> portföyden kalıcı olarak silinecek. Emin misiniz?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSilModal({ open: false, ticker: "" })}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors">
                Vazgeç
              </button>
              <button onClick={() => hisseSil(silModal.ticker)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
