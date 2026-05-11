"use client";

import { useState } from "react";
import { usePollingFetch } from "@/hooks/usePollingFetch";

type RegimeTone = "positive" | "negative" | "neutral" | "selective";

type RegimeData = {
  mod: string;
  ton: RegimeTone;
  ozet: string;
  metrikler: {
    yukselen: number;
    dusen: number;
    yayilim: number;
    ortalamaDegisim: number;
    hacimCanliligi: string;
    kapsam: number;
  };
  liderler: { ticker: string; degisim: number }[];
  baski: { ticker: string; degisim: number }[];
};

const toneStyle: Record<RegimeTone, { color: string; bg: string; border: string; label: string }> = {
  positive: { color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.18)", label: "Güçlü" },
  negative: { color: "#F87171", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)", label: "Baskılı" },
  neutral: { color: "#94A3B8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.14)", label: "Dengeli" },
  selective: { color: "#A78BFA", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.18)", label: "Seçici" },
};

export default function DashboardMarketRegime() {
  const { data: rawData, loading } = usePollingFetch<RegimeData>("/api/piyasa-rejim", 300000);
  const data = rawData?.mod ? rawData : null;
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", minHeight: 96 }}>
        <div style={{ width: 130, height: 12, borderRadius: 4, background: "linear-gradient(90deg,#1E293B 25%,#2D3F55 50%,#1E293B 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", marginBottom: 12 }} />
        <div style={{ width: "70%", height: 22, borderRadius: 6, background: "linear-gradient(90deg,#1E293B 25%,#2D3F55 50%,#1E293B 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      </div>
    );
  }

  if (!data) return null;

  const style = toneStyle[data.ton] || toneStyle.neutral;
  const yayilim = Math.max(0, Math.min(100, data.metrikler.yayilim || 0));

  return (
    <div className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: open ? "12px 14px" : "10px 14px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.45) 30%, rgba(139,92,246,0.45) 70%, transparent 100%)" }} />
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 0, border: 0, background: "transparent", textAlign: "left", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(96,165,250,0.65)", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>Piyasa Rejimi</p>
          <span style={{ fontSize: 10, fontWeight: 800, color: style.color, background: style.bg, border: `1px solid ${style.border}`, borderRadius: 999, padding: "2px 7px" }}>{style.label}</span>
          {!open && <span style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 800 }}>{data.mod}</span>}
        </div>
        <span style={{ color: "#64748B", fontSize: 12, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.16s ease" }}>⌄</span>
      </button>

      {open && <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginTop: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: "#F8FAFC", fontSize: 20, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.3px" }}>{data.mod}</p>
          <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: 12, lineHeight: 1.45 }}>{data.ozet}</p>
        </div>
        <div style={{ minWidth: 140, textAlign: "right" }}>
          <p style={{ margin: 0, color: "#64748B", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Yayılım</p>
          <p style={{ margin: "2px 0 5px", color: style.color, fontSize: 18, fontWeight: 800 }}>{yayilim.toFixed(1)}%</p>
          <div style={{ height: 4, borderRadius: 999, background: "rgba(148,163,184,0.10)", overflow: "hidden" }}>
            <div style={{ width: `${yayilim}%`, height: "100%", background: style.color, opacity: 0.8 }} />
          </div>
        </div>
      </div>}
      {open && <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8, marginTop: 12 }}>
        {[
          { label: "Yükselen", value: data.metrikler.yukselen, color: "#10B981" },
          { label: "Düşen", value: data.metrikler.dusen, color: "#F87171" },
          { label: "Ort.", value: `${data.metrikler.ortalamaDegisim >= 0 ? "+" : ""}${data.metrikler.ortalamaDegisim.toLocaleString("tr-TR")}%`, color: style.color },
          { label: "Hacim", value: data.metrikler.hacimCanliligi, color: "#CBD5E1" },
        ].map((item) => (
          <div key={item.label} style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.018)", borderRadius: 8, padding: "8px 9px" }}>
            <p style={{ margin: 0, color: "#475569", fontSize: 10, fontWeight: 700 }}>{item.label}</p>
            <p style={{ margin: "3px 0 0", color: item.color, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>{item.value}</p>
          </div>
        ))}
      </div>}
    </div>
  );
}
