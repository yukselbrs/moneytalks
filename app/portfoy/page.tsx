"use client";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { BIST_HISSELER } from "@/lib/bist-hisseler";
import AppShell from "@/components/AppShell";
import { supabase } from "@/components/lib/supabase";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from "recharts";
import { formatCurrency, formatNumber, formatPercent, formatQuantity, formatSignedCurrency } from "@/lib/formatters";
import { usePortfolioData, enstrumanPozisyonMu, fonPozisyonMu, hisseHarici, type PortfoyItem } from "@/hooks/usePortfolioData";
import { ENSTRUMANLAR } from "@/lib/enstruman-pricing";

// Portfoye yalniz TL bazli enstrumanlar eklenebilir (K8): USD/EUR cinsi pozisyonlar ₺ toplamlari bozardi.
// Fon TL bazlidir, ayrica eklenebilir.
const TL_BAZLI_ENSTRUMANLAR = ENSTRUMANLAR.filter(e =>
  e.tur === "doviz" ? e.karsi === "TRY" : e.birim === "gram"
);

function pozisyonTanim(ticker: string) {
  return ENSTRUMANLAR.find(e => e.kod === ticker);
}

function pozisyonAd(item: Pick<PortfoyItem, "ticker" | "tur">): string {
  if (enstrumanPozisyonMu(item)) return pozisyonTanim(item.ticker)?.ad ?? item.ticker.toUpperCase();
  return item.ticker; // fon: kod gosterilir (detay sayfasi tam unvani gosterir); hisse: ticker
}

function pozisyonLink(item: Pick<PortfoyItem, "ticker" | "tur">): string {
  if (enstrumanPozisyonMu(item)) return `/doviz-maden/${item.ticker}`;
  if (fonPozisyonMu(item)) return `/fon/${item.ticker}`;
  return `/hisse/${item.ticker}`;
}
import { usePortfolioGrafik } from "@/hooks/usePortfolioGrafik";

const PASTA_RENKLER = ["#3B82F6","#10B981","#F59E0B","#8B5CF6","#EF4444","#06B6D4","#F97316","#EC4899","#84CC16","#14B8A6"];

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

