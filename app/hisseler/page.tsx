"use client";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import StockLogo from "@/components/StockLogo";
import { Search, X, LayoutGrid, AlignJustify } from "lucide-react";
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

type ApiResponse = {
  items: Hisse[];
  total: number;
  page: number;
  pageSize: number;
};

const SIRALAMA_OPTIONS = [
  { key: "alfabetik", label: "A-Z", short: "A-Z" },
  { key: "yukselis", label: "Yükselenler", short: "Yükselen" },
  { key: "dusus", label: "Düşenler", short: "Düşen" },
  { key: "hacim", label: "Hacim" },
  { key: "1wk", label: "1H %" },
  { key: "1mo", label: "1A %" },
  { key: "3mo", label: "3A %" },
  { key: "1y", label: "1Y %" },
];

const TABLO_BASLIKLARI = [
  { label: "#", align: "left" },
  { label: "HİSSE", align: "left" },
  { label: "FİYAT", sort: "fiyat", align: "right" },
  { label: "GÜN %", sort: "gun", align: "right" },
  { label: "HACİM", sort: "hacim", align: "right" },
  { label: "İŞLEM HACMİ", align: "right" },
  { label: "1H %", sort: "1wk", align: "right" },
  { label: "1A %", sort: "1mo", align: "right" },
  { label: "3A %", sort: "3mo", align: "right" },
  { label: "1Y %", sort: "1y", align: "right" },
];

function HisselerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sort = searchParams.get("sort") || "alfabetik";
  const dirParam = searchParams.get("dir");
  const sortDir = dirParam === "asc" || dirParam === "desc" ? dirParam : null;
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const q = searchParams.get("q") || "";

  const [gorunum, setGorunum] = useState<"tablo" | "isi">("tablo");
  const [arama, setArama] = useState(q);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [isiData, setIsiData] = useState<IsiHisse[]>([]);
  const [isiYukleniyor, setIsiYukleniyor] = useState(false);

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

  // Arama input → URL (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (arama !== q) {
        updateParams({ q: arama || null, page: "1" });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [arama, q, updateParams]);

  // URL değişince data fetch
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    queueMicrotask(() => setYukleniyor(true));
    const params = new URLSearchParams({ sort, page: String(page) });
    if (sortDir) params.set("dir", sortDir);
    if (q) params.set("q", q);
    fetch(`/api/hisseler?${params.toString()}`, { signal: controller.signal })
      .then(r => r.json())
      .then((d: ApiResponse) => {
        if (!ignore) {
          setData(d);
          setYukleniyor(false);
        }
      })
      .catch((error) => {
        if (!ignore && error?.name !== "AbortError") setYukleniyor(false);
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [sort, sortDir, page, q]);

  // Isı haritası verisi — bir kez çek, cache'le
  useEffect(() => {
    if (gorunum !== "isi" || isiData.length > 0) return;
    queueMicrotask(() => setIsiYukleniyor(true));
    fetch("/api/hisseler?heatmap=true")
      .then(r => r.json())
      .then((d: { items: IsiHisse[] }) => { setIsiData(d.items || []); setIsiYukleniyor(false); })
      .catch(() => setIsiYukleniyor(false));
  }, [gorunum, isiData.length]);

  const items = data?.items || [];
  const toplam = data?.total || 0;
  const pageSize = data?.pageSize || 25;
  const toplamSayfa = Math.max(1, Math.ceil(toplam / pageSize));
  const aktifSiralama = SIRALAMA_OPTIONS.find((s) => s.key === sort);
  const aktifSiralamaMetni = aktifSiralama
    ? `${aktifSiralama.label}${sortDir ? ` ${sortDir === "desc" ? "azalan" : "artan"}` : ""}`
    : "A-Z";

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
          .hisse-toolbar { display: grid; grid-template-columns: minmax(0,1fr) 360px; gap: 14px; align-items: center; margin-bottom: 18px; }
          .sort-btn { position: relative; padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.18s ease; letter-spacing: -0.1px; }
          .sort-btn-inactive { background: rgba(148,163,184,0.04); border: 1px solid rgba(148,163,184,0.1); color: #94A3B8; }
          .sort-btn-inactive:hover { background: rgba(59,130,246,0.06); border-color: rgba(59,130,246,0.3); color: #DBEAFE; transform: translateY(-1px); }
          .sort-btn-active { background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(99,102,241,0.14)); border: 1px solid rgba(59,130,246,0.5); color: #DBEAFE; font-weight: 700; box-shadow: 0 4px 16px -4px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.06); }
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
            .hisse-row { display: grid !important; grid-template-columns: 1fr auto !important; gap: 10px !important; margin-bottom: 8px; padding: 13px 14px !important; border: 1px solid rgba(59,130,246,0.08) !important; border-radius: 12px; background: rgba(255,255,255,0.012) !important; }
            .hisse-row .col-no { display: none !important; }
            .hisse-row .col-hacim { display: none !important; }
            .hisse-row .col-islem-hacmi { display: none !important; }
            .hisse-row .col-getiri { display: none !important; }
            .hisse-row .col-gun { text-align: right !important; align-self: end; }
            .hisse-row .col-fiyat { text-align: right !important; align-self: start; }
            .hisse-mobile-returns { display: flex !important; grid-column: 1 / -1; gap: 6px; overflow-x: auto; padding-top: 2px; }
            .hisse-arama { min-width: unset !important; width: 100% !important; }
            .hisse-siralama { overflow-x: auto; flex-wrap: nowrap !important; padding-bottom: 4px; }
          }
        `}</style>
        <main style={{ maxWidth: 1440, margin: "0 auto", padding: "32px 40px" }}>

          {/* Başlık */}
          <div className="animate-fade-up" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: "#60A5FA", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>BIST · Tüm Hisseler</p>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.8px", display: "flex", alignItems: "center", gap: 12, margin: 0 }}>
                <span style={{ background: "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Hisseler
                </span>
                <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.06))", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 999, padding: "4px 12px" }}>
                  {yukleniyor ? "..." : `${toplam} hisse`}
                </span>
              </h1>
            </div>
            <div style={{ fontSize: 12, color: "#64748B", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <span style={{ color: "#94A3B8" }}>Aktif:</span>
              <span style={{ color: "#DBEAFE", fontWeight: 600, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 999, padding: "3px 10px" }}>{aktifSiralamaMetni}</span>
              {q && <span style={{ color: "#60A5FA", fontWeight: 500 }}>Arama: {q}</span>}
            </div>
          </div>

          <div className="hisse-toolbar">
            <div className="hisse-siralama" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {SIRALAMA_OPTIONS.map(s => (
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

          {/* Isı Haritası */}
          {gorunum === "isi" && (
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
            <div className="card-glass" style={{ borderRadius: 12, overflow: "hidden" }}>
              <div className="hisse-tablo-header" style={{ display: "grid", gridTemplateColumns: "44px 1fr 100px 84px 92px 120px 76px 76px 76px 76px", gap: 8, padding: "13px 18px", borderBottom: "1px solid rgba(59,130,246,0.12)", background: "linear-gradient(180deg, rgba(59,130,246,0.04), rgba(255,255,255,0.005))" }}>
              {TABLO_BASLIKLARI.map((h) => {
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
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: alignRight ? "flex-end" : "flex-start", gap: 5, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 700, color: active ? "#60A5FA" : "#94A3B8", letterSpacing: "0.1em", textAlign: alignRight ? "right" : "left", textTransform: "uppercase", transition: "color 0.15s ease" }}
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

            {!yukleniyor && items.map((hisse, i) => {
              const renk = tickerRenk(hisse.ticker);
              const globalNo = (page - 1) * pageSize + i + 1;
              return (
                <div key={hisse.ticker} className="hisse-row" onClick={() => router.push(`/hisse/${hisse.ticker}`)}
                  style={{ display: "grid", gridTemplateColumns: "44px 1fr 100px 84px 92px 120px 76px 76px 76px 76px", gap: 8, padding: "14px 18px", borderBottom: "1px solid rgba(59,130,246,0.05)", cursor: "pointer", alignItems: "center", background: "transparent" }}>
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
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22, flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: 0, fontWeight: 500 }}>
              <span style={{ color: "#F1F5F9", fontWeight: 700 }}>
                {toplam === 0 ? "0" : `${(page - 1) * pageSize + 1} – ${Math.min(page * pageSize, toplam)}`}
              </span>
              <span style={{ color: "#64748B" }}> / {toplam} hisse</span>
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
