"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type GrafikPoint = { tarih: string; fiyat: number };

type Props = {
  grafik: GrafikPoint[];
  grafikRange: string;
  grafikDegisim: number | null;
  setGrafikRange: (range: string) => void;
  fetchGrafik: (range: string) => void;
};

const RANGE_LABELS: Record<string, string> = {
  "1d": "Günlük", "1wk": "Haftalık", "1mo": "Aylık", "3mo": "3 Aylık", "1y": "Yıllık",
};

const RANGE_BTNS = [["1d","1G"],["1wk","1H"],["1mo","1A"],["3mo","3A"],["1y","1Y"]] as [string,string][];

export default function HisseGrafik({ grafik, grafikRange, grafikDegisim, setGrafikRange, fetchGrafik }: Props) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div className="hisse-range-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 12, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
            {RANGE_LABELS[grafikRange]} Fiyat Grafiği
          </h2>
          {grafikDegisim !== null && (
            <span style={{ fontSize: 11, fontWeight: 600, color: grafikDegisim >= 0 ? "#10B981" : "#EF4444" }}>
              {grafikDegisim >= 0 ? "▲" : "▼"} %{Math.abs(grafikDegisim).toFixed(2).replace(".", ",")}
            </span>
          )}
        </div>
        <div className="hisse-range-btns" style={{ display: "flex", gap: 4 }}>
          {RANGE_BTNS.map(([val, label]) => (
            <button key={val} onClick={() => { setGrafikRange(val); fetchGrafik(val); }} style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5, border: "1px solid", cursor: "pointer", transition: "all 0.15s", background: grafikRange === val ? "#3B82F6" : "transparent", color: grafikRange === val ? "#fff" : "#64748B", borderColor: grafikRange === val ? "#3B82F6" : "rgba(255,255,255,0.08)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="hisse-chart-shell">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={grafik}>
            <defs>
              <linearGradient id="fiyatGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="tarih" tick={{ fontSize: 12, fill: "#334155" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[(dataMin: number) => Math.floor(dataMin * 0.995), (dataMax: number) => Math.ceil(dataMax * 1.005)]} tick={{ fontSize: 12, fill: "#334155" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} ₺`} width={55} />
            <Tooltip contentStyle={{ background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, fontSize: 12 }} formatter={(v: unknown) => [`${v} ₺`, "Fiyat"]} labelStyle={{ color: "#94A3B8" }} />
            <Area type="monotone" dataKey="fiyat" stroke="#3B82F6" strokeWidth={2} fill="url(#fiyatGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