function sonVeriZamaniLabel(sonGuncelleme: Date | null): string {
  const simdi = new Date();
  // Istanbul UTC+3
  const ist = (d: Date) => new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const istSimdi = ist(simdi);
  const gun = istSimdi.getUTCDay(); // 0=Paz,1=Pzt,...,5=Cum,6=Cmt
  const dk = istSimdi.getUTCHours() * 60 + istSimdi.getUTCMinutes();
  const piyasaAcik = gun >= 1 && gun <= 5 && dk >= 600 && dk <= 1090;

  if (piyasaAcik && sonGuncelleme) {
    return `Son: ${new Date(sonGuncelleme.getTime() - 15 * 60 * 1000).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  // Piyasa kapalı — son kapanış gününü bul
  const kapanisTarih = new Date(istSimdi);
  if (gun === 0) kapanisTarih.setUTCDate(kapanisTarih.getUTCDate() - 2);       // Pazar → Cuma
  else if (gun === 6) kapanisTarih.setUTCDate(kapanisTarih.getUTCDate() - 1);  // Cmt → Cuma
  else if (dk < 600) kapanisTarih.setUTCDate(kapanisTarih.getUTCDate() - 1);   // Açılmadan → dün
  // Dün Pzt ise ve Pazar, Cuma'ya çek
  const kapanisGunu = kapanisTarih.getUTCDay();
  if (kapanisGunu === 0) kapanisTarih.setUTCDate(kapanisTarih.getUTCDate() - 2);
  else if (kapanisGunu === 6) kapanisTarih.setUTCDate(kapanisTarih.getUTCDate() - 1);

  const gunAdi = kapanisTarih.toLocaleDateString("tr-TR", { weekday: "short", timeZone: "UTC" });
  const tarih = kapanisTarih.toLocaleDateString("tr-TR", { day: "numeric", month: "numeric", timeZone: "UTC" });
  // Eğer son kapanış bugün veya dün ise sadece gün adı, daha eskiyse tarih de ekle
  const fark = Math.floor((istSimdi.getTime() - kapanisTarih.getTime()) / 86400000);
  return fark < 3 ? `Kapanış: ${gunAdi} 18:10` : `Kapanış: ${tarih} 18:10`;
}

export default function PortfoyPage() {
  const router = useRouter();
  const {
    portfoy,
    fiyatlar,
    yükleniyor,
    sonFiyatGuncelleme,
    fiyatlarYenileniyor,
    portfoyRiskSkor,
    flashTickers,
    fiyatlariYenile,
    portfoyuYukle,
  } = usePortfolioData();
  const [riskler, setRiskler] = useState<RiskMap>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("portfoy_riskler") : null;
      if (!raw) return {};
      const parsed = JSON.parse(raw) as RiskMap;
      // Yarım kalan hesaplamaları temizle
      Object.keys(parsed).forEach(k => { parsed[k].yukleniyor = false; });
      return parsed;
    } catch { return {}; }
  });
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

  // Fon arama/algilama listesi (kod+unvan) — bir kez cekilir.
  const [fonListesi, setFonListesi] = useState<{ kod: string; unvan: string }[]>([]);
  useEffect(() => {
    supabase.from("fon_snapshots").select("kod, unvan").then(({ data }) => { if (data) setFonListesi(data); });
  }, []);
  const fonKodSet = useMemo(() => new Set(fonListesi.map(f => f.kod)), [fonListesi]);

  const [silModal, setSilModal] = useState<SilModal>({ open: false, ticker: "" });
  const [sonRiskHesaplama, setSonRiskHesaplama] = useState<Date | null>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("portfoy_son_risk_hesaplama") : null;
      return raw ? new Date(raw) : null;
    } catch { return null; }
  });
  const isMobil = useMediaQuery("(max-width: 767px)");
  const [acikHisse, setAcikHisse] = useState<string | null>(null);
  const [getiriModu, setGetiriModu] = useState<"daily" | "total">("total");
  const { grafik, grafikAralik, grafikYukleniyor, setGrafikAralik } = usePortfolioGrafik(portfoy);
  const [grafikAcik, setGrafikAcik] = useState(false);
  const [radarAcik, setRadarAcik] = useState(false);
  const [sortKolon, setSortKolon] = useState<"kz" | "kzYuzde" | "gunluk" | "guncel" | null>(null);
  const [sortYon, setSortYon] = useState<"asc" | "desc">("desc");

  // Senaryo analizi
  const [senaryoAcik, setSenaryoAcik] = useState(false);
  const [senaryoYuzde, setSenaryoYuzde] = useState(0);
  const [betaVerisi, setBetaVerisi] = useState<Record<string, { beta: number | null; sirketAdi: string }>>({});
  const [betaYukleniyor, setBetaYukleniyor] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("portfoy_riskler", JSON.stringify(riskler)); } catch { /* ignore */ }
  }, [riskler]);

  useEffect(() => {
    try {
      if (sonRiskHesaplama) localStorage.setItem("portfoy_son_risk_hesaplama", sonRiskHesaplama.toISOString());
    } catch { /* ignore */ }
  }, [sonRiskHesaplama]);

  const riskSkoru = useCallback(async (ticker: string) => {
    if (riskler[ticker]?.skor100 !== undefined) return;
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
      const girilen = ekleModal.ticker.toUpperCase().replace(/\x00/g, "").trim();
      const enstruman = ENSTRUMANLAR.find(e => e.kod.toUpperCase() === girilen);
      if (enstruman && !TL_BAZLI_ENSTRUMANLAR.includes(enstruman)) {
        setEkleModal((m) => ({ ...m, hata: "Portföye yalnız TL bazlı enstrümanlar eklenebilir: USD-TRY, EUR-TRY, GBP-TRY, GRAM-ALTIN, GRAM-GUMUS.", yukleniyor: false }));
        return;
      }
      const fonMu = !enstruman && fonKodSet.has(girilen);
      const tur = enstruman ? enstruman.tur : fonMu ? "fon" : undefined;
      const { error } = await supabase.from("portfoy").upsert(
        {
          user_id: session.user.id,
          ticker: enstruman ? enstruman.kod : girilen,
          adet: parseFloat(ekleModal.adet),
          maliyet: parseFloat(ekleModal.maliyet),
          ...(tur ? { tur } : {}),
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
    if (skor === "Çok Düşük" || skor === "Düşük") return "text-emerald-400 bg-emerald-400/10";
    if (skor === "Yüksek") return "text-red-400 bg-red-400/10";
    if (skor === "Orta-Üstü") return "text-orange-400 bg-orange-400/10";
    return "text-yellow-400 bg-yellow-400/10";
  };

  const sortTikla = (kolon: "kz" | "kzYuzde" | "gunluk" | "guncel") => {
    if (sortKolon === kolon) setSortYon(y => y === "desc" ? "asc" : "desc");
    else { setSortKolon(kolon); setSortYon("desc"); }
  };
  const sortIkon = (kolon: string) => sortKolon === kolon
    ? <span style={{ fontSize: 8, marginLeft: 3 }}>{sortYon === "desc" ? "▼" : "▲"}</span>
    : <span style={{ fontSize: 8, marginLeft: 3, opacity: 0.25 }}>⇅</span>;

  useEffect(() => {
    if (!senaryoAcik || portfoy.length === 0) return;
    // Beta/senaryo hisse'ye ozgu — doviz/maden pozisyonlari istege dahil edilmez.
    const eksikTickers = portfoy
      .filter(p => !hisseHarici(p))
      .map(p => p.ticker)
      .filter(ticker => betaVerisi[ticker] === undefined);
    if (eksikTickers.length === 0) return;

    async function betaYukle() {
      setBetaYukleniyor(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const tickers = eksikTickers.join(",");
        const res = await fetch(`/api/senaryo?tickers=${tickers}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json() as Record<string, { beta: number | null; sirketAdi: string }>;
        setBetaVerisi(prev => ({ ...prev, ...data }));
      } finally {
        setBetaYukleniyor(false);
      }
    }
    betaYukle();
  }, [senaryoAcik, portfoy, betaVerisi]);

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
          .portfolio-card-shell { border-radius: 12px; }
          .portfolio-text-clip { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          @media (max-width: 640px) {
            .portfolio-number { overflow-wrap: anywhere; }
            .portfolio-card-shell { border-radius: 10px; }
            .portfolio-mobile-grid { grid-template-columns: 1fr !important; }
            .portfolio-actions { width: 100%; justify-content: stretch; }
            .portfolio-actions > button, .portfolio-actions > a { flex: 1; }
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
                    {formatNumber(displayDeger, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-slate-500 font-bold text-xl">₺</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`portfolio-number text-sm font-bold ${aktifPozitif ? "text-emerald-400" : "text-red-400"}`}>
                    {formatSignedCurrency(aktifPL)}
                  </span>
                  <span className={`portfolio-number text-xs font-semibold ${aktifPozitif ? "text-emerald-600" : "text-red-600"}`}>
                    ({formatPercent(aktifPLYuzde, { signDisplay: "always" })})
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
                    <p className="portfolio-number text-slate-300 text-sm font-semibold">{formatCurrency(toplamMaliyet, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</p>
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
                              setSonRiskHesaplama(new Date());
                            })
                            .catch(() => setRiskler(prev => ({ ...prev, [item.ticker]: { skor: "?", ozet: "", yukleniyor: false, acik: false } })));
                        }
                      });
                    }}
                    className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border border-slate-700/60"
                  >
                    ⚡ Portföy Riskini Hesapla
                  </button>
                  {sonRiskHesaplama && (
                    <span className="text-[11px] text-slate-500">
                      Son hesaplama: {sonRiskHesaplama.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <button
                    onClick={() => void fiyatlariYenile(portfoy)}
                    disabled={fiyatlarYenileniyor}
                    className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border border-slate-700/60 disabled:opacity-50"
                  >
                    {fiyatlarYenileniyor ? "Yenileniyor..." : "Yenile"}
                  </button>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/8 px-2.5 py-1 text-[10px] font-semibold text-orange-400 ml-auto">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400 live-dot text-orange-400" />
                    {fiyatlarYenileniyor ? "Güncelleniyor..." : sonVeriZamaniLabel(sonFiyatGuncelleme)}
                    <span className="text-orange-400/50 font-normal">· ~15dk gecikmeli</span>
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
                          formatter={(value: unknown, name: unknown) => [formatCurrency(value as number, { maximumFractionDigits: 0, minimumFractionDigits: 0 }), name as string]}
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

        {portfoy.length > 0 && (() => {
          const rows = portfoy.map((item) => {
            const pl = plHesapla(item);
            const gunluk = gunlukHesapla(item);
            const fiyat = fiyatlar[item.ticker];
            const deger = pl?.guncel_toplam ?? item.adet * item.maliyet;
            return {
              ticker: item.ticker,
              deger,
              agirlik: toplamGuncel > 0 ? (deger / toplamGuncel) * 100 : 0,
              gunluk: gunluk?.gunluk ?? 0,
              gunlukYuzde: gunluk?.gunlukYuzde ?? fiyat?.degisim ?? 0,
              pl: pl?.pl ?? 0,
              plYuzde: pl?.plYuzde ?? 0,
              risk: riskler[item.ticker],
            };
          });
          const insights: { title: string; text: string; tone: "positive" | "negative" | "warning" | "neutral"; value?: string }[] = [];
          const strongest = [...rows].sort((a, b) => b.gunluk - a.gunluk)[0];
          const weakest = [...rows].sort((a, b) => a.gunluk - b.gunluk)[0];
          const topWeight = [...rows].sort((a, b) => b.agirlik - a.agirlik)[0];
          const highRisk = rows
            .filter((row) => row.risk?.skor === "Yüksek" || (row.risk?.skor100 ?? 0) >= 60)
            .sort((a, b) => b.agirlik - a.agirlik)[0];

          if (strongest && strongest.gunluk > 0) {
            insights.push({
              title: "Günün taşıyıcısı",
              text: `${strongest.ticker} portföyün günlük katkısında öne çıkıyor.`,
              tone: "positive",
              value: formatSignedCurrency(strongest.gunluk, { maximumFractionDigits: 0, minimumFractionDigits: 0 }),
            });
          }
          if (weakest && weakest.gunluk < 0) {
            insights.push({
              title: "Baskı noktası",
              text: `${weakest.ticker} bugün portföy getirisini aşağı çeken ana pozisyon.`,
              tone: "negative",
              value: formatCurrency(weakest.gunluk, { maximumFractionDigits: 0, minimumFractionDigits: 0 }),
            });
          }
          if (topWeight && topWeight.agirlik >= 30) {
            insights.push({
              title: "Yoğunlaşma",
              text: `${topWeight.ticker} portföyün ${topWeight.agirlik.toFixed(1)}% ağırlığında; tek pozisyon etkisi yüksek.`,
              tone: "warning",
              value: `%${topWeight.agirlik.toFixed(1)}`,
            });
          }
          if (highRisk) {
            insights.push({
              title: "Risk odağı",
              text: `${highRisk.ticker} risk skorunda dikkat istiyor; ağırlık ve oynaklık birlikte izlenmeli.`,
              tone: "warning",
              value: highRisk.risk?.skor100 ? `${highRisk.risk.skor100}/100` : "Yüksek",
            });
          }
          if (insights.length === 0) {
            insights.push({
              title: "Dengeli görünüm",
              text: "Bugün portföyde tek başına baskın bir katkı veya risk sinyali öne çıkmıyor.",
              tone: "neutral",
              value: `${portfoy.length} hisse`,
            });
          }
          const toneStyle = {
            positive: { color: "#34D399", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.18)" },
            negative: { color: "#F87171", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)" },
            warning: { color: "#FBBF24", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.18)" },
            neutral: { color: "#94A3B8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.14)" },
          } as const;

          return (
            <div className="mb-4 relative overflow-hidden rounded-2xl" style={{ background: "rgba(8,14,26,0.9)", border: "1px solid rgba(59,130,246,0.1)", boxShadow: "0 0 48px rgba(59,130,246,0.04), inset 0 0 60px rgba(0,0,0,0.2)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
              <button
                onClick={() => setRadarAcik((v) => !v)}
                className="w-full px-5 py-4 text-left outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/25"
                style={{ background: "transparent", border: 0, cursor: "pointer" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(96,165,250,0.6)" }}>
                      Portföy Radarı <span style={{ opacity: 0.7, fontSize: 10, marginLeft: 2 }}>{radarAcik ? "▲" : "▼"}</span>
                    </p>
                    {radarAcik && <p className="mt-1 text-xs text-slate-500">Bugün portföyde dikkat çeken kısa sinyaller</p>}
                  </div>
                  {radarAcik && <span className="rounded-full border border-slate-700/70 bg-slate-900/60 px-2.5 py-1 text-[10px] font-bold text-slate-500">Gecikmeli veri</span>}
                </div>
              </button>
              {radarAcik && (
              <div className="px-5 pb-4">
                <div className="grid grid-cols-1 gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  {insights.slice(0, 3).map((item) => {
                    const tone = toneStyle[item.tone];
                    return (
                      <div key={item.title} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.055)", borderLeft: `2px solid ${tone.color}` }}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: tone.color }}>{item.title}</span>
                          {item.value && <span className="portfolio-number rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}>{item.value}</span>}
                        </div>
                        <p className="text-xs leading-relaxed text-slate-400">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
            </div>
          );
        })()}

        {portfoy.length > 0 && (
          <div className="mb-4 relative overflow-hidden rounded-2xl" style={{ background: "rgba(8,14,26,0.9)", border: "1px solid rgba(59,130,246,0.1)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setGrafikAcik(a => !a)}>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(96,165,250,0.6)" }}>
                  Portföy Performansı <span style={{ opacity: 0.7, fontSize: 10, marginLeft: 2 }}>{grafikAcik ? "▲" : "▼"}</span>
                </p>
                {grafikAcik && (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {(["1d", "1mo", "3mo", "1y"] as const).map(a => (
                      <button key={a} onClick={() => setGrafikAralik(a)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${grafikAralik === a ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                        {a === "1d" ? "Bugün" : a === "1mo" ? "1A" : a === "3mo" ? "3A" : "1Y"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {grafikAcik && (grafikYukleniyor && grafik.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-slate-600 text-xs animate-pulse mt-3">Yükleniyor...</div>
              ) : grafik.length > 1 ? (() => {
                const son = grafik[grafik.length - 1].degisim;
                const pozitif = son >= 0;
                const renk = pozitif ? "#10B981" : "#EF4444";
                return (
                  <div className="mt-3">
                    <p className={`text-xs font-bold mb-2 ${pozitif ? "text-emerald-400" : "text-red-400"}`}>
                      {pozitif ? "▲" : "▼"} {formatPercent(Math.abs(son), { signDisplay: "never" })} dönem getirisi
                    </p>
                    <ResponsiveContainer width="100%" height={100}>
                      <AreaChart data={grafik} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={renk} stopOpacity="0.15" />
                            <stop offset="100%" stopColor={renk} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="tarih" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis hide domain={["dataMin", "dataMax"]} />
                        <Tooltip
                          contentStyle={{ background: "#0F172A", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, fontSize: 11 }}
                          labelStyle={{ color: "#94A3B8", fontSize: 10 }}
                          formatter={(v: unknown) => [formatPercent(v as number, { signDisplay: "always" }), "Getiri"]}
                        />
                        <Area type="monotone" dataKey="degisim" stroke={renk} strokeWidth={1.5} fill="url(#pg)" fillOpacity={1} dot={false} baseValue="dataMin" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                );
              })() : (
                <div className="h-28 flex items-center justify-center text-slate-600 text-xs mt-3">Veri yok</div>
              ))}
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
                          <Link href={pozisyonLink(item)} onClick={e => e.stopPropagation()} className="font-bold text-white hover:text-blue-400 text-[15px]">{pozisyonAd(item)}</Link>
                          {fiyat && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${fiyatDegisim >= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>{fiyatDegisim >= 0 ? "▲" : "▼"}{formatPercent(Math.abs(fiyatDegisim), { signDisplay: "never" })}</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {fiyat ? formatCurrency(fiyat.fiyat) : "—"} · {formatQuantity(item.adet, "lot")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="portfolio-number text-sm font-bold text-white">{pl ? formatCurrency(pl.guncel_toplam) : "—"}</p>
                        <p className={`portfolio-number mt-0.5 text-xs font-semibold ${isPos === null ? "text-slate-500" : isPos ? "text-emerald-400" : "text-red-400"}`}>
                          {pl ? formatSignedCurrency(pl.pl) : "—"}
                        </p>
                        {pl && <p className={`portfolio-number text-[10px] ${isPos ? "text-emerald-600" : "text-red-600"}`}>{formatPercent(pl.plYuzde, { signDisplay: "always" })}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-600">Maliyet {formatCurrency(item.maliyet)}</span>
                        {(() => {
                          const gunluk = gunlukHesapla(item);
                          if (!gunluk) return null;
                          const pozitif = gunluk.gunluk >= 0;
                          return <span className={`portfolio-number text-[10px] font-semibold ${pozitif ? "text-emerald-500" : "text-red-500"}`}>Günlük {formatSignedCurrency(gunluk.gunluk)}</span>;
                        })()}
                      </div>
                      <span className="text-slate-600 text-[10px]">{acik ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {acik && (
                    <div className="px-4 pb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="my-3 grid grid-cols-2 gap-2">
                        {[
                          { label: "Lot", value: formatQuantity(item.adet), cls: "text-white" },
                          { label: "Ort. Maliyet", value: formatCurrency(item.maliyet), cls: "text-white" },
                          { label: "Güncel Fiyat", value: fiyat ? formatCurrency(fiyat.fiyat) : "—", cls: "text-white" },
                          { label: "K/Z %", value: pl ? formatPercent(pl.plYuzde, { signDisplay: "always" }) : "—", cls: isPos === null ? "text-slate-500" : isPos ? "text-emerald-400" : "text-red-400" },
                          { label: "Ana Para", value: formatCurrency(item.adet * item.maliyet, { maximumFractionDigits: 0, minimumFractionDigits: 0 }), cls: "text-slate-300" },
                          { label: "Güncel Değer", value: pl ? formatCurrency(pl.guncel_toplam) : "—", cls: "text-white" },
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
                                <p className={`portfolio-number text-sm font-semibold ${cls}`}>{gunluk ? formatSignedCurrency(gunluk.gunluk) : "—"}</p>
                              </div>
                              <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                <p className="text-slate-600 text-[10px] mb-1">Günlük %</p>
                                <p className={`portfolio-number text-sm font-semibold ${cls}`}>{gunluk ? formatPercent(gunluk.gunlukYuzde, { signDisplay: "always" }) : "—"}</p>
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
                        <Link href={pozisyonLink(item)} className="flex-1 py-2 rounded-lg text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors text-center"
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
                    const sirketAdi = enstrumanPozisyonMu(item)
                      ? (() => { const t = pozisyonTanim(item.ticker); return t?.tur === "doviz" ? t.aciklama : t?.birim === "gram" ? "Gram · TL (türetilmiş)" : undefined; })()
                      : BIST_HISSELER.find(h => h.ticker === item.ticker)?.ad;
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
                              <Link href={pozisyonLink(item)} className="font-extrabold text-white hover:text-blue-400 transition-colors text-[15px] leading-none">
                                {pozisyonAd(item)}
                              </Link>
                              {fiyat && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${fiyat.degisim >= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>
                                  {fiyat.degisim >= 0 ? "▲" : "▼"}{formatPercent(Math.abs(fiyat.degisim), { signDisplay: "never" })}
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
                          <td className="portfolio-number px-3 py-2.5 text-right text-slate-300 text-sm hidden sm:table-cell">{formatQuantity(item.adet)}</td>
                          <td className="portfolio-number px-4 py-2.5 text-right text-slate-500 text-sm">{formatCurrency(item.maliyet)}</td>
                          <td className="portfolio-number px-4 py-2.5 text-right text-sm" style={{ transition: "background 0.7s ease", background: flash === "up" ? "rgba(16,185,129,0.12)" : flash === "down" ? "rgba(239,68,68,0.12)" : "transparent" }}>
                            {fiyat ? <span className="text-white font-semibold">{formatCurrency(fiyat.fiyat)}</span> : <span className="text-slate-700">—</span>}
                          </td>
                          <td className="portfolio-number px-4 py-2.5 text-right text-slate-500 text-sm hidden sm:table-cell">
                            {formatCurrency(item.adet * item.maliyet)}
                          </td>
                          <td className="portfolio-number px-4 py-2.5 text-right text-white text-sm font-semibold hidden sm:table-cell">
                            {pl ? <>{formatCurrency(pl.guncel_toplam)}</> : <span className="text-slate-700">—</span>}
                          </td>
                          <td className={`portfolio-number px-4 py-2.5 text-right text-sm font-medium hidden md:table-cell ${gunlukPozitif === null ? "text-slate-600" : gunlukPozitif ? "text-emerald-400" : "text-red-400"}`}>
                            {gunluk ? (
                              <div>
                                <div>{formatSignedCurrency(gunluk.gunluk)}</div>
                                <div className="text-[11px] opacity-60">{formatPercent(gunluk.gunlukYuzde, { signDisplay: "always" })}</div>
                              </div>
                            ) : "—"}
                          </td>
                          <td className={`portfolio-number px-4 py-2.5 text-right font-bold text-[15px] ${isPos === null ? "text-slate-600" : isPos ? "text-emerald-400" : "text-red-400"}`}>
                            {pl ? formatSignedCurrency(pl.pl) : "—"}
                          </td>
                          <td className={`portfolio-number px-4 py-2.5 text-right font-bold text-[15px] hidden sm:table-cell ${isPos === null ? "text-slate-600" : isPos ? "text-emerald-400" : "text-red-400"}`}>
                            {pl ? formatPercent(pl.plYuzde, { signDisplay: "always" }) : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-0.5 justify-end">
                              {!risk?.skor && !risk?.yukleniyor && !hisseHarici(item) && (
                                <button onClick={() => riskSkoru(item.ticker)} title="AI Risk Skoru Al" className="p-1.5 rounded text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors text-xs font-bold">⚡</button>
                              )}
                              <button onClick={() => setLotModal({ open: true, ticker: item.ticker, mevcutAdet: item.adet, mevcutMaliyet: item.maliyet, islem: "ekle", adet: "", fiyat: "" })} title="Lot Ekle/Çıkar" className="p-1.5 rounded text-slate-600 hover:text-white hover:bg-slate-700/80 transition-colors text-sm font-bold">±</button>
                              <Link href={pozisyonLink(item)} title="Analiz" className="p-1.5 rounded text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 transition-colors text-sm">→</Link>
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
                      {formatSignedCurrency(gunlukPL)}
                    </td>
                    <td className={`portfolio-number px-4 py-2.5 text-right font-bold text-[15px] ${toplamPL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatSignedCurrency(toplamPL)}
                    </td>
                    <td className={`portfolio-number px-4 py-2.5 text-right font-bold text-[15px] hidden sm:table-cell ${toplamPLYuzde >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatPercent(toplamPLYuzde, { signDisplay: "always" })}
                    </td>
                    <td className="px-3 py-2.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Senaryo Analizi ── */}
        {portfoy.length > 0 && (
          <div className="mt-4 mb-6 relative overflow-hidden rounded-2xl" style={{ background: "rgba(8,14,26,0.9)", border: "1px solid rgba(59,130,246,0.1)", boxShadow: "0 0 48px rgba(59,130,246,0.04), inset 0 0 60px rgba(0,0,0,0.2)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <button onClick={() => setSenaryoAcik(v => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/25">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(96,165,250,0.6)" }}>Senaryo Analizi</p>
                {senaryoAcik && <span className="text-xs text-slate-500">XU100 değişirse portföy tahmini nasıl etkilenir?</span>}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-slate-600 transition-transform duration-200" style={{ transform: senaryoAcik ? "rotate(180deg)" : "rotate(0)" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {senaryoAcik && (
              <div style={{ borderTop: "1px solid rgba(59,130,246,0.08)" }}>
                <style>{`
                  .senaryo-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 999px; outline: none; cursor: pointer; }
                  .senaryo-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #3B82F6; border: 3px solid #0F172A; box-shadow: 0 0 0 2px rgba(96,165,250,0.28); cursor: pointer; }
                  .senaryo-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #3B82F6; border: 3px solid #0F172A; cursor: pointer; }
                `}</style>
                <div className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-[minmax(260px,0.85fr)_1fr] lg:items-center">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.12em]">XU100 Senaryosu</span>
                      <span className={`portfolio-number text-lg font-extrabold ${senaryoYuzde > 0 ? "text-emerald-400" : senaryoYuzde < 0 ? "text-red-400" : "text-slate-500"}`}>
                        {senaryoYuzde > 0 ? "+" : ""}{senaryoYuzde}%
                      </span>
                    </div>
                    <div className="relative pt-1">
                      <input
                        type="range" min={-40} max={40} step={1}
                        value={senaryoYuzde}
                        onChange={e => setSenaryoYuzde(Number(e.target.value))}
                        className="senaryo-slider"
                        style={{
                          background: senaryoYuzde === 0
                            ? "rgba(255,255,255,0.08)"
                            : senaryoYuzde > 0
                              ? `linear-gradient(to right, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.06) 50%, rgba(16,185,129,0.85) 50%, rgba(16,185,129,0.85) ${50 + senaryoYuzde * 1.25}%, rgba(255,255,255,0.06) ${50 + senaryoYuzde * 1.25}%, rgba(255,255,255,0.06) 100%)`
                              : `linear-gradient(to right, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.06) ${50 + senaryoYuzde * 1.25}%, rgba(239,68,68,0.85) ${50 + senaryoYuzde * 1.25}%, rgba(239,68,68,0.85) 50%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.06) 100%)`,
                        }}
                      />
                      <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-slate-600/45" />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-slate-700 font-medium">
                      <span>−40%</span><span>0</span><span>+40%</span>
                    </div>
                  </div>

                  {betaYukleniyor ? (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="w-3 h-3 border border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                      Beta verileri alınıyor...
                    </div>
                  ) : (() => {
                    let totalImpact = 0;
                    const rows = portfoy.map(p => {
                      const betaRaw = betaVerisi[p.ticker]?.beta;
                      const betaVarsayim = betaRaw === null || betaRaw === undefined;
                      const beta = betaRaw ?? 1;
                      const guncel = fiyatlar[p.ticker]?.fiyat ?? p.maliyet;
                      const portfolioValue = guncel * p.adet;
                      const estimatedChangePct = senaryoYuzde * beta / 100;
                      const impact = portfolioValue * estimatedChangePct;
                      totalImpact += impact;
                      return { ticker: p.ticker, beta, betaVarsayim, impact, changePct: estimatedChangePct * 100, portfolioValue };
                    });
                    const betaVarsayilanlar = rows.filter(r => r.betaVarsayim);
                    const toplamPortfoyDegeri = rows.reduce((sum, r) => sum + r.portfolioValue, 0);
                    const totalImpactPct = toplamPortfoyDegeri > 0 ? (totalImpact / toplamPortfoyDegeri) * 100 : 0;
                    const maxImpact = Math.max(...rows.map(r => Math.abs(r.impact)), 0.01);

                    return (
                      <div>
                        <div className="rounded-xl border border-slate-800/80 bg-slate-950/20 px-4 py-3">
                          <div>
                            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.12em]">Tahmini Etki</p>
                            <p className={`portfolio-number mt-0.5 text-lg font-extrabold ${totalImpact >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {formatSignedCurrency(totalImpact, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                              <span className="ml-2 text-xs font-semibold opacity-70">
                                {formatPercent(totalImpactPct, { signDisplay: "always" })}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-800/80">
                          {rows.map((r, idx) => (
                            <div key={r.ticker} className="grid grid-cols-[64px_48px_1fr_58px_82px] items-center gap-2 px-3 py-2" style={{ borderTop: idx === 0 ? "none" : "1px solid rgba(255,255,255,0.035)" }}>
                              <span className="portfolio-number text-xs font-bold text-slate-300">{r.ticker}</span>
                              <span className={`portfolio-number text-[10px] ${r.betaVarsayim ? "text-amber-400" : "text-slate-600"}`}>β {r.beta.toFixed(2)}{r.betaVarsayim ? "*" : ""}</span>
                              <div className="relative h-1 rounded-full bg-slate-800/70">
                                <span className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-y-1/2 bg-slate-600/40" />
                                {senaryoYuzde !== 0 && (
                                  <span className="absolute top-0 h-full rounded-full"
                                    style={{
                                      width: `${(Math.abs(r.impact) / maxImpact) * 50}%`,
                                      left: r.impact >= 0 ? "50%" : undefined,
                                      right: r.impact < 0 ? "50%" : undefined,
                                      background: r.impact >= 0 ? "rgba(16,185,129,0.65)" : "rgba(239,68,68,0.65)",
                                    }}
                                  />
                                )}
                              </div>
                              <span className={`portfolio-number text-right text-xs font-semibold ${r.changePct >= 0 ? "text-emerald-500" : "text-red-500"}`}>{r.changePct >= 0 ? "+" : ""}{r.changePct.toFixed(1)}%</span>
                              <span className={`portfolio-number text-right text-xs font-bold ${r.impact >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatSignedCurrency(r.impact, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</span>
                            </div>
                          ))}
                        </div>

                        <p className="mt-2 text-[10px] text-slate-700">
                          Beta katsayısı tahmindir; gerçek piyasa korelasyonu farklılaşabilir.
                          {betaVarsayilanlar.length > 0 && ` * ${betaVarsayilanlar.map(r => r.ticker).join(", ")} için beta verisi yok, β 1,00 varsayıldı.`}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {ekleModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-lg">Pozisyon Ekle</h2>
              <button onClick={() => setEkleModal((m) => ({ ...m, open: false }))} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Hisse / Döviz / Maden</label>
                <div style={{ position: "relative" }}>
                  <input className={inputCls + " uppercase"} placeholder="THYAO ya da USD-TRY" value={ekleModal.ticker}
                    onChange={(e) => setEkleModal((m) => ({ ...m, ticker: e.target.value.toUpperCase() }))}
                    autoComplete="off" />
                  {ekleModal.ticker.length >= 2 && (() => {
                    const q = ekleModal.ticker.toUpperCase();
                    const enstrumanlar = TL_BAZLI_ENSTRUMANLAR.filter(e =>
                      e.kod.toUpperCase().includes(q) || e.ad.toUpperCase().includes(q) ||
                      (e.tur === "doviz" && e.aciklama.toUpperCase().includes(q))
                    ).slice(0, 3);
                    const fonlar = fonListesi.filter(f => f.kod.startsWith(q) || f.unvan.toUpperCase().includes(q)).slice(0, 3);
                    const matches = BIST_HISSELER.filter(h => h.ticker.startsWith(q) || (h.ad && h.ad.toUpperCase().includes(q))).slice(0, 6 - enstrumanlar.length - fonlar.length);
                    return matches.length > 0 || enstrumanlar.length > 0 || fonlar.length > 0 ? (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, zIndex: 100, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                        {enstrumanlar.map(en => (
                          <div key={en.kod} onMouseDown={() => setEkleModal(m => ({ ...m, ticker: en.kod.toUpperCase() }))}
                            style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.08)") }
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{en.ad}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: en.tur === "doviz" ? "#60A5FA" : "#FBBF24", background: en.tur === "doviz" ? "rgba(59,130,246,0.12)" : "rgba(245,158,11,0.12)", borderRadius: 999, padding: "2px 8px" }}>
                              {en.tur === "doviz" ? "Döviz" : "Maden"}
                            </span>
                          </div>
                        ))}
                        {fonlar.map(f => (
                          <div key={f.kod} onMouseDown={() => setEkleModal(m => ({ ...m, ticker: f.kod }))}
                            style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.08)") }
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{f.kod}</span>
                              <span className="truncate" style={{ fontSize: 11, color: "#475569", maxWidth: 150 }}>{f.unvan}</span>
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#2DD4BF", background: "rgba(45,212,191,0.12)", borderRadius: 999, padding: "2px 8px", flexShrink: 0 }}>Fon</span>
                          </div>
                        ))}
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
              Mevcut: {formatQuantity(lotModal.mevcutAdet, "lot")} · Ort. maliyet: {formatCurrency(lotModal.mevcutMaliyet)}
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
                    {formatCurrency(((lotModal.mevcutAdet * lotModal.mevcutMaliyet) + (parseFloat(lotModal.adet) * parseFloat(lotModal.fiyat))) / (lotModal.mevcutAdet + parseFloat(lotModal.adet)))}
                  </span>
                  {" · Toplam lot: "}
                  <span className="text-white font-medium">{formatQuantity(lotModal.mevcutAdet + parseFloat(lotModal.adet))}</span>
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
                        {formatSignedCurrency(kazanc, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Getiri oranı · Kalan lot</span>
                      <span className={`${kazanc >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {formatPercent(kazancYuzde, { signDisplay: "always" })} · {formatQuantity(kalanAdet, "lot")}
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
