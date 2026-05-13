"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

type GrafikPoint = { tarih: string; fiyat: number };
type ChartPoint = GrafikPoint & { index: number };
type TooltipPayloadItem = { value?: number | string; payload?: ChartPoint };
type LastPriceDotProps = {
  cx?: number;
  cy?: number;
  index?: number;
  totalPoints: number;
  chartColor: string;
};
type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  acilisFiyati: number | null;
  degisimEtiketi: string;
  chartColor: string;
};

type Props = {
  grafik: GrafikPoint[];
  grafikRange: string;
  grafikDegisim: number | null;
  gunlukDusuk?: number | null;
  gunlukYuksek?: number | null;
  oncekiKapanis?: number | null;
  sonFiyat?: number | null;
  setGrafikRange: (range: string) => void;
  fetchGrafik: (range: string) => void;
};

const RANGE_LABELS: Record<string, string> = {
  "1d": "Günlük", "1wk": "Haftalık", "1mo": "Aylık", "3mo": "3 Aylık", "1y": "Yıllık",
};

const RANGE_BTNS = [["1d","1G"],["1wk","1H"],["1mo","1A"],["3mo","3A"],["1y","1Y"]] as [string,string][];

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

function LastPriceDot({ cx, cy, index, totalPoints, chartColor }: LastPriceDotProps) {
  if (cx === undefined || cy === undefined || index !== totalPoints - 1) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={chartColor}
      stroke="#0F172A"
      strokeWidth={2}
    />
  );
}

function ChartTooltip({ active, payload, label, acilisFiyati, degisimEtiketi, chartColor }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const rawFiyat = payload[0]?.payload?.fiyat ?? payload[0]?.value;
  const fiyat = typeof rawFiyat === "number" ? rawFiyat : Number(rawFiyat);
  const tlFark = acilisFiyati && Number.isFinite(fiyat) ? fiyat - acilisFiyati : null;
  const degisim = acilisFiyati && Number.isFinite(fiyat)
    ? ((fiyat - acilisFiyati) / acilisFiyati) * 100
    : null;
  const farkDirection = degisim === null || Math.abs(degisim) < 0.005 ? "flat" : degisim < 0 ? "down" : "up";
  const farkColor = farkDirection === "flat" ? "#94A3B8" : farkDirection === "down" ? "#EF4444" : "#10B981";

  return (
    <div style={{ background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 8, padding: "10px 12px", boxShadow: "0 12px 30px rgba(2,6,23,0.28)" }}>
      <p style={{ color: "#94A3B8", fontSize: 12, margin: "0 0 7px", fontWeight: 600 }}>{label}</p>
      <p style={{ color: chartColor, fontSize: 12, margin: "0 0 5px", fontWeight: 700 }}>
        Fiyat · {Number.isFinite(fiyat) ? formatPrice(fiyat) : "-"}
      </p>
      {degisim !== null && (
        <p style={{ color: farkColor, fontSize: 12, margin: 0, fontWeight: 700 }}>
          {degisimEtiketi} · {farkDirection === "flat" ? "" : farkDirection === "up" ? "▲ " : "▼ "}
          {tlFark !== null ? `${tlFark >= 0 ? "+" : "-"}${formatPrice(Math.abs(tlFark))} · ` : ""}
          %{Math.abs(degisim).toFixed(2).replace(".", ",")}
        </p>
      )}
    </div>
  );
}

