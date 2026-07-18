"use client";
import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import StockLogo from "@/components/StockLogo";
import { BadgePercent, ChevronDown, Search, Shield, SlidersHorizontal, TrendingUp, Users, Wallet, X } from "lucide-react";
import { tickerRenk } from "@/lib/utils";

type IsiHisse = {
  ticker: string;
  ad: string;
  domain?: string;
  degisim: number | null;
  piyasaDegeri: number | null;
};

type Hisse = {
  ticker: string;
  ad: string;
  domain?: string;
  fiyat: string | null;
  degisim: string | null;
  yukselis: boolean | null;
  hacim: number | null;
  getiri_1h: string | null;
  getiri_1a: string | null;
  getiri_3a: string | null;
  getiri_1y: string | null;
  veriDurumu?: string | null;
};

type Fon = {
  kod: string;
  unvan: string;
  kategori: string | null;
  fiyat: string | null;
  gunluk_getiri: string | null;
  getiri_1h: string | null;
  getiri_1a: string | null;
  getiri_3a: string | null;
  getiri_6a: string | null;
  getiri_1y: string | null;
  getiri_yb: string | null;
  risk_degeri: number | null;
  portfoy_buyukluk: number | null;
  kisi_sayisi: number | null;
  yonetim_ucreti_yillik: number | null;
  toplam_gider_orani: number | null;
  tefas_durum: boolean | null;
  veri_tarihi: string | null;
};

type ApiResponse = {
  items: Hisse[] | Fon[];
  total: number;
  page: number;
  pageSize: number;
};

const SIRALAMA_OPTIONS = [
  { key: "alfabetik", label: "A-Z", short: "A-Z" },
  { key: "yukselis", label: "Yükselenler", short: "Yükselen" },
  { key: "dusus", label: "Düşenler", short: "Düşen" },
  { key: "islem_hacmi", label: "İşlem Hacmi", short: "İşlem" },
  { key: "1wk", label: "1H %" },
  { key: "1mo", label: "1A %" },
  { key: "3mo", label: "3A %" },
  { key: "1y", label: "1Y %" },
];

const FON_SIRALAMA_OPTIONS = [
  { key: "alfabetik", label: "A-Z", short: "A-Z" },
  { key: "gun", label: "Gün %" },
  { key: "1mo", label: "1A %" },
  { key: "3mo", label: "3A %" },
  { key: "6mo", label: "6A %" },
  { key: "1y", label: "1Y %" },
  { key: "risk", label: "Risk" },
  { key: "buyukluk", label: "Büyüklük" },
  { key: "kisi", label: "Yatırımcı Sayısı" },
  { key: "ucret", label: "Yıllık Yönetim Ücreti" },
];

const FON_KAPALI_SIRALAMA_OPTIONS = [
  { key: "alfabetik", label: "A-Z", short: "A-Z" },
  { key: "gun", label: "Gün %" },
  { key: "1wk", label: "1H %" },
  { key: "1mo", label: "1A %" },
  { key: "3mo", label: "3A %" },
  { key: "6mo", label: "6A %" },
  { key: "ytd", label: "YBB %" },
  { key: "1y", label: "1Y %" },
  { key: "buyukluk", label: "Büyüklük" },
  { key: "kisi", label: "Yatırımcı Sayısı" },
];

const FON_TEFAS_FILTERS = [
  { key: "acik", label: "TEFAS açık" },
  { key: "kapali", label: "TEFAS kapalı" },
  { key: "tumu", label: "Tümü" },
] as const;

const TABLO_BASLIKLARI = [
  { label: "#", align: "left" },
  { label: "HİSSE", align: "left" },
  { label: "FİYAT", sort: "fiyat", align: "right" },
  { label: "GÜN %", sort: "gun", align: "right" },
  { label: "HACİM", sort: "hacim", align: "right" },
  { label: "İŞLEM HACMİ", sort: "islem_hacmi", align: "right" },
  { label: "1H %", sort: "1wk", align: "right" },
  { label: "1A %", sort: "1mo", align: "right" },
  { label: "3A %", sort: "3mo", align: "right" },
  { label: "1Y %", sort: "1y", align: "right" },
];

const FON_TABLO_BASLIKLARI = [
  { label: "#", align: "left" },
  { label: "FON", align: "left" },
  { label: "FİYAT", align: "right" },
  { label: "GÜN %", sort: "gun", align: "right" },
  { label: "1A %", sort: "1mo", align: "right" },
  { label: "3A %", sort: "3mo", align: "right" },
  { label: "6A %", sort: "6mo", align: "right" },
  { label: "1Y %", sort: "1y", align: "right" },
  { label: "RİSK", sort: "risk", align: "right" },
];

const FON_KAPALI_TABLO_BASLIKLARI = [
  { label: "#", align: "left" },
  { label: "FON", align: "left" },
  { label: "FİYAT", align: "right" },
  { label: "GÜN %", sort: "gun", align: "right" },
  { label: "1H %", sort: "1wk", align: "right" },
  { label: "1A %", sort: "1mo", align: "right" },
  { label: "3A %", sort: "3mo", align: "right" },
  { label: "6A %", sort: "6mo", align: "right" },
  { label: "YBB %", sort: "ytd", align: "right" },
  { label: "1Y %", sort: "1y", align: "right" },
  { label: "BÜYÜKLÜK", sort: "buyukluk", align: "right" },
];

function HisselerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sort = searchParams.get("sort") || "alfabetik";
  const varlik = searchParams.get("varlik") === "fon" ? "fon" : "hisse";
  const dirParam = searchParams.get("dir");
  const sortDir = dirParam === "asc" || dirParam === "desc" ? dirParam : null;
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const q = searchParams.get("q") || "";
  const tefasParam = searchParams.get("tefas");
  const tefasFilter = varlik === "fon" && (tefasParam === "kapali" || tefasParam === "tumu") ? tefasParam : "acik";

  const [gorunum] = useState<"tablo" | "isi">("tablo");
  const [arama, setArama] = useState(q);
  const [debouncedArama, setDebouncedArama] = useState(q.trim());
  const [tefasSecim, setTefasSecim] = useState(tefasFilter);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [isiData, setIsiData] = useState<IsiHisse[]>([]);
  const [isiYukleniyor, setIsiYukleniyor] = useState(false);
  const latestRequest = useRef("");
  const aktifTefasFilter = varlik === "fon" ? tefasSecim : "acik";

  useEffect(() => {
    document.title = varlik === "fon"
      ? "Yatırım Fonları | ParaKonuşur"
      : "Tüm BIST Hisseleri | ParaKonuşur";
  }, [varlik]);

  // URL search param güncelleme yardımcısı
  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    });
    router.replace(`/hisseler?${params.toString()}`);
  }, [router, searchParams]);

  const handleHeaderSort = useCallback((sortKey: string) => {
    if (sort !== sortKey || sortDir === null) {
      updateParams({ sort: sortKey, dir: "desc", page: "1" });
      return;
    }
    if (sortDir === "desc") {
      updateParams({ sort: sortKey, dir: "asc", page: "1" });
      return;
    }
    updateParams({ sort: "alfabetik", dir: null, page: "1" });
  }, [sort, sortDir, updateParams]);

  useEffect(() => {
    setArama(q);
    setDebouncedArama(q.trim());
  }, [q]);

  useEffect(() => {
    setTefasSecim(tefasFilter);
  }, [tefasFilter]);

  // Arama input → URL (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedArama(arama.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [arama]);

  useEffect(() => {
    if (debouncedArama !== q.trim()) {
      updateParams({ q: debouncedArama || null, page: "1" });
    }
  }, [debouncedArama, q, updateParams]);

  // URL değişince data fetch
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    setYukleniyor(true);
    setData(null);
    const params = new URLSearchParams({ sort, page: String(page) });
    if (sortDir) params.set("dir", sortDir);
    if (debouncedArama) params.set("q", debouncedArama);
    if (varlik === "fon") params.set("tefas", aktifTefasFilter);
    const endpoint = varlik === "fon" ? "/api/fonlar" : "/api/hisseler";
    const requestUrl = `${endpoint}?${params.toString()}`;
    latestRequest.current = requestUrl;
    fetch(requestUrl, { signal: controller.signal, cache: varlik === "fon" ? "no-store" : "default" })
      .then(r => r.json())
      .then((d: ApiResponse) => {
        if (!ignore && latestRequest.current === requestUrl) {
          setData(d);
          setYukleniyor(false);
        }
      })
      .catch((error) => {
        if (!ignore && latestRequest.current === requestUrl && error?.name !== "AbortError") setYukleniyor(false);
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [sort, sortDir, page, debouncedArama, varlik, aktifTefasFilter]);

  // Isı haritası verisi — bir kez çek, cache'le
  useEffect(() => {
    if (varlik !== "hisse" || gorunum !== "isi" || isiData.length > 0) return;
    queueMicrotask(() => setIsiYukleniyor(true));
    fetch("/api/hisseler?heatmap=true")
      .then(r => r.json())
      .then((d: { items: IsiHisse[] }) => { setIsiData(d.items || []); setIsiYukleniyor(false); })
      .catch(() => setIsiYukleniyor(false));
  }, [gorunum, isiData.length, varlik]);

  const items = data?.items || [];
  const toplam = data?.total || 0;
  const pageSize = data?.pageSize || 25;
  const toplamSayfa = Math.max(1, Math.ceil(toplam / pageSize));
  const fonKapali = varlik === "fon" && aktifTefasFilter === "kapali";
  const siralamaOptions = fonKapali ? FON_KAPALI_SIRALAMA_OPTIONS : varlik === "fon" ? FON_SIRALAMA_OPTIONS : SIRALAMA_OPTIONS;
  const aktifSiralama = siralamaOptions.find((s) => s.key === sort);
  const aktifSiralamaMetni = aktifSiralama
    ? `${aktifSiralama.label}${sortDir ? ` ${sortDir === "desc" ? "azalan" : "artan"}` : ""}`
    : "A-Z";
  const fonGetiriSortlari = fonKapali ? ["gun", "1wk", "1mo", "3mo", "6mo"] : ["gun", "1mo", "3mo", "6mo", "1y"];
  const fonMetricTabs = varlik === "fon"
    ? [
        { key: "gun", label: "Getiri", icon: TrendingUp, activeKeys: fonGetiriSortlari },
        { key: "buyukluk", label: "Büyüklük", icon: Wallet, activeKeys: ["buyukluk"] },
        { key: "kisi", label: "Yatırımcı", icon: Users, activeKeys: ["kisi"] },
        ...(fonKapali
          ? [{ key: "1y", label: "Yıllık Getiri", icon: BadgePercent, activeKeys: ["1y", "ytd"] }]
          : [
              { key: "risk", label: "Risk", icon: Shield, activeKeys: ["risk"] },
              { key: "ucret", label: "Yönetim Ücreti", icon: BadgePercent, activeKeys: ["ucret"] },
            ]),
      ]
    : [];

  const hisseItems = varlik === "hisse" ? items as Hisse[] : [];
  const fonItems = varlik === "fon" ? items as Fon[] : [];
  const fonSonKolon = sort === "kisi"
    ? { label: "YATIRIMCI SAYISI", sort: "kisi", align: "right" }
    : sort === "ucret"
      ? { label: "YILLIK YÖN. ÜCRETİ", sort: "ucret", align: "right" }
      : { label: "BÜYÜKLÜK", sort: "buyukluk", align: "right" };
  const tabloBasliklari = varlik === "fon" ? (fonKapali ? FON_KAPALI_TABLO_BASLIKLARI : [...FON_TABLO_BASLIKLARI, fonSonKolon]) : TABLO_BASLIKLARI;
  const tabloGrid = varlik === "fon"
    ? fonKapali
      ? "36px minmax(170px,1fr) 84px 62px 62px 66px 66px 66px 66px 66px 112px"
      : "36px minmax(170px,1fr) 82px 64px 70px 70px 70px 70px 48px 116px"
    : "44px 1fr 100px 84px 92px 120px 76px 76px 76px 76px";

  const formatHacim = (v: number | null) => {
    if (v === null || !Number.isFinite(v)) return "—";
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2).replace(".", ",")} Mr`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2).replace(".", ",")} Mn`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(".", ",")} B`;
    return v.toLocaleString("tr-TR");
  };

  const formatIslemHacmi = (hacim: number | null, fiyat: string | null) => {
    if (hacim === null || !Number.isFinite(hacim) || !fiyat) return "—";
    const f = parseFloat(fiyat.replace(",", "."));
    if (!Number.isFinite(f) || f <= 0) return "—";
    const tl = hacim * f;
    if (tl >= 1_000_000_000) return `${(tl / 1_000_000_000).toFixed(2).replace(".", ",")} Mr ₺`;
    if (tl >= 1_000_000) return `${(tl / 1_000_000).toFixed(1).replace(".", ",")} Mn ₺`;
    if (tl >= 1_000) return `${(tl / 1_000).toFixed(0)} B ₺`;
    return `${tl.toFixed(0)} ₺`;
  };

  const formatBuyukluk = (v: number | null) => {
    if (v === null || !Number.isFinite(v)) return "—";
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2).replace(".", ",")} Mr ₺`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} Mn ₺`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)} B ₺`;
    return `${v.toLocaleString("tr-TR")} ₺`;
  };

  const formatKisi = (v: number | null) => {
    if (v === null || !Number.isFinite(v)) return "—";
    return v.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  };

  const formatUcret = (v: number | null) => {
    if (v === null || !Number.isFinite(v)) return "—";
    return `%${v.toFixed(2).replace(".", ",")}`;
  };

  const renderPercent = (value: string | null, className = "") => {
    const val = value !== null ? parseFloat(value) : null;
    return (
      <span className={className} style={{ color: val === null ? "#475569" : val >= 0 ? "#10B981" : "#EF4444" }}>
        {val === null ? "—" : `${val >= 0 ? "%" : "%-"}${Math.abs(val).toFixed(2).replace(".", ",")}`}
      </span>
    );
  };

  const isiRenk = (d: number | null) => {
    if (d === null) return { bg: "rgba(30,41,59,0.55)", border: "rgba(148,163,184,0.07)", text: "#475569" };
    const a = Math.abs(d);
    if (d >= 0) {
      if (a >= 5) return { bg: "rgba(5,150,105,0.88)", border: "rgba(16,185,129,0.45)", text: "#ECFDF5" };
      if (a >= 2) return { bg: "rgba(16,185,129,0.50)", border: "rgba(16,185,129,0.28)", text: "#D1FAE5" };
      if (a >= 0.5) return { bg: "rgba(16,185,129,0.22)", border: "rgba(16,185,129,0.14)", text: "#A7F3D0" };
      return { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.08)", text: "#6EE7B7" };
    } else {
      if (a >= 5) return { bg: "rgba(185,28,28,0.88)", border: "rgba(239,68,68,0.45)", text: "#FEF2F2" };
      if (a >= 2) return { bg: "rgba(239,68,68,0.50)", border: "rgba(239,68,68,0.28)", text: "#FEE2E2" };
      if (a >= 0.5) return { bg: "rgba(239,68,68,0.22)", border: "rgba(239,68,68,0.14)", text: "#FECACA" };
      return { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.08)", text: "#FCA5A5" };
    }
  };

  return (
    <AppShell>
      <div className="dot-grid" style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <style>{`
          .hisse-row { transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
          .hisse-row:hover { background: rgba(59,130,246,0.07) !important; box-shadow: inset 3px 0 0 #3B82F6, 0 4px 20px rgba(59,130,246,0.08); }
          .fon-row { transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
          .fon-row:hover { background: rgba(20,184,166,0.06) !important; box-shadow: inset 3px 0 0 #14B8A6, 0 4px 20px rgba(20,184,166,0.07); }
          .hisse-toolbar { display: grid; grid-template-columns: minmax(0,1fr) minmax(260px, 360px); gap: 14px; align-items: center; margin-bottom: 18px; }
          .fon-toolbar { grid-template-columns: minmax(0,1fr) minmax(240px, 330px); gap: 12px; margin-bottom: 14px; }
          .fon-table-shell { overflow-x: auto !important; }
          .fon-control-panel { display: flex; align-items: center; gap: 12px; padding: 14px; margin-bottom: 14px; border-radius: 14px; background: rgba(15,23,42,0.72); border: 1px solid rgba(148,163,184,0.13); box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
          .fon-control { height: 42px; border-radius: 10px; border: 1px solid rgba(148,163,184,0.13); background: rgba(30,41,59,0.56); color: #E2E8F0; transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease; }
          .fon-control:focus-within { border-color: rgba(59,130,246,0.45); background: rgba(30,41,59,0.76); box-shadow: 0 0 0 4px rgba(59,130,246,0.09); }
          .fon-select-wrap { position: relative; display: inline-flex; align-items: center; flex: 0 0 auto; min-width: 156px; }
          .fon-select-wrap svg { pointer-events: none; }
          .fon-select { width: 100%; height: 100%; appearance: none; border: 0; outline: 0; background: transparent; color: #E2E8F0; font-size: 13px; font-weight: 700; padding: 0 34px 0 12px; cursor: pointer; }
          .fon-sort-select { min-width: 214px; }
          .fon-search-control { flex: 1 1 360px; display: flex; align-items: center; gap: 10px; padding: 0 12px; min-width: 260px; }
          .fon-search-control input { background: transparent; border: 0; outline: 0; width: 100%; color: #F1F5F9; font-size: 14px; }
          .fon-direction-btn { height: 42px; display: inline-flex; align-items: center; gap: 8px; padding: 0 13px; border-radius: 10px; border: 1px solid rgba(148,163,184,0.13); background: rgba(30,41,59,0.42); color: #CBD5E1; font-size: 12.5px; font-weight: 750; cursor: pointer; white-space: nowrap; }
          .fon-direction-btn:hover { border-color: rgba(59,130,246,0.32); background: rgba(59,130,246,0.09); color: #DBEAFE; }
          .fon-meta-line { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: -2px 0 14px; color: #475569; font-size: 11px; }
          .fon-metric-tabs { display: flex; align-items: center; gap: 28px; margin: 10px 0 20px; padding: 0 0 12px; border-bottom: 1px solid rgba(148,163,184,0.14); overflow-x: auto; }
          .fon-metric-tab { position: relative; display: inline-flex; align-items: center; gap: 8px; min-height: 34px; padding: 0; border: 0; background: transparent; color: #94A3B8; font-size: 14px; font-weight: 760; cursor: pointer; white-space: nowrap; }
          .fon-metric-tab:hover { color: #CBD5E1; }
          .fon-metric-tab-active { color: #E2E8F0; }
          .fon-metric-tab-active::after { content: ""; position: absolute; left: 0; right: 0; bottom: -13px; height: 2px; border-radius: 999px; background: #93C5FD; }
          .sort-btn { position: relative; padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.18s ease; letter-spacing: -0.1px; }
          .fon-sort-btn { padding: 8px 12px; font-size: 12px; border-radius: 9px; }
          .sort-btn-inactive { background: rgba(148,163,184,0.04); border: 1px solid rgba(148,163,184,0.1); color: #94A3B8; }
          .sort-btn-inactive:hover { background: rgba(59,130,246,0.06); border-color: rgba(59,130,246,0.3); color: #DBEAFE; transform: translateY(-1px); }
          .sort-btn-active { background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(99,102,241,0.14)); border: 1px solid rgba(59,130,246,0.5); color: #DBEAFE; font-weight: 700; box-shadow: 0 4px 16px -4px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.06); }
          .tefas-filter { display: inline-flex; align-items: center; gap: 4px; padding: 4px; border-radius: 10px; background: rgba(15,23,42,0.72); border: 1px solid rgba(20,184,166,0.16); }
          .tefas-filter-btn { height: 28px; padding: 0 10px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: #64748B; font-size: 11.5px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.18s ease; }
          .tefas-filter-btn:hover { color: #CCFBF1; background: rgba(20,184,166,0.07); }
          .tefas-filter-btn-active { color: #CCFBF1; background: linear-gradient(135deg, rgba(20,184,166,0.18), rgba(59,130,246,0.12)); border-color: rgba(20,184,166,0.34); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); }
          .hisse-arama:focus-within { border-color: rgba(59,130,246,0.45) !important; background: rgba(59,130,246,0.06) !important; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
          .hisse-mobile-returns { display: none; }
          .pg-btn { padding: 8px 12px; border-radius: 8px; background: rgba(148,163,184,0.05); border: 1px solid rgba(148,163,184,0.12); color: #94A3B8; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.15s ease; }
          .pg-btn:hover:not(:disabled) { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.35); color: #DBEAFE; }
          .pg-btn:disabled { color: #334155; cursor: not-allowed; opacity: 0.5; }
          .pg-btn-active { background: linear-gradient(135deg, #3B82F6, #6366F1) !important; border-color: #3B82F6 !important; color: #fff !important; font-weight: 700 !important; box-shadow: 0 4px 14px -4px rgba(59,130,246,0.6); }
          @media (max-width: 640px) {
            .isi-grid { grid-template-columns: repeat(auto-fill, minmax(74px, 1fr)); gap: 3px; }
            main { padding: 16px 12px !important; }
            .hisse-toolbar { grid-template-columns: 1fr !important; }
            .hisse-tablo-header { display: none !important; }
            .fon-tablo-header { display: none !important; }
            .hisse-row { display: grid !important; grid-template-columns: 1fr auto !important; gap: 10px !important; margin-bottom: 8px; padding: 13px 14px !important; border: 1px solid rgba(59,130,246,0.08) !important; border-radius: 12px; background: rgba(255,255,255,0.012) !important; }
            .fon-row { display: grid !important; grid-template-columns: 1fr auto !important; gap: 10px !important; margin-bottom: 8px; padding: 13px 14px !important; border: 1px solid rgba(20,184,166,0.08) !important; border-radius: 12px; background: rgba(255,255,255,0.012) !important; }
            .hisse-row .col-no { display: none !important; }
            .fon-row .col-no { display: none !important; }
            .hisse-row .col-hacim { display: none !important; }
            .hisse-row .col-islem-hacmi { display: none !important; }
            .hisse-row .col-getiri { display: none !important; }
            .fon-row .col-fon-extra { display: none !important; }
            .fon-row .col-fon-getiri { display: none !important; }
            .hisse-row .col-gun { text-align: right !important; align-self: end; }
            .hisse-row .col-fiyat { text-align: right !important; align-self: start; }
            .hisse-mobile-returns { display: flex !important; grid-column: 1 / -1; gap: 6px; overflow-x: auto; padding-top: 2px; }
            .hisse-arama { min-width: unset !important; width: 100% !important; }
            .hisse-siralama { overflow-x: auto; flex-wrap: nowrap !important; padding-bottom: 4px; }
            .fon-control-panel { flex-direction: column; align-items: stretch; padding: 12px; }
            .fon-select-wrap, .fon-sort-select, .fon-search-control { width: 100%; min-width: 0; flex-basis: auto; }
            .fon-direction-btn { justify-content: center; width: 100%; }
            .fon-meta-line { align-items: flex-start; flex-direction: column; gap: 4px; }
            .fon-metric-tabs { gap: 20px; margin-bottom: 14px; }
          }
        `}</style>
        <main style={{ width: "100%", maxWidth: varlik === "fon" ? "100%" : 1440, margin: "0 auto", padding: varlik === "fon" ? "24px 28px" : "32px 40px", boxSizing: "border-box", overflowX: "hidden" }}>

          {/* Başlık */}
          <div className="animate-fade-up" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: varlik === "fon" ? 18 : 22, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: "#60A5FA", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                {varlik === "fon" ? "TEFAS · Yatırım Fonları" : "BIST · Tüm Hisseler"}
              </p>
              <h1 style={{ fontSize: varlik === "fon" ? 30 : 32, fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.8px", display: "flex", alignItems: "center", gap: 12, margin: 0 }}>
                <span style={{ background: "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {varlik === "fon" ? "Yatırım Fonları" : "Hisseler"}
                </span>
                <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.06))", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 999, padding: "4px 12px" }}>
                  {yukleniyor ? "..." : `${toplam} ${varlik === "fon" ? "fon" : "hisse"}`}
                </span>
              </h1>
              {varlik === "fon" && (
                <p style={{ fontSize: 13, color: "#64748B", margin: "8px 0 0", lineHeight: 1.5 }}>
                  {fonKapali
                    ? "TEFAS kapalı fonlarda fiyat geçmişinden hesaplanan getirileri, büyüklük ve yatırımcı sayısıyla takip edin."
                    : "TEFAS yatırım fonlarını getiri, risk, büyüklük ve yatırımcı sayısına göre takip edin."}
                </p>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#64748B", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <span className="delay-pill">{varlik === "fon" ? "TEFAS günlük veri" : "15 dk gecikmeli veri"}</span>
              {varlik !== "fon" && <span style={{ color: "#94A3B8" }}>Aktif:</span>}
              {varlik !== "fon" && <span style={{ color: "#DBEAFE", fontWeight: 600, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 999, padding: "3px 10px" }}>{aktifSiralamaMetni}</span>}
            </div>
          </div>

          {varlik === "fon" ? (
            <>
              <div className="fon-control-panel">
                <label className="fon-control fon-select-wrap" aria-label="TEFAS durumu">
                  <select
                    className="fon-select"
                    value={aktifTefasFilter}
                    onChange={(event) => {
                      const nextFilter = event.target.value;
                      setTefasSecim(nextFilter);
                      updateParams({ tefas: nextFilter === "acik" ? null : nextFilter, page: "1" });
                    }}
                  >
                    {FON_TEFAS_FILTERS.map((filter) => (
                      <option key={filter.key} value={filter.key}>{filter.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={17} color="#CBD5E1" style={{ position: "absolute", right: 11 }} />
                </label>

                <div className="fon-control fon-search-control">
                  <Search size={18} color="#94A3B8" />
                  <input
                    value={arama}
                    onChange={e => setArama(e.target.value)}
                    placeholder="Fon kodu veya adı ile ara..."
                  />
                  {arama && (
                    <button
                      onClick={() => setArama("")}
                      aria-label="Aramayı temizle"
                      style={{ background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.15)", color: "#94A3B8", cursor: "pointer", width: 26, height: 26, borderRadius: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <label className="fon-control fon-select-wrap fon-sort-select" aria-label="Sıralama seçimi">
                  <SlidersHorizontal size={16} color="#94A3B8" style={{ position: "absolute", left: 12 }} />
                  <select
                    className="fon-select"
                    value={siralamaOptions.some((s) => s.key === sort) ? sort : "alfabetik"}
                    onChange={(event) => updateParams({ sort: event.target.value, dir: null, page: "1" })}
                    style={{ paddingLeft: 38 }}
                  >
                    {siralamaOptions.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={17} color="#CBD5E1" style={{ position: "absolute", right: 11 }} />
                </label>

                {sort !== "alfabetik" && (
                  <button
                    type="button"
                    className="fon-direction-btn"
                    onClick={() => updateParams({ dir: sortDir === "asc" ? "desc" : "asc", page: "1" })}
                    aria-label="Sıralama yönünü değiştir"
                  >
                    <span>{sortDir === "asc" ? "Artan" : "Azalan"}</span>
                    <span style={{ color: "#60A5FA", fontSize: 15 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                  </button>
                )}
              </div>

              <div className="fon-meta-line">
                <span>Kaynak: TEFAS/Takasbank · Yatırım tavsiyesi değildir</span>
                <span>{aktifSiralamaMetni}</span>
              </div>

              <div className="fon-metric-tabs" aria-label="Fon metrikleri">
                {fonMetricTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = tab.activeKeys.includes(sort);
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => updateParams({ sort: tab.key, dir: null, page: "1" })}
                      className={`fon-metric-tab ${active ? "fon-metric-tab-active" : ""}`}
                      aria-pressed={active}
                    >
                      <Icon size={17} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="hisse-toolbar">
              <div className="hisse-siralama" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {siralamaOptions.map(s => (
                  <button
                    key={s.key}
                    onClick={() => updateParams({ sort: s.key, dir: null, page: "1" })}
                    className={`sort-btn ${sort === s.key ? "sort-btn-active" : "sort-btn-inactive"}`}
                  >
                    {s.label}
                  </button>
                ))}
                {gorunum === "isi" && (
                  <span style={{ fontSize: 12, color: "#475569" }}>Alfabetik sıralı · Renk: günlük değişim</span>
                )}
              </div>
              <div className="hisse-arama card-glass" style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 12, padding: "10px 14px", minWidth: 280, transition: "all 0.18s ease" }}>
                <Search size={16} color="#94A3B8" />
                <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Hisse kodu veya şirket adı ara..."
                  style={{ background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#F1F5F9", width: "100%" }} />
                {arama && <button onClick={() => setArama("")} aria-label="Aramayı temizle" style={{ background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.15)", color: "#94A3B8", cursor: "pointer", width: 24, height: 24, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}><X size={13} /></button>}
              </div>
            </div>
          )}

          {/* Isı Haritası */}
          {varlik === "hisse" && gorunum === "isi" && (
            <div>
              {isiYukleniyor && (
                <div style={{ padding: "80px 0", textAlign: "center", color: "#475569", fontSize: 13 }}>Yükleniyor...</div>
              )}
              {!isiYukleniyor && isiData.length > 0 && (() => {
                const filtreli = arama
                  ? isiData.filter(h => h.ticker.includes(arama.toUpperCase()) || h.ad.toUpperCase().includes(arama.toUpperCase()))
                  : isiData;
                return (
                  <>
                    {/* Renk skalası */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                      {[
                        { bg: "rgba(5,150,105,0.88)", label: "≥+5%" },
                        { bg: "rgba(16,185,129,0.50)", label: "+2%" },
                        { bg: "rgba(16,185,129,0.22)", label: "+0.5%" },
                        { bg: "rgba(16,185,129,0.08)", label: "0" },
                        { bg: "rgba(30,41,59,0.55)", label: "~0" },
                        { bg: "rgba(239,68,68,0.08)", label: "-0.5%" },
                        { bg: "rgba(239,68,68,0.22)", label: "-2%" },
                        { bg: "rgba(239,68,68,0.50)", label: "-5%" },
                        { bg: "rgba(185,28,28,0.88)", label: "≤-5%" },
                      ].map(item => (
                        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: item.bg, display: "inline-block", border: "1px solid rgba(255,255,255,0.06)" }} />
                          <span style={{ fontSize: 11, color: "#475569" }}>{item.label}</span>
                        </div>
                      ))}
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "#334155" }}>{filtreli.length} hisse</span>
                    </div>
                    <div className="isi-grid">
                      {filtreli.map(h => {
                        const renk = isiRenk(h.degisim);
                        const pozitif = (h.degisim ?? 0) >= 0;
                        return (
                          <div key={h.ticker} className="isi-hucre" onClick={() => router.push(`/hisse/${h.ticker}`)}
                            style={{ background: renk.bg, border: `1px solid ${renk.border}` }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: renk.text, margin: 0, letterSpacing: "-0.2px", textAlign: "center" }}>{h.ticker}</p>
                            {h.degisim !== null && (
                              <p style={{ fontSize: 11, fontWeight: 600, color: renk.text, margin: "3px 0 0", opacity: 0.9, textAlign: "center" }}>
                                {pozitif ? "▲" : "▼"} %{Math.abs(h.degisim).toFixed(2).replace(".", ",")}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {filtreli.length === 0 && (
                      <div style={{ padding: "60px 0", textAlign: "center", color: "#475569", fontSize: 13 }}>Sonuç bulunamadı</div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Tablo */}
          {gorunum === "tablo" && (
            <>
            <div className={`card-glass ${varlik === "fon" ? "fon-table-shell" : ""}`} style={{ borderRadius: 12, overflow: "hidden" }}>
              <div className={varlik === "fon" ? "fon-tablo-header" : "hisse-tablo-header"} style={{ display: "grid", gridTemplateColumns: tabloGrid, gap: varlik === "fon" ? 6 : 8, padding: varlik === "fon" ? "11px 14px" : "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.12)", background: "linear-gradient(180deg, rgba(59,130,246,0.04), rgba(255,255,255,0.005))" }}>
              {tabloBasliklari.map((h) => {
                const active = h.sort && sort === h.sort && sortDir;
                const alignRight = h.align === "right";
                if (!h.sort) {
                  return <p key={h.label} style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.1em", textAlign: alignRight ? "right" : "left", margin: 0, textTransform: "uppercase" }}>{h.label}</p>;
                }
                return (
                  <button
                    key={h.label}
                    onClick={() => handleHeaderSort(h.sort!)}
                    title={`${h.label} sıralaması`}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: alignRight ? "flex-end" : "flex-start", gap: 4, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: varlik === "fon" ? 10.5 : 11, fontWeight: 700, color: active ? "#60A5FA" : "#94A3B8", letterSpacing: "0.08em", textAlign: alignRight ? "right" : "left", textTransform: "uppercase", transition: "color 0.15s ease" }}
                  >
                    <span>{h.label}</span>
                    <span style={{ fontSize: 11, color: active ? "#60A5FA" : "#475569" }}>{active ? (sortDir === "desc" ? "↓" : "↑") : "↕"}</span>
                  </button>
                );
              })}
            </div>

            {yukleniyor && (
              <div style={{ padding: "70px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14, fontWeight: 500 }}>
                Yükleniyor...
              </div>
            )}

            {!yukleniyor && items.length === 0 && (
              <div style={{ padding: "70px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14, fontWeight: 500 }}>
                Sonuç bulunamadı
              </div>
            )}

            {!yukleniyor && varlik === "hisse" && hisseItems.map((hisse, i) => {
              const renk = tickerRenk(hisse.ticker);
              const globalNo = (page - 1) * pageSize + i + 1;
              return (
                <div key={hisse.ticker} className="hisse-row" onClick={() => router.push(`/hisse/${hisse.ticker}`)}
                  style={{ display: "grid", gridTemplateColumns: tabloGrid, gap: 8, padding: "14px 18px", borderBottom: "1px solid rgba(59,130,246,0.05)", cursor: "pointer", alignItems: "center", background: "transparent" }}>
                  <span className="col-no" style={{ fontSize: 12, color: "#64748B", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{globalNo}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <StockLogo ticker={hisse.ticker} domain={hisse.domain} size={30} radius={7} color={renk} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", margin: 0, letterSpacing: "-0.2px" }}>{hisse.ticker}</p>
                      <p style={{ fontSize: 11.5, color: "#94A3B8", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>{hisse.ad}</p>
                    </div>
                  </div>
                  <p className="col-fiyat" style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9", textAlign: "right", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                    {hisse.fiyat ? `${hisse.fiyat} ₺` : <span style={{ color: "#64748B", fontSize: 11, fontWeight: 500 }}>{hisse.veriDurumu || "Veri yok"}</span>}
                  </p>
                  <p className="col-gun" style={{ fontSize: 13, fontWeight: 700, textAlign: "right", margin: 0, fontVariantNumeric: "tabular-nums", color: hisse.degisim !== null ? (hisse.yukselis ? "#10B981" : "#EF4444") : "#475569" }}>
                    {hisse.degisim !== null ? `${hisse.yukselis ? "▲" : "▼"} %${Math.abs(Number(hisse.degisim)).toFixed(2).replace(".", ",")}` : "—"}
                  </p>
                  <p className="col-hacim" style={{ fontSize: 12.5, fontWeight: 600, textAlign: "right", margin: 0, fontVariantNumeric: "tabular-nums", color: hisse.hacim !== null && hisse.hacim > 0 ? "#CBD5E1" : "#475569" }}>
                    {formatHacim(hisse.hacim)}
                  </p>
                  <p className="col-islem-hacmi" style={{ fontSize: 12.5, fontWeight: 600, textAlign: "right", margin: 0, fontVariantNumeric: "tabular-nums", color: hisse.hacim !== null && hisse.fiyat ? "#A78BFA" : "#475569" }}>
                    {formatIslemHacmi(hisse.hacim, hisse.fiyat)}
                  </p>
                  <div className="hisse-mobile-returns">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)", fontSize: 12, color: "#DBEAFE", whiteSpace: "nowrap", fontWeight: 600 }}>
                      Hacim <span style={{ color: "#F1F5F9", fontVariantNumeric: "tabular-nums" }}>{formatHacim(hisse.hacim)}</span>
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", fontSize: 12, color: "#DDD6FE", whiteSpace: "nowrap", fontWeight: 600 }}>
                      İşlem <span style={{ color: "#F1F5F9", fontVariantNumeric: "tabular-nums" }}>{formatIslemHacmi(hisse.hacim, hisse.fiyat)}</span>
                    </span>
                    {[
                      ["1H", hisse.getiri_1h],
                      ["1A", hisse.getiri_1a],
                      ["3A", hisse.getiri_3a],
                      ["1Y", hisse.getiri_1y],
                    ].map(([label, value]) => (
                      <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(148,163,184,0.08)", fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
                        {label} {renderPercent(value)}
                      </span>
                    ))}
                  </div>
                  {(["getiri_1h","getiri_1a","getiri_3a","getiri_1y"] as const).map(key => {
                    const g = hisse[key];
                    const val = g !== null ? parseFloat(g) : null;
                    return (
                      <p key={key} className="col-getiri" style={{ fontSize: 12, fontWeight: 600, textAlign: "right", margin: 0, fontVariantNumeric: "tabular-nums", color: val === null ? "#475569" : val >= 0 ? "#10B981" : "#EF4444" }}>
                        {val === null ? "—" : `${val >= 0 ? "%" : "%-"}${Math.abs(val).toFixed(2).replace(".", ",")}`}
                      </p>
                    );
                  })}
                </div>
              );
            })}

            {!yukleniyor && varlik === "fon" && fonItems.map((fon, i) => {
              const globalNo = (page - 1) * pageSize + i + 1;
              const riskRenk = fon.risk_degeri === null ? "#475569" : fon.risk_degeri >= 6 ? "#EF4444" : fon.risk_degeri >= 4 ? "#F59E0B" : "#10B981";
              if (fonKapali) {
                return (
                  <div key={fon.kod} className="fon-row" onClick={() => router.push(`/fon/${fon.kod}`)}
                    style={{ display: "grid", gridTemplateColumns: tabloGrid, gap: 6, padding: "12px 14px", borderBottom: "1px solid rgba(59,130,246,0.05)", alignItems: "center", background: "transparent", cursor: "pointer" }}>
                    <span className="col-no" style={{ fontSize: 11, color: "#64748B", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{globalNo}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, rgba(20,184,166,0.18), rgba(59,130,246,0.1))", border: "1px solid rgba(20,184,166,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: "#99F6E4", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                        {fon.kod.slice(0, 2)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", margin: 0, letterSpacing: "-0.2px", lineHeight: 1.15 }}>{fon.kod}</p>
                        <p style={{ fontSize: 10.5, color: "#94A3B8", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1, lineHeight: 1.2 }}>{fon.unvan}</p>
                        {fon.kategori && <p style={{ fontSize: 10, color: "#14B8A6", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>{fon.kategori}</p>}
                      </div>
                    </div>
                    <p className="col-fiyat" style={{ fontSize: 12, fontWeight: 650, color: "#F1F5F9", textAlign: "right", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                      {fon.fiyat ? `${fon.fiyat} ₺` : <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 500 }}>Veri yok</span>}
                    </p>
                    <p className="col-gun" style={{ fontSize: 12, fontWeight: 700, textAlign: "right", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                      {renderPercent(fon.gunluk_getiri)}
                    </p>
                    {(["getiri_1h","getiri_1a","getiri_3a","getiri_6a","getiri_yb","getiri_1y"] as const).map(key => (
                      <p key={key} className="col-fon-getiri" style={{ fontSize: 12, fontWeight: 650, textAlign: "right", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                        {renderPercent(fon[key])}
                      </p>
                    ))}
                    <p className="col-fon-extra" style={{ fontSize: 12, fontWeight: 650, textAlign: "right", margin: 0, color: "#CBD5E1", fontVariantNumeric: "tabular-nums" }}>
                      {formatBuyukluk(fon.portfoy_buyukluk)}
                    </p>
                    <div className="hisse-mobile-returns">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.18)", fontSize: 12, color: "#CCFBF1", whiteSpace: "nowrap", fontWeight: 600 }}>
                        Büyüklük <span style={{ color: "#F1F5F9", fontVariantNumeric: "tabular-nums" }}>{formatBuyukluk(fon.portfoy_buyukluk)}</span>
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(148,163,184,0.08)", fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
                        Gün {renderPercent(fon.gunluk_getiri)}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(148,163,184,0.08)", fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
                        1A {renderPercent(fon.getiri_1a)}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(148,163,184,0.08)", fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
                        Yatırımcı sayısı {formatKisi(fon.kisi_sayisi)}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(148,163,184,0.08)", fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
                        Yıllık yönetim ücreti {formatUcret(fon.yonetim_ucreti_yillik)}
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <div key={fon.kod} className="fon-row" onClick={() => router.push(`/fon/${fon.kod}`)}
                  style={{ display: "grid", gridTemplateColumns: tabloGrid, gap: 6, padding: "11px 14px", borderBottom: "1px solid rgba(59,130,246,0.05)", alignItems: "center", background: "transparent", cursor: "pointer" }}>
                  <span className="col-no" style={{ fontSize: 11, color: "#64748B", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{globalNo}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, rgba(20,184,166,0.22), rgba(59,130,246,0.14))", border: "1px solid rgba(20,184,166,0.26)", display: "flex", alignItems: "center", justifyContent: "center", color: "#99F6E4", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                      {fon.kod.slice(0, 2)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", margin: 0, letterSpacing: "-0.2px", lineHeight: 1.15 }}>{fon.kod}</p>
                      <p style={{ fontSize: 10.5, color: "#94A3B8", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1, lineHeight: 1.2 }}>{fon.unvan}</p>
                      {fon.kategori && <p style={{ fontSize: 10, color: "#14B8A6", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>{fon.kategori}</p>}
                    </div>
                  </div>
                  <p className="col-fiyat" style={{ fontSize: 12, fontWeight: 650, color: "#F1F5F9", textAlign: "right", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                    {fon.fiyat ? `${fon.fiyat} ₺` : <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 500 }}>Veri yok</span>}
                  </p>
                  <p className="col-gun" style={{ fontSize: 12, fontWeight: 700, textAlign: "right", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                    {renderPercent(fon.gunluk_getiri)}
                  </p>
                  {(["getiri_1a","getiri_3a","getiri_6a","getiri_1y"] as const).map(key => (
                    <p key={key} className="col-fon-getiri" style={{ fontSize: 12, fontWeight: 650, textAlign: "right", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                      {renderPercent(fon[key])}
                    </p>
                  ))}
                  <p className="col-fon-extra" style={{ fontSize: 12, fontWeight: 800, textAlign: "right", margin: 0, color: riskRenk, fontVariantNumeric: "tabular-nums" }}>
                    {fon.risk_degeri ?? "—"}
                  </p>
                  <p className="col-fon-extra" style={{ fontSize: 12, fontWeight: 600, textAlign: "right", margin: 0, color: "#CBD5E1", fontVariantNumeric: "tabular-nums" }}>
                    {sort === "kisi"
                      ? formatKisi(fon.kisi_sayisi)
                      : sort === "ucret"
                        ? formatUcret(fon.yonetim_ucreti_yillik)
                        : formatBuyukluk(fon.portfoy_buyukluk)}
                  </p>
                  <div className="hisse-mobile-returns">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.18)", fontSize: 12, color: "#CCFBF1", whiteSpace: "nowrap", fontWeight: 600 }}>
                      Risk <span style={{ color: riskRenk }}>{fon.risk_degeri ?? "—"}</span>
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(148,163,184,0.08)", fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
                      Yatırımcı sayısı {formatKisi(fon.kisi_sayisi)}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(148,163,184,0.08)", fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
                      YB {renderPercent(fon.getiri_yb)}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(148,163,184,0.08)", fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
                      Yıllık yönetim ücreti {formatUcret(fon.yonetim_ucreti_yillik)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22, flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: 0, fontWeight: 500 }}>
              <span style={{ color: "#F1F5F9", fontWeight: 700 }}>
                {toplam === 0 ? "0" : `${(page - 1) * pageSize + 1} – ${Math.min(page * pageSize, toplam)}`}
              </span>
              <span style={{ color: "#64748B" }}> / {toplam} {varlik === "fon" ? "fon" : "hisse"}</span>
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => updateParams({ page: "1" })} disabled={page === 1} className="pg-btn">«</button>
              <button onClick={() => updateParams({ page: String(Math.max(1, page - 1)) })} disabled={page === 1} className="pg-btn">‹</button>
              {Array.from({ length: Math.min(5, toplamSayfa) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, toplamSayfa - 4)) + i;
                return (
                  <button key={p} onClick={() => updateParams({ page: String(p) })} className={`pg-btn ${page === p ? "pg-btn-active" : ""}`}>{p}</button>
                );
              })}
              <button onClick={() => updateParams({ page: String(Math.min(toplamSayfa, page + 1)) })} disabled={page === toplamSayfa} className="pg-btn">›</button>
              <button onClick={() => updateParams({ page: String(toplamSayfa) })} disabled={page === toplamSayfa} className="pg-btn">»</button>
            </div>
          </div>
            </>
          )}

        </main>
      </div>
    </AppShell>
  );
}

export default function HisselerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>}>
      <HisselerContent />
    </Suspense>
  );
}
