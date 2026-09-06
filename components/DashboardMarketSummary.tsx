"use client";

type PiyasaKey = "xu100" | "xu030" | "usd" | "eur" | "gram";
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
        <p style={{ fontSize: 12, fontWeight: 700, color: "#93C5FD", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>Piyasa Özeti</p>
        <span style={{ fontSize: 12, fontWeight: 700, color: acik ? "#10B981" : "#EF4444", background: acik ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${acik ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.04em" }}>
          {acik ? "● AÇIK" : "● KAPALI"}
        </span>
      </div>
      <div className="dash-piyasa-grid">
        {[
          { key: "xu100" as const, label: "XU100", val: piyasa.xu100.value, change: piyasa.xu100.change, up: !piyasa.xu100.change.startsWith("%-") && piyasa.xu100.change !== "-", gecikme: true },
          { key: "xu030" as const, label: "XU030", val: piyasa.xu030.value, change: piyasa.xu030.change, up: !piyasa.xu030.change.startsWith("%-") && piyasa.xu030.change !== "-", gecikme: true },
          { key: "usd" as const, label: "USD/TRY", val: piyasa.usd.value, change: piyasa.usd.change, up: !piyasa.usd.change.startsWith("%-") && piyasa.usd.change !== "-" },
          { key: "eur" as const, label: "EUR/TRY", val: piyasa.eur.value, change: piyasa.eur.change, up: !piyasa.eur.change.startsWith("%-") && piyasa.eur.change !== "-" },
          { key: "gram" as const, label: "GRAM ALTIN", val: piyasa.gram?.value ?? "-", change: piyasa.gram?.change ?? "-", up: !(piyasa.gram?.change ?? "-").startsWith("%-") && (piyasa.gram?.change ?? "-") !== "-", gecikme: true },
        ].map((e) => {
          const color = e.up ? "#10B981" : "#EF4444";
          const cardFlash = flash[e.key];
          const flashColor = cardFlash === "up" ? "#10B981" : cardFlash === "down" ? "#EF4444" : "transparent";
          const flashBg = cardFlash === "up" ? "rgba(16,185,129,0.10)" : cardFlash === "down" ? "rgba(239,68,68,0.10)" : "transparent";
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
            <div key={e.label} className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent 100%)" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, letterSpacing: "0.04em" }}>{e.label}</span>
                {e.gecikme && (
                  <span style={{ position: "relative", display: "inline-flex" }} className="g-tooltip-wrap">
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#F97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 3, padding: "1px 4px", lineHeight: 1.4, cursor: "default" }}>G</span>
                    <span style={{ position: "fixed", background: "#1E293B", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", padding: "4px 8px", borderRadius: 5, pointerEvents: "none", opacity: 0, transition: "opacity 0.15s", transform: "translateY(-28px)", zIndex: 9999 }} className="g-tooltip">15 dk gecikmeli</span>
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <div style={{ minWidth: 0 }}>
                  {e.val === "-" ? (
                    <>
                      <div style={{ width: 90, height: 22, borderRadius: 6, background: "linear-gradient(90deg,#1E293B 25%,#2D3F55 50%,#1E293B 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", marginBottom: 6 }} />
                      <div style={{ width: 56, height: 12, borderRadius: 4, background: "linear-gradient(90deg,#1E293B 25%,#2D3F55 50%,#1E293B 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                    </>
                  ) : (
                    <>
                      <div className="dash-piyasa-val" style={{ display: "inline-block", fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.6px", lineHeight: 1.2, borderRadius: 6, padding: "1px 4px", marginLeft: -4, whiteSpace: "nowrap", background: flashBg, boxShadow: cardFlash ? `0 0 8px ${flashColor}18` : "none", transition: "background 0.7s ease, box-shadow 0.7s ease" }}>{e.val}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color, display: "flex", alignItems: "center", gap: 2, marginTop: 3 }}>
                        <span>{e.up ? "▲" : "▼"}</span>
                        <span style={{ whiteSpace: "nowrap" }}>{e.change}</span>
                      </div>
                    </>
                  )}
                </div>
                <svg aria-hidden="true" className="h-6 w-full" preserveAspectRatio="none" viewBox={`0 0 ${w} ${h}`}>
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