export default function HisseGrafik({ grafik, grafikRange, grafikDegisim, gunlukDusuk, gunlukYuksek, oncekiKapanis, sonFiyat: sonFiyatProp, setGrafikRange, fetchGrafik }: Props) {
  const fiyatNoktalari = grafik.filter((p) => p.tarih !== "Önceki Kapanış" && p.fiyat > 0);
  const chartData = fiyatNoktalari.map((point, index) => ({ ...point, index }));
  const acilisFiyati = fiyatNoktalari[0]?.fiyat
    ?? grafik.find((p) => p.fiyat > 0)?.fiyat
    ?? null;
  const sonFiyat = sonFiyatProp ?? fiyatNoktalari.at(-1)?.fiyat ?? null;
  const enYuksek = grafikRange === "1d" && gunlukYuksek ? gunlukYuksek : fiyatNoktalari.length ? Math.max(...fiyatNoktalari.map((p) => p.fiyat)) : null;
  const enDusuk = grafikRange === "1d" && gunlukDusuk ? gunlukDusuk : fiyatNoktalari.length ? Math.min(...fiyatNoktalari.map((p) => p.fiyat)) : null;
  const referansFiyati = grafikRange === "1d"
    ? oncekiKapanis ?? acilisFiyati
    : acilisFiyati;
  const degisimEtiketi = grafikRange === "1d" ? "Değişim" : "Başlangıca göre";
  const referansDegisim = referansFiyati && sonFiyat !== null
    ? ((sonFiyat - referansFiyati) / referansFiyati) * 100
    : null;
  const gosterilenDegisim = grafikDegisim ?? referansDegisim;
  const chartDirection = gosterilenDegisim === null || Math.abs(gosterilenDegisim) < 0.005
    ? "flat"
    : gosterilenDegisim < 0
      ? "down"
      : "up";
  const chartColor = chartDirection === "flat" ? "#94A3B8" : chartDirection === "down" ? "#EF4444" : "#10B981";
  const chartGradientId = `fiyatGrad-${chartDirection}`;

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="hisse-range-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 12, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
            {RANGE_LABELS[grafikRange]} Fiyat Grafiği
          </h2>
          {gosterilenDegisim !== null && (
            <span style={{ fontSize: 11, fontWeight: 600, color: chartColor }}>
              {degisimEtiketi} · {chartDirection === "flat" ? "" : chartDirection === "up" ? "▲ " : "▼ "}
              %{Math.abs(gosterilenDegisim).toFixed(2).replace(".", ",")}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginBottom: 10 }}>
        {[
          [grafikRange === "1d" ? "Açılış" : "Başlangıç", acilisFiyati],
          ["Son", sonFiyat],
          ["Düşük", enDusuk],
          ["Yüksek", enYuksek],
        ].map(([label, value]) => (
          <div key={label as string} style={{ border: "1px solid rgba(59,130,246,0.12)", borderRadius: 8, background: "rgba(15,23,42,0.35)", padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, color: "#CBD5E1", fontWeight: 700 }}>{formatPrice(value as number | null)}</div>
          </div>
        ))}
      </div>
      <div className="hisse-chart-shell">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.18}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis
              dataKey="index"
              type="number"
              domain={[0, Math.max(chartData.length - 1, 0)]}
              ticks={chartData
                .filter((_, index) => index === 0 || index === chartData.length - 1 || index % Math.max(1, Math.floor(chartData.length / 8)) === 0)
                .map((point) => point.index)}
              tickFormatter={(value: number) => chartData[value]?.tarih ?? ""}
              tick={{ fontSize: 12, fill: "#334155" }}
              tickLine={false}
              axisLine={false}
              interval={0}
              padding={{ left: 0, right: 0 }}
            />
            <YAxis domain={[(dataMin: number) => Math.floor(dataMin * 0.995), (dataMax: number) => Math.ceil(dataMax * 1.005)]} tick={{ fontSize: 12, fill: "#334155" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} ₺`} width={55} />
            {referansFiyati !== null && (
              <ReferenceLine
                y={referansFiyati}
                stroke="rgba(148,163,184,0.34)"
                strokeDasharray="2 5"
                strokeWidth={1}
                ifOverflow="extendDomain"
              />
            )}
            <Tooltip content={<ChartTooltip acilisFiyati={referansFiyati} degisimEtiketi={degisimEtiketi} chartColor={chartColor} />} />
            <Area
              type="monotone"
              dataKey="fiyat"
              stroke={chartColor}
              strokeWidth={2}
              fill={`url(#${chartGradientId})`}
              dot={(props) => <LastPriceDot {...props} totalPoints={fiyatNoktalari.length} chartColor={chartColor} />}
              activeDot={{ r: 4, fill: chartColor, stroke: "#E2E8F0", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
