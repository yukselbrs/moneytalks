"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { EnstrumanIkon } from "@/components/EnstrumanIkon";

type Enstruman = {
  kod: string; tur: "doviz" | "maden"; ad: string; aciklama: string;
  birim: string | null; taban: string | null; karsi: string | null; para_birimi: string;
  fiyat: number | null; degisim_yuzde: number | null;
  getiri_1h: number | null; getiri_1a: number | null; getiri_3a: number | null;
  getiri_6a: number | null; getiri_1y: number | null; getiri_5y: number | null;
  kaynak?: string; updated_at?: string;
};

const KATEGORILER = [
  { key: "tumu", label: "Tümü" },
  { key: "doviz", label: "Döviz" },
  { key: "maden", label: "Kıymetli Maden" },
] as const;

const GETIRI_KOLONLARI: { key: keyof Enstruman; label: string }[] = [
  { key: "degisim_yuzde", label: "1G %" },
  { key: "getiri_1h", label: "1H %" },
  { key: "getiri_1a", label: "1A %" },
  { key: "getiri_3a", label: "3A %" },
  { key: "getiri_6a", label: "6A %" },
  { key: "getiri_1y", label: "1Y %" },
  { key: "getiri_5y", label: "5Y %" },
];

const PARA_SEMBOL: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€", JPY: "¥" };

// K4: kur <10 -> 4 hane (EUR/USD 1,1440), <100 -> 3, >=100 -> 2 (USD/JPY 162,40); maden 2 hane + sembol.
function fiyatFmt(v: number | null, tur: "doviz" | "maden", para: string) {
  if (v === null || v === undefined) return "—";
  const hane = tur === "doviz" ? (v < 10 ? 4 : v < 100 ? 3 : 2) : 2;
  const s = v.toLocaleString("tr-TR", { minimumFractionDigits: hane, maximumFractionDigits: hane });
  return tur === "doviz" ? s : `${s} ${PARA_SEMBOL[para] || para}`;
}

