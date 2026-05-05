"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type DashboardHisse = {
  ticker: string;
  name: string;
  domain?: string;
};

type GrafikPoint = {
  tarih: string;
  fiyat: number;
};

type Props = {
  bistHisseler: DashboardHisse[];
  grafikTicker: string;
  grafikTickerLabel: string;
  grafikRange: string;
  grafikRangeDegisim: Record<string, number>;
  grafikArama: string;
  grafikDropdown: boolean;
  grafikYukleniyor: boolean;
  buyukGrafik: GrafikPoint[];
  grafikWidth: number;
  setGrafikContainerRef: (node: HTMLDivElement | null) => void;
  setGrafikTicker: (ticker: string) => void;
  setGrafikTickerLabel: (label: string) => void;
  setGrafikRange: (range: string) => void;
  setGrafikArama: (value: string) => void;
  setGrafikDropdown: (value: boolean | ((prev: boolean) => boolean)) => void;
  fetchBuyukGrafik: (range: string, ticker?: string) => void;
};

function normalizeGrafikTicker(value: string) {
  return value.endsWith(".IS") || value.includes("=X") ? value : `${value}.IS`;
}

export default function DashboardChartPanel({
  bistHisseler,
  grafikTicker,
  grafikTickerLabel,
  grafikRange,
  grafikRangeDegisim,
  grafikArama,
  grafikDropdown,
  grafikYukleniyor,
  buyukGrafik,
  grafikWidth,
  setGrafikContainerRef,
  setGrafikTicker,
  setGrafikTickerLabel,
  setGrafikRange,
  setGrafikArama,
  setGrafikDropdown,
  fetchBuyukGrafik,
}: Props) {
  const handleCustomTicker = () => {
    const t = normalizeGrafikTicker(grafikArama);
    setGrafikTicker(t);
    setGrafikTickerLabel(grafikArama.replace(".IS", ""));
    setGrafikDropdown(false);
    setGrafikArama("");
    fetchBuyukGrafik(grafikRange, t);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>Piyasa Grafiği</p>
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
                    onKeyDown={e => { if (e.key === "Enter" && grafikArama.length >= 2) handleCustomTicker(); }}
                    style={{ width: "100%", background: "#1E293B", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "6px 10px", color: "#F1F5F9", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                  />
                  {grafikArama.length >= 2 && (() => {
                    const sabit2 = ["XU100.IS","XU030.IS","USDTRY=X","EURTRY=X"];
                    const eslesmeler = [
                      ...sabit2.filter(t => t.includes(grafikArama)),
                      ...bistHisseler.filter(h => h.ticker.includes(grafikArama) || h.name.toUpperCase().includes(grafikArama))
                    ];
                    if (eslesmeler.length > 0) return null;
                    return (
                    <div
                      onClick={handleCustomTicker}
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
                    const bist = bistHisseler.map(h => ({ ticker: `${h.ticker}.IS`, label: `${h.ticker} — ${h.name}` }));
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
          {grafikRangeDegisim[grafikRange] !== undefined && (
            <span style={{ fontSize: 12, fontWeight: 700, color: grafikRangeDegisim[grafikRange] >= 0 ? "#10B981" : "#EF4444", background: grafikRangeDegisim[grafikRange] >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${grafikRangeDegisim[grafikRange] >= 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`, borderRadius: 6, padding: "3px 8px" }}>
              {grafikRangeDegisim[grafikRange] >= 0 ? "+" : ""}{grafikRangeDegisim[grafikRange].toFixed(2).replace(".", ",")}%
            </span>
          )}
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
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer", transition: "all 0.15s",
                background: grafikRange === r.value ? "#3B82F6" : "rgba(255,255,255,0.05)",
                color: grafikRange === r.value ? "#fff" : "#64748B" }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={setGrafikContainerRef} className="dash-surface" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12, padding: "16px 8px 8px 0", position: "relative", height: 280, minWidth: 0, boxSizing: "border-box" }}>
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
                <XAxis dataKey="tarih" tick={{ fontSize: 10, fill: "#334155" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
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
                <Area type="monotone" dataKey="fiyat" stroke={color} strokeWidth={1.5} fill="url(#grafikGrad)" dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />
              </AreaChart>
          ) : null;
        })()}
      </div>
    </div>
  );
}
