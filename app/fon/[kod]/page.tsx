"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "@/components/AppShell";
import { formatCurrency, formatNumber, formatPercent, formatQuantity } from "@/lib/formatters";
import { ArrowLeft, Database, FileText, LineChart, PieChart, Shield, Star, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";

type Fon = {
  kod: string;
  unvan: string;
  kategori: string | null;
  fiyat: number | null;
  gunluk_getiri: number | null;
  getiri_1a: number | null;
  getiri_3a: number | null;
  getiri_6a: number | null;
  getiri_1y: number | null;
  getiri_yb: number | null;
  getiri_3y: number | null;
  getiri_5y: number | null;
  risk_degeri: number | null;
  portfoy_buyukluk: number | null;
  kisi_sayisi: number | null;
  tedavuldeki_pay: number | null;
  yonetim_ucreti_yillik: number | null;
  toplam_gider_orani: number | null;
  veri_tarihi: string | null;
};

type HistoryPoint = {
  tarih: string;
  fiyat: number;
  portfoy_buyukluk: number | null;
  kisi_sayisi: number | null;
  tedavuldeki_pay: number | null;
};

type ApiResponse = {
  fon: Fon;
  history: HistoryPoint[];
  returns: Record<string, number | null>;
  range: string;
  portfoy: FonPortfoy | null;
};

type FonPortfoy = {
  kod: string;
  donem: string;
  yayinTarihi: string;
  toplamDeger: number;
  dagilim: Array<{
    ad: string;
    oran: number;
    renk: string;
  }>;
  pozisyonlar: Array<{
    kod: string;
    ad: string;
    tur: string;
    oran: number;
    deger: number;
  }>;
};

type FonTahmin = {
  kod: string;
  tahminiGetiri: number | null;
  kapsamOrani: number;
  toplamPortfoyOrani: number;
  hesaplananPozisyonSayisi: number;
  guncellemeZamani: string;
  pozisyonlar: Array<{
    kod: string;
    ad: string;
    tur: string;
    oran: number;
    fiyat: number | null;
    degisimYuzde: number | null;
    katkiPuan: number | null;
  }>;
};

const RANGE_OPTIONS = [
  { key: "1wk", label: "1H" },
  { key: "1mo", label: "1A" },
  { key: "3mo", label: "3A" },
  { key: "6mo", label: "6A" },
  { key: "ytd", label: "YBB" },
  { key: "1y", label: "1Y" },
];

type DetailTab = "ozet" | "portfoy" | "genel" | "gecmis";

function compactCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, { maximumFractionDigits: 2 })} Mr ₺`;
  if (value >= 1_000_000) return `${formatNumber(value / 1_000_000, { maximumFractionDigits: 1 })} Mn ₺`;
  return formatCurrency(value, { maximumFractionDigits: 0 });
}

function riskText(risk: number | null) {
  if (risk === null) return "—";
  if (risk >= 6) return `Çok yüksek (${risk})`;
  if (risk >= 4) return `Yüksek (${risk})`;
  if (risk >= 2) return `Orta (${risk})`;
  return `Düşük (${risk})`;
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function FundAvatar({ kod }: { kod: string }) {
  return (
    <div style={{ width: 58, height: 58, borderRadius: 16, background: "linear-gradient(135deg, rgba(20,184,166,0.24), rgba(59,130,246,0.18))", border: "1px solid rgba(20,184,166,0.32)", color: "#CCFBF1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 850, letterSpacing: "-0.4px", flexShrink: 0 }}>
      {kod.slice(0, 2)}
    </div>
  );
}

export default function FonPage({ params }: { params: Promise<{ kod: string }> }) {
  const { kod: kodParam } = use(params);
  const kod = kodParam.toLocaleUpperCase("tr-TR");
  const router = useRouter();
  const [range, setRange] = useState("1mo");
  const [activeTab, setActiveTab] = useState<DetailTab>("ozet");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [tahmin, setTahmin] = useState<FonTahmin | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFon = useCallback((nextRange: string, signal?: AbortSignal) => {
    setLoading(true);
    fetch(`/api/fon/${kod}?range=${nextRange}`, { signal, cache: "no-store" })
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setLoading(false);
      });
  }, [kod]);

  useEffect(() => {
    document.title = `${kod} Fon Detayı | ParaKonuşur`;
  }, [kod]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => fetchFon(range, controller.signal));
    return () => controller.abort();
  }, [fetchFon, range]);

  useEffect(() => {
    if (!data?.portfoy) return;

    let cancelled = false;
    const fetchTahmin = () => {
      fetch(`/api/fon-tahmin/${kod}`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null)
        .then((d: FonTahmin | null) => {
          if (!cancelled) setTahmin(d);
        })
        .catch(() => {
          if (!cancelled) setTahmin(null);
        });
    };

    fetchTahmin();
    const interval = window.setInterval(fetchTahmin, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [kod, data?.portfoy]);

  const fon = data?.fon;
  const portfoy = data?.portfoy ?? null;
  const history = data?.history ?? [];
  const pozitif = (fon?.gunluk_getiri ?? 0) >= 0;
  const rangeReturn = data?.returns?.[range === "1wk" ? "1h" : range === "1mo" ? "1a" : range === "3mo" ? "3a" : range === "6mo" ? "6a" : range === "ytd" ? "ybb" : "1y"] ?? null;
  const riskColor = fon?.risk_degeri === null || fon?.risk_degeri === undefined ? "#64748B" : fon.risk_degeri >= 6 ? "#EF4444" : fon.risk_degeri >= 4 ? "#F59E0B" : "#10B981";

  return (
    <AppShell>
      <div style={{ minHeight: "100vh", background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <style>{`
          .fon-detail-main { max-width: 1180px; margin: 0 auto; padding: 28px 30px 44px; }
          .fd-card { border: 1px solid rgba(59,130,246,0.12); background: linear-gradient(180deg, rgba(15,23,42,0.72), rgba(11,18,32,0.94)); border-radius: 14px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.035); }
          .fd-header { padding: 22px 24px; position: relative; overflow: hidden; }
          .fd-grid { display: grid; grid-template-columns: minmax(0,1.55fr) minmax(300px,0.75fr); gap: 18px; align-items: start; }
          .fd-metrics { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; margin-top: 18px; }
          .fd-metric { background: rgba(255,255,255,0.024); border: 1px solid rgba(148,163,184,0.09); border-radius: 11px; padding: 12px 13px; min-height: 70px; }
          .fd-tabs { display: flex; gap: 8px; margin: 18px 0; overflow-x: auto; padding-bottom: 2px; }
          .fd-tab { border: 1px solid rgba(148,163,184,0.12); background: rgba(255,255,255,0.035); color: #94A3B8; border-radius: 10px; padding: 9px 13px; font-size: 12px; font-weight: 750; display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; cursor: pointer; font-family: inherit; }
          .fd-tab-active { color: #CCFBF1; border-color: rgba(20,184,166,0.35); background: rgba(20,184,166,0.09); }
          .fd-panel { padding: 18px; }
          .fd-info-row { display: grid; grid-template-columns: 1fr auto; gap: 16px; padding: 11px 0; border-bottom: 1px solid rgba(148,163,184,0.07); }
          .fd-info-row:last-child { border-bottom: 0; }
          .fd-range { border: 1px solid rgba(148,163,184,0.11); background: rgba(255,255,255,0.035); color: #94A3B8; border-radius: 9px; padding: 7px 10px; font-size: 12px; font-weight: 800; cursor: pointer; }
          .fd-range-active { color: #CCFBF1; background: rgba(20,184,166,0.10); border-color: rgba(20,184,166,0.35); }
          .fd-portfolio-grid { display: grid; grid-template-columns: minmax(0,0.85fr) minmax(0,1.15fr); gap: 18px; }
          .fd-allocation { display: grid; gap: 13px; }
          .fd-allocation-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
          .fd-allocation-track { height: 8px; border-radius: 999px; background: rgba(148,163,184,0.12); overflow: hidden; }
          .fd-allocation-fill { height: 100%; border-radius: 999px; }
          .fd-position-row { display: grid; grid-template-columns: minmax(0,1.2fr) auto auto; gap: 14px; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(148,163,184,0.07); }
          .fd-position-row:last-child { border-bottom: 0; }
          .fd-estimate-grid { display: grid; grid-template-columns: minmax(0,0.9fr) minmax(0,1.1fr); gap: 12px; margin-bottom: 18px; }
          @media (max-width: 900px) {
            .fon-detail-main { padding: 18px 12px 32px; }
            .fd-grid { grid-template-columns: 1fr; }
            .fd-portfolio-grid { grid-template-columns: 1fr; }
            .fd-estimate-grid { grid-template-columns: 1fr; }
            .fd-position-row { grid-template-columns: minmax(0,1fr) auto; }
            .fd-position-value { display: none; }
            .fd-metrics { grid-template-columns: repeat(2,minmax(0,1fr)); }
            .fd-header { padding: 17px 15px; }
          }
        `}</style>

        <main className="fon-detail-main">
          <button onClick={() => router.push("/hisseler?varlik=fon")} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14, color: "#94A3B8", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(148,163,184,0.10)", borderRadius: 10, padding: "8px 11px", cursor: "pointer", fontSize: 12, fontWeight: 750 }}>
            <ArrowLeft size={15} /> Fonlara dön
          </button>

          <section className="fd-card fd-header">
            <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: "linear-gradient(90deg, transparent, rgba(20,184,166,0.55), rgba(59,130,246,0.45), transparent)" }} />
            {loading && !fon ? (
              <div style={{ height: 150, color: "#64748B", display: "flex", alignItems: "center" }}>Fon verisi yükleniyor...</div>
            ) : fon ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 15, minWidth: 0 }}>
                    <FundAvatar kod={fon.kod} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "#60A5FA", fontSize: 11, fontWeight: 750, letterSpacing: "0.11em", textTransform: "uppercase", margin: "0 0 7px" }}>TEFAS · Fon Detayı</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h1 style={{ color: "#F8FAFC", fontSize: 32, margin: 0, letterSpacing: "-0.7px", lineHeight: 1 }}>{fon.kod}</h1>
                        <button aria-label="Favorilere ekle" style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid rgba(148,163,184,0.14)", background: "rgba(255,255,255,0.035)", color: "#64748B", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          <Star size={16} />
                        </button>
                      </div>
                      <p style={{ color: "#CBD5E1", fontSize: 16, fontWeight: 720, margin: "7px 0 0", maxWidth: 720, lineHeight: 1.25 }}>{fon.unvan}</p>
                      {fon.kategori && <p style={{ color: "#14B8A6", fontSize: 12, margin: "6px 0 0", fontWeight: 650 }}>{fon.kategori}</p>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#F8FAFC", fontSize: 28, fontWeight: 850, letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(fon.fiyat, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
                    </div>
                    <div style={{ color: pozitif ? "#10B981" : "#EF4444", fontSize: 16, fontWeight: 800, marginTop: 4 }}>
                      {pozitif ? "↗ " : "↘ "}{formatPercent(fon.gunluk_getiri, { symbolPosition: "prefix", signDisplay: "never" })}
                    </div>
                    <p style={{ color: "#64748B", fontSize: 11, margin: "9px 0 0" }}>Kaynak: TEFAS/Takasbank</p>
                  </div>
                </div>

                <div className="fd-metrics">
                  {[
                    { label: "Risk", value: riskText(fon.risk_degeri), color: riskColor, icon: Shield },
                    { label: "Fon Değeri", value: compactCurrency(fon.portfoy_buyukluk), color: "#E2E8F0", icon: Wallet },
                    { label: "Yatırımcı Sayısı", value: formatQuantity(fon.kisi_sayisi), color: "#E2E8F0", icon: Users },
                    { label: "Yıllık Yönetim Ücreti", value: formatPercent(fon.yonetim_ucreti_yillik), color: "#E2E8F0", icon: Database },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="fd-metric">
                        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#64748B", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                          <Icon size={14} /> {item.label}
                        </div>
                        <div style={{ color: item.color, fontSize: 16, fontWeight: 830, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.value}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ color: "#94A3B8" }}>Fon bulunamadı.</div>
            )}
          </section>

          {fon && (
            <>
              <div className="fd-tabs">
                <button type="button" onClick={() => setActiveTab("ozet")} className={`fd-tab ${activeTab === "ozet" ? "fd-tab-active" : ""}`}><LineChart size={15} /> Özet</button>
                {portfoy && <button type="button" onClick={() => setActiveTab("portfoy")} className={`fd-tab ${activeTab === "portfoy" ? "fd-tab-active" : ""}`}><PieChart size={15} /> Portföy</button>}
                <button type="button" onClick={() => setActiveTab("genel")} className={`fd-tab ${activeTab === "genel" ? "fd-tab-active" : ""}`}><FileText size={15} /> Genel Bilgiler</button>
                <button type="button" onClick={() => setActiveTab("gecmis")} className={`fd-tab ${activeTab === "gecmis" ? "fd-tab-active" : ""}`}><Database size={15} /> Geçmiş Veriler</button>
              </div>

              {activeTab === "ozet" && (
                <section className="fd-grid">
                  <div className="fd-card fd-panel">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 15, flexWrap: "wrap" }}>
                      <div>
                        <h2 style={{ color: "#E2E8F0", fontSize: 15, margin: 0, fontWeight: 820 }}>Fiyat Grafiği</h2>
                        <p style={{ color: "#64748B", fontSize: 12, margin: "5px 0 0" }}>{rangeReturn !== null ? `Seçili dönem getirisi ${formatPercent(rangeReturn)}` : "Seçili dönem"}</p>
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {RANGE_OPTIONS.map((item) => (
                          <button key={item.key} onClick={() => setRange(item.key)} className={`fd-range ${range === item.key ? "fd-range-active" : ""}`}>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ width: "100%", height: 340 }}>
                      {history.length > 0 ? (
                        <ResponsiveContainer>
                          <AreaChart data={history} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="fonPriceFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" stopOpacity={0.26} />
                                <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                            <XAxis dataKey="tarih" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin", "dataMax"]} width={64} tickFormatter={(v) => formatNumber(Number(v), { maximumFractionDigits: 3 })} />
                            <Tooltip
                              contentStyle={{ background: "#111827", border: "1px solid rgba(20,184,166,0.22)", borderRadius: 10, color: "#E2E8F0" }}
                              labelStyle={{ color: "#94A3B8" }}
                              formatter={(value) => [formatCurrency(Number(value), { minimumFractionDigits: 4, maximumFractionDigits: 6 }), "Fiyat"]}
                            />
                            <Area type="monotone" dataKey="fiyat" stroke="#10B981" strokeWidth={2.5} fill="url(#fonPriceFill)" dot={false} activeDot={{ r: 4, fill: "#10B981" }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: "100%", border: "1px dashed rgba(148,163,184,0.16)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontSize: 13 }}>
                          Grafik verisi geçici olarak alınamadı
                        </div>
                      )}
                    </div>
                  </div>

                  <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div className="fd-card fd-panel">
                      <h2 style={{ color: "#94A3B8", fontSize: 13, letterSpacing: "0.11em", textTransform: "uppercase", margin: "0 0 14px", fontWeight: 850 }}>Getiri Bilgileri</h2>
                      {[
                        ["1H", data?.returns?.["1h"]],
                        ["1A", fon.getiri_1a],
                        ["3A", fon.getiri_3a],
                        ["6A", fon.getiri_6a],
                        ["YBB", fon.getiri_yb],
                        ["1Y", fon.getiri_1y],
                      ].map(([label, value]) => {
                        const num = typeof value === "number" ? value : null;
                        return (
                          <div key={label as string} className="fd-info-row">
                            <span style={{ color: "#64748B", fontSize: 13 }}>{label}</span>
                            <span style={{ color: num === null ? "#64748B" : num >= 0 ? "#10B981" : "#EF4444", fontSize: 14, fontWeight: 820 }}>{formatPercent(num)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="fd-card fd-panel">
                      <h2 style={{ color: "#94A3B8", fontSize: 13, letterSpacing: "0.11em", textTransform: "uppercase", margin: "0 0 14px", fontWeight: 850 }}>Genel Bilgiler</h2>
                      {[
                        ["Fon Kodu", fon.kod],
                        ["Kategori", fon.kategori ?? "—"],
                        ["Risk Değeri", riskText(fon.risk_degeri)],
                        ["Tedavüldeki Pay", formatQuantity(fon.tedavuldeki_pay)],
                        ["Toplam Gider Oranı", formatPercent(fon.toplam_gider_orani)],
                        ["Son Veri", history[history.length - 1]?.tarih ?? fon.veri_tarihi ?? "—"],
                      ].map(([label, value]) => (
                        <div key={label} className="fd-info-row">
                          <span style={{ color: "#64748B", fontSize: 13 }}>{label}</span>
                          <span style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 780, textAlign: "right", maxWidth: 210, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </aside>
                </section>
              )}

              {activeTab === "portfoy" && portfoy && (
                <section className="fd-card fd-panel">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ color: "#E2E8F0", fontSize: 16, margin: 0, fontWeight: 850 }}>Portföy Dağılımı</h2>
                      <p style={{ color: "#64748B", fontSize: 12, margin: "6px 0 0" }}>Son açıklanan portföy · {portfoy.donem}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#94A3B8", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Toplam Değer</div>
                      <div style={{ color: "#F8FAFC", fontSize: 18, fontWeight: 850, marginTop: 4 }}>{compactCurrency(portfoy.toplamDeger)}</div>
                    </div>
                  </div>

                  <div className="fd-estimate-grid">
                    <div style={{ border: "1px solid rgba(20,184,166,0.18)", background: "rgba(20,184,166,0.07)", borderRadius: 12, padding: 14 }}>
                      <div style={{ color: "#94A3B8", fontSize: 11, fontWeight: 850, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Bugünkü Tahmini Etki</div>
                      <div style={{ color: (tahmin?.tahminiGetiri ?? 0) >= 0 ? "#10B981" : "#EF4444", fontSize: 28, lineHeight: 1, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                        {formatPercent(tahmin?.tahminiGetiri ?? null, { signDisplay: "always" })}
                      </div>
                      <div style={{ color: "#64748B", fontSize: 12, marginTop: 9 }}>
                        BIST hisseleriyle hesaplandı · {formatTime(tahmin?.guncellemeZamani)}
                      </div>
                    </div>
                    <div style={{ border: "1px solid rgba(148,163,184,0.10)", background: "rgba(255,255,255,0.025)", borderRadius: 12, padding: 14 }}>
                      <div style={{ color: "#94A3B8", fontSize: 11, fontWeight: 850, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Hesaplanan Kapsam</div>
                      <div style={{ color: "#E2E8F0", fontSize: 18, fontWeight: 850 }}>
                        {formatPercent(tahmin?.kapsamOrani ?? null)} portföy ağırlığı
                      </div>
                      <div style={{ color: "#64748B", fontSize: 12, marginTop: 9 }}>
                        Fon içi fonlar ve nakit benzeri kalemler gün içi tahmine dahil değil.
                      </div>
                    </div>
                  </div>

                  {tahmin?.pozisyonlar && tahmin.pozisyonlar.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) auto auto auto", gap: 14, color: "#64748B", fontSize: 11, fontWeight: 850, letterSpacing: "0.08em", textTransform: "uppercase", paddingBottom: 8, borderBottom: "1px solid rgba(148,163,184,0.11)" }}>
                        <span>Gün İçi Katkı</span>
                        <span style={{ textAlign: "right" }}>Ağırlık</span>
                        <span style={{ textAlign: "right" }}>Gün %</span>
                        <span style={{ textAlign: "right" }}>Etki</span>
                      </div>
                      {tahmin.pozisyonlar.map((item) => (
                        <div key={`tahmin-${item.kod}`} className="fd-position-row" style={{ gridTemplateColumns: "minmax(0,1.1fr) auto auto auto" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <span style={{ color: "#CCFBF1", background: "rgba(20,184,166,0.10)", border: "1px solid rgba(20,184,166,0.24)", borderRadius: 8, padding: "4px 7px", fontSize: 12, fontWeight: 850 }}>{item.kod}</span>
                              <span style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 760, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.ad}</span>
                            </div>
                          </div>
                          <span style={{ color: "#94A3B8", fontSize: 13, fontWeight: 800, textAlign: "right" }}>{formatPercent(item.oran)}</span>
                          <span style={{ color: (item.degisimYuzde ?? 0) >= 0 ? "#10B981" : "#EF4444", fontSize: 13, fontWeight: 840, textAlign: "right" }}>{formatPercent(item.degisimYuzde, { signDisplay: "always" })}</span>
                          <span style={{ color: (item.katkiPuan ?? 0) >= 0 ? "#10B981" : "#EF4444", fontSize: 13, fontWeight: 860, textAlign: "right" }}>{formatPercent(item.katkiPuan, { signDisplay: "always" })}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="fd-portfolio-grid">
                    <div className="fd-allocation">
                      {portfoy.dagilim.map((item) => {
                        const isNegative = item.oran < 0;
                        return (
                          <div key={item.ad}>
                            <div className="fd-allocation-head">
                              <span style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 760 }}>{item.ad}</span>
                              <span style={{ color: isNegative ? "#F87171" : "#E2E8F0", fontSize: 13, fontWeight: 840, fontVariantNumeric: "tabular-nums" }}>
                                {formatPercent(item.oran)}
                              </span>
                            </div>
                            <div className="fd-allocation-track">
                              <div className="fd-allocation-fill" style={{ width: `${Math.min(Math.abs(item.oran), 100)}%`, background: item.renk, opacity: isNegative ? 0.66 : 0.9 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) auto auto", gap: 14, color: "#64748B", fontSize: 11, fontWeight: 850, letterSpacing: "0.08em", textTransform: "uppercase", paddingBottom: 8, borderBottom: "1px solid rgba(148,163,184,0.11)" }}>
                        <span>Pozisyon</span>
                        <span style={{ textAlign: "right" }}>Pay</span>
                        <span className="fd-position-value" style={{ textAlign: "right" }}>Değer</span>
                      </div>
                      {portfoy.pozisyonlar.map((item) => (
                        <div key={`${item.tur}-${item.kod}`} className="fd-position-row">
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <span style={{ color: "#CCFBF1", background: "rgba(20,184,166,0.10)", border: "1px solid rgba(20,184,166,0.24)", borderRadius: 8, padding: "4px 7px", fontSize: 12, fontWeight: 850 }}>{item.kod}</span>
                              <span style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 760, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.ad}</span>
                            </div>
                            <div style={{ color: "#64748B", fontSize: 12, marginTop: 5 }}>{item.tur}</div>
                          </div>
                          <span style={{ color: "#10B981", fontSize: 14, fontWeight: 850, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatPercent(item.oran)}</span>
                          <span className="fd-position-value" style={{ color: "#94A3B8", fontSize: 13, fontWeight: 780, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{compactCurrency(item.deger)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "genel" && (
                <section className="fd-card fd-panel">
                  <h2 style={{ color: "#E2E8F0", fontSize: 16, margin: "0 0 12px", fontWeight: 850 }}>Genel Bilgiler</h2>
                  {[
                    ["Fon Kodu", fon.kod],
                    ["Fon Adı", fon.unvan],
                    ["Kategori", fon.kategori ?? "—"],
                    ["Risk Değeri", riskText(fon.risk_degeri)],
                    ["Fon Değeri", compactCurrency(fon.portfoy_buyukluk)],
                    ["Yatırımcı Sayısı", formatQuantity(fon.kisi_sayisi)],
                    ["Tedavüldeki Pay", formatQuantity(fon.tedavuldeki_pay)],
                    ["Yıllık Yönetim Ücreti", formatPercent(fon.yonetim_ucreti_yillik)],
                    ["Toplam Gider Oranı", formatPercent(fon.toplam_gider_orani)],
                    ["Son Veri", history[history.length - 1]?.tarih ?? fon.veri_tarihi ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="fd-info-row">
                      <span style={{ color: "#64748B", fontSize: 13 }}>{label}</span>
                      <span style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 780, textAlign: "right", maxWidth: 680 }}>{value}</span>
                    </div>
                  ))}
                </section>
              )}

              {activeTab === "gecmis" && (
                <section className="fd-card fd-panel">
                  <h2 style={{ color: "#E2E8F0", fontSize: 16, margin: "0 0 12px", fontWeight: 850 }}>Geçmiş Veriler</h2>
                  {history.slice(-20).reverse().map((point) => (
                    <div key={`${point.tarih}-${point.fiyat}`} className="fd-info-row">
                      <span style={{ color: "#94A3B8", fontSize: 13 }}>{point.tarih}</span>
                      <span style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 800 }}>{formatCurrency(point.fiyat, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}</span>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </AppShell>
  );
}