function Yuzde({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return <span style={{ color: "#475569" }}>—</span>;
  return (
    <span style={{ color: v >= 0 ? "#10B981" : "#EF4444", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
      {`${v >= 0 ? "%" : "%-"}${Math.abs(v).toFixed(2).replace(".", ",")}`}
    </span>
  );
}

function DovizMadenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kategoriParam = searchParams.get("kategori");
  const kategori = kategoriParam === "doviz" || kategoriParam === "maden" ? kategoriParam : "tumu";

  const [items, setItems] = useState<Enstruman[]>([]);
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    let iptal = false;
    const cek = () => fetch("/api/doviz-maden", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (!iptal) { setItems(d.items || []); setYuklendi(true); } })
      .catch(() => { if (!iptal) setYuklendi(true); });
    cek();
    const t = setInterval(cek, 30000);
    return () => { iptal = true; clearInterval(t); };
  }, []);

  const filtreli = kategori === "tumu" ? items : items.filter(e => e.tur === kategori);

  const setKategori = (k: string) => {
    router.replace(k === "tumu" ? "/doviz-maden" : `/doviz-maden?kategori=${k}`);
  };

  return (
    <AppShell>
      <div className="dot-grid" style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <style>{`
          .dm-shell { overflow-x: auto; }
          .dm-head, .dm-row { display: grid; grid-template-columns: 190px 108px 80px 80px 80px 80px 80px 80px 80px; gap: 8px; align-items: center; min-width: 880px; }
          .dm-head { padding: 13px 18px; border-bottom: 1px solid rgba(59,130,246,0.12); background: linear-gradient(180deg, rgba(59,130,246,0.04), rgba(255,255,255,0.005)); }
          .dm-head span { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #94A3B8; }
          .dm-row { padding: 13px 18px; border-bottom: 1px solid rgba(59,130,246,0.05); cursor: pointer; transition: background 0.15s ease, box-shadow 0.15s ease; }
          .dm-row:hover { background: rgba(59,130,246,0.07); box-shadow: inset 3px 0 0 #3B82F6; }
          .dm-num { text-align: right; font-variant-numeric: tabular-nums; }
          .dm-sticky { position: sticky; left: 0; z-index: 1; display: flex; align-items: center; gap: 11px; min-width: 0; }
          .dm-kategori-btn { padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.18s ease; letter-spacing: -0.1px; }
          .dm-kategori-inactive { background: rgba(148,163,184,0.04); border: 1px solid rgba(148,163,184,0.1); color: #94A3B8; }
          .dm-kategori-inactive:hover { background: rgba(59,130,246,0.06); border-color: rgba(59,130,246,0.3); color: #DBEAFE; transform: translateY(-1px); }
          .dm-kategori-active { background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(99,102,241,0.14)); border: 1px solid rgba(59,130,246,0.5); color: #DBEAFE; font-weight: 700; box-shadow: 0 4px 16px -4px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.06); }
          @media (max-width: 860px) {
            /* Yatay scroll + sabit ilk kolon (kolon gizleme YOK — tum kolonlar kaydirilarak gorulur) */
            .dm-sticky { background: #0D1526; box-shadow: 8px 0 12px -8px rgba(2,6,17,0.85); margin: -13px 0 -13px -18px; padding: 13px 8px 13px 18px; align-self: stretch; }
            .dm-row:hover .dm-sticky { background: #111C31; }
            .dm-head .dm-sticky { margin: -13px 0 -13px -18px; padding: 13px 8px 13px 18px; }
          }
          @media (max-width: 640px) { main { padding: 20px 14px !important; } }
        `}</style>

        <main style={{ width: "100%", maxWidth: 1080, margin: "0 auto", padding: "32px 28px", boxSizing: "border-box" }}>
          <div className="animate-fade-up" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: "#60A5FA", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                Piyasa · Döviz ve Kıymetli Maden
              </p>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.8px", margin: 0 }}>
                <span style={{ background: "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Döviz ve Kıymetli Maden
                </span>
              </h1>
              <p style={{ fontSize: 13, color: "#64748B", margin: "8px 0 0", maxWidth: 640, lineHeight: 1.5 }}>
                Kurlar bankalararası piyasadan; gram fiyatları USD/ons ve USD/TRY kurundan türetilir, banka gişe ve fiziki piyasa fiyatlarından sapabilir.
              </p>
            </div>
            <span className="delay-pill">15 dk gecikmeli veri</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {KATEGORILER.map(k => (
              <button
                key={k.key}
                onClick={() => setKategori(k.key)}
                className={`dm-kategori-btn ${kategori === k.key ? "dm-kategori-active" : "dm-kategori-inactive"}`}
              >
                {k.label}
              </button>
            ))}
          </div>

          <div className="card-glass dm-shell" style={{ borderRadius: 12, overflow: "hidden" }}>
            <div className="dm-head">
              <span className="dm-sticky">Enstrüman</span>
              <span className="dm-num" style={{ textAlign: "right" }}>Fiyat</span>
              {GETIRI_KOLONLARI.map(k => <span key={k.label} className="dm-num" style={{ textAlign: "right" }}>{k.label}</span>)}
            </div>

            {!yuklendi && (
              <div style={{ padding: "70px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14, fontWeight: 500 }}>Yükleniyor...</div>
            )}

            {yuklendi && filtreli.map(e => (
              <div key={e.kod} className="dm-row" onClick={() => router.push(`/doviz-maden/${e.kod}`)}>
                <div className="dm-sticky">
                  <EnstrumanIkon tur={e.tur} kod={e.kod} taban={e.taban} karsi={e.karsi} boyut={34} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", margin: 0, letterSpacing: "-0.2px" }}>{e.ad}</p>
                    <p style={{ fontSize: 11, color: "#64748B", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.aciklama}</p>
                  </div>
                </div>
                <span className="dm-num" style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>{fiyatFmt(e.fiyat, e.tur, e.para_birimi)}</span>
                {GETIRI_KOLONLARI.map(k => (
                  <span key={k.key} className="dm-num" style={{ fontSize: 12.5 }}><Yuzde v={e[k.key] as number | null} /></span>
                ))}
              </div>
            ))}

            {yuklendi && items.every(e => e.fiyat === null) && (
              <p style={{ fontSize: 12, color: "#64748B", padding: "16px 18px", margin: 0 }}>
                Fiyatlar kısa süre içinde burada listelenecek (snapshot cron&apos;unun ilk çalışması bekleniyor).
              </p>
            )}
          </div>

          <p style={{ fontSize: 11, color: "#475569", textAlign: "center", marginTop: 24, lineHeight: 1.6 }}>
            Veriler bilgilendirme amaçlıdır; yatırım tavsiyesi değildir. Kaynak: Yahoo Finance (bankalararası kur + COMEX spot), kesintide ECB günlük referans kuru.
            1G günlük, 1H haftalık, 1A/3A/6A/1Y aylık ve yıllık değişimdir.
          </p>
        </main>
      </div>
    </AppShell>
  );
}

export default function DovizMadenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>}>
      <DovizMadenContent />
    </Suspense>
  );
}
