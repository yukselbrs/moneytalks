"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

type Maden = {
  kod: string; ad: string; birim: string; para_birimi: string;
  fiyat: number | null; degisim_yuzde: number | null;
  getiri_1h: number | null; getiri_1a: number | null; getiri_3a: number | null; getiri_1y: number | null;
};

const KOLONLAR: { key: keyof Maden; label: string }[] = [
  { key: "degisim_yuzde", label: "1G" },
  { key: "getiri_1h", label: "1H" },
  { key: "getiri_1a", label: "1A" },
  { key: "getiri_3a", label: "3A" },
  { key: "getiri_1y", label: "1Y" },
];

const GRID = "44px 1fr 128px 76px 76px 76px 76px 76px";

function fiyatFmt(v: number | null, para: string) {
  if (v === null || v === undefined) return "—";
  return `${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${para === "TRY" ? "₺" : "$"}`;
}

function Yuzde({ v }: { v: number | null }) {
  if (v === null || v === undefined) return <span style={{ color: "#475569" }}>—</span>;
  return (
    <span style={{ color: v >= 0 ? "#10B981" : "#EF4444", fontWeight: 600 }}>
      {`${v >= 0 ? "%" : "%-"}${Math.abs(v).toFixed(2).replace(".", ",")}`}
    </span>
  );
}

export default function MadenlerPage() {
  const router = useRouter();
  const [items, setItems] = useState<Maden[]>([]);
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    document.title = "Kıymetli Madenler — Gram Altın, Gümüş, Platin | ParaKonuşur";
    let iptal = false;
    const cek = () => fetch("/api/madenler", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (!iptal) { setItems(d.items || []); setYuklendi(true); } })
      .catch(() => { if (!iptal) setYuklendi(true); });
    cek();
    const t = setInterval(cek, 30000);
    return () => { iptal = true; clearInterval(t); };
  }, []);

  return (
    <AppShell>
    <div className="min-h-screen dot-grid" style={{ background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <style>{`
        .maden-row { display: grid; grid-template-columns: ${GRID}; align-items: center; gap: 10px; padding: 13px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: background 0.12s; }
        .maden-row:hover { background: rgba(245,158,11,0.04); }
        .maden-head { display: grid; grid-template-columns: ${GRID}; gap: 10px; padding: 10px 18px; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .maden-head span { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #64748B; }
        .maden-num { text-align: right; font-size: 13px; }
        @media (max-width: 640px) {
          .maden-row, .maden-head { grid-template-columns: 40px 1fr 96px 64px 64px; }
          .maden-col-3a, .maden-col-1y { display: none; }
        }
      `}</style>

      <main style={{ width: "100%", maxWidth: 1080, margin: "0 auto", padding: "32px 28px", boxSizing: "border-box" }}>
        <div className="animate-fade-up" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,158,11,0.8)", margin: 0 }}>Kıymetli Madenler</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#F1F5F9", margin: "4px 0 6px", letterSpacing: "-0.4px" }}>Altın, Gümüş ve Platin</h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: 0, maxWidth: 620 }}>
            Spot fiyatlar ~15 dk gecikmelidir; gram fiyatları USD/ons ve USD/TRY kurundan türetilir, fiziki piyasa fiyatından sapabilir.
          </p>
        </div>

        <div className="card-glass" style={{ borderRadius: 14, overflow: "hidden" }}>
          <div className="maden-head">
            <span />
            <span>Maden</span>
            <span className="maden-num">Fiyat</span>
            {KOLONLAR.map(k => (
              <span key={k.label} className={`maden-num ${k.label === "3A" ? "maden-col-3a" : k.label === "1Y" ? "maden-col-1y" : ""}`}>{k.label}</span>
            ))}
          </div>

          {items.map(m => (
            <div key={m.kod} className="maden-row" onClick={() => router.push(`/maden/${m.kod}`)}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, background: "rgba(245,158,11,0.1)", color: "#FBBF24", fontSize: 12, fontWeight: 800 }}>
                {m.ad.split(" ").map(k => k[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR")}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.2px" }}>{m.ad}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{m.birim === "gram" ? "Gram · TL (türetilmiş)" : "Ons · USD (spot)"}</div>
              </div>
              <span className="maden-num" style={{ fontWeight: 700, color: "#F1F5F9" }}>{fiyatFmt(m.fiyat, m.para_birimi)}</span>
              <span className="maden-num"><Yuzde v={m.degisim_yuzde} /></span>
              <span className="maden-num"><Yuzde v={m.getiri_1h} /></span>
              <span className="maden-num"><Yuzde v={m.getiri_1a} /></span>
              <span className="maden-num maden-col-3a"><Yuzde v={m.getiri_3a} /></span>
              <span className="maden-num maden-col-1y"><Yuzde v={m.getiri_1y} /></span>
            </div>
          ))}

          {yuklendi && items.every(m => m.fiyat === null) && (
            <p style={{ fontSize: 12, color: "#64748B", padding: "16px 18px", margin: 0 }}>
              Fiyatlar kısa süre içinde burada listelenecek (snapshot cron&apos;unun ilk çalışması bekleniyor).
            </p>
          )}
        </div>

        <p style={{ fontSize: 11, color: "#475569", textAlign: "center", marginTop: 24, lineHeight: 1.6 }}>
          Veriler bilgilendirme amaçlıdır; yatırım tavsiyesi değildir. Kaynak: COMEX spot (Yahoo Finance) + USD/TRY. 1G günlük, 1H haftalık, 1A/3A/1Y aylık/yıllık değişimdir.
        </p>
      </main>
    </div>
    </AppShell>
  );
}
