"use client";

type PiyasaKey = "xu100" | "xu030" | "usd" | "eur";
type PiyasaYon = "up" | "down";

type PiyasaItem = {
  value: string;
  change: string;
};

type Props = {
  piyasa: Record<PiyasaKey, PiyasaItem>;
  sparklines: Record<string, number[]>;
  flash: Partial<Record<PiyasaKey, PiyasaYon>>;
};

function piyasaAcikMi() {
  const simdi = new Date();
  const trSaat = new Date(simdi.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  const saat = trSaat.getHours();
  const dakika = trSaat.getMinutes();
  const gun = trSaat.getDay();
  const zamanDk = saat * 60 + dakika;
  return gun >= 1 && gun <= 5 && zamanDk >= 10 * 60 && zamanDk < 18 * 60 + 15;
}

export default function DashboardMarketSummary({ piyasa, sparklines, flash }: Props) {
  const acik = piyasaAcikMi();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Piyasa Özeti</p>
        <span style={{ fontSize: 10, fontWeight: 700, color: acik ? "#10B981" : "#EF4444", background: acik ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${acik ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.04em" }}>
          {acik ? "● AÇIK" : "● KAPALI"}
        </span>
      </div>
      <div className="dash-piyasa-grid">
        {[
          { key: "xu100" as const, label: "XU100", val: piyasa.xu100.value, change: piyasa.xu100.change, up: !piyasa.xu100.change.startsWith("%-") && piyasa.xu100.change !== "-", gecikme: true },
          { key: "xu030" as const, label: "XU030", val: piyasa.xu030.value, change: piyasa.xu030.change, up: !piyasa.xu030.change.startsWith("%-") && piyasa.xu030.change !== "-", gecikme: true },
          { key: "usd" as const, label: "USD/TRY", val: piyasa.usd.value, change: piyasa.usd.change, up: !piyasa.usd.change.startsWith("%-") && piyasa.usd.change !== "-" },
          { key: "eur" as const, label: "EUR/TRY", val: piyasa.eur.value, change: piyasa.eur.change, up: !piyasa.eur.change.startsWith("%-") && piyasa.eur.change !== "-" },
        ].map((e) => {
          const color = e.up ? "#10B981" : "#EF4444";
          const cardFlash = flash[e.key];
          const flashColor = cardFlash === "up" ? "#10B981" : cardFlash === "down" ? "#EF4444" : "transparent";
          const flashBg = cardFlash === "up" ? "rgba(16,185,129,0.14)" : cardFlash === "down" ? "rgba(239,68,68,0.14)" : "transparent";
          const pts = (sparklines[e.label] || []).length > 1 ? sparklines[e.label] : [];
          const w = 90;
          const h = 36;
          const mn = pts.length > 1 ? Math.min(...pts) : 0;
          const mx = pts.length > 1 ? Math.max(...pts) : 1;
          const sx = (i: number) => (i / (pts.length - 1)) * w;
          const sy = (v: number) => h - ((v - mn) / (mx - mn + 1)) * h;
          const d = pts.length > 1 ? pts.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(v)}`).join(" ") : "";
          const area = d ? d + ` L ${w} ${h} L 0 ${h} Z` : "";

          return (
            <div key={e.label} className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4, position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>{e.label}</span>
                {e.gecikme && (
                  <span style={{ position: "relative", display: "inline-flex" }} className="g-tooltip-wrap">
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#F97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 3, padding: "1px 5px", lineHeight: 1.4, cursor: "default" }}>G</span>
                    <span style={{ position: "fixed", background: "#1E293B", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap", padding: "4px 8px", borderRadius: 5, pointerEvents: "none", opacity: 0, transition: "opacity 0.15s", transform: "translateY(-28px)", zIndex: 9999 }} className="g-tooltip">15 dk gecikmeli</span>
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
                <div>
                  {e.val === "-" ? (
                    <>
                      <div style={{ width: 110, height: 24, borderRadius: 6, background: "linear-gradient(90deg,#1E293B 25%,#2D3F55 50%,#1E293B 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", marginBottom: 8 }} />
                      <div style={{ width: 64, height: 14, borderRadius: 4, background: "linear-gradient(90deg,#1E293B 25%,#2D3F55 50%,#1E293B 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                    </>
                  ) : (
                    <>
                      <div className="dash-piyasa-val" style={{ display: "inline-block", fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.8px", lineHeight: 1.2, borderRadius: 7, padding: "1px 5px", marginLeft: -5, background: flashBg, boxShadow: cardFlash ? `0 0 0 1px ${flashColor}33, 0 0 18px ${flashColor}24` : "none", transition: "background 0.35s ease, box-shadow 0.35s ease" }}>{e.val}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color, display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                        <span>{e.up ? "▲" : "▼"}</span>
                        <span>{e.change}</span>
                      </div>
                    </>
                  )}
                </div>
                <svg width="90" height="36" viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
                  <defs>
                    <linearGradient id={`sg-${e.label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
                      <stop offset="100%" stopColor={color} stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {area && <path d={area} fill={`url(#sg-${e.label})`}/>}
                  {d && <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
