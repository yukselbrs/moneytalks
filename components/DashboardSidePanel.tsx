"use client";

import { useState } from "react";
import RiskProfilWidget from "@/components/RiskProfilWidget";

type PortfolioSummary = {
  toplamMaliyet: number;
  toplamGuncel: number;
  toplamPL: number;
  toplamPLYuzde: number;
  gunlukPL: number;
  gunlukPLYuzde: number;
  hisseSayisi: number;
  hisseDagilim?: { ticker: string; deger: number; yuzde: number; renk: string }[];
};

type TopMover = {
  ticker: string;
  fiyat: string;
  degisim: number;
};

type TopMovers = {
  yukselenler: TopMover[];
  dusenler: TopMover[];
};

type MarketNews = {
  ticker: string;
  title: string;
  time: string;
};

type DashboardSidePanelProps = {
  portfoyOzet: PortfolioSummary | null;
  topMovers: TopMovers | null;
  kap: MarketNews[];
  goToHisse: (ticker: string) => void;
};

function PortfolioSummaryCard({ portfoyOzet }: { portfoyOzet: PortfolioSummary | null }) {
  const [mod, setMod] = useState<"total" | "daily">("total");
  const [infoTip, setInfoTip] = useState<{ x: number; y: number } | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!portfoyOzet) {
    return (
      <div className="dash-surface" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, padding: "20px 16px", marginBottom: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>▥</div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginBottom: 4 }}>Portföyünüzü Takip Edin</p>
          <p style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5 }}>Hisselerinizi ekleyin, kâr/zarar ve dağılımı anlık görün.</p>
        </div>
        <a href="/portfoy" style={{ display: "inline-block", background: "#3B82F6", color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>Portföy Oluştur →</a>
      </div>
    );
  }

  const aktifPL = mod === "daily" ? portfoyOzet.gunlukPL : portfoyOzet.toplamPL;
  const aktifPLYuzde = mod === "daily" ? portfoyOzet.gunlukPLYuzde : portfoyOzet.toplamPLYuzde;
  const aktifLabel = mod === "daily" ? "Günlük Getiri" : "Toplam Getiri";
  const aktifPozitif = aktifPL >= 0;

  return (
    <div className="dash-surface" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 0 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", margin: 0, whiteSpace: "nowrap" }}>Portföy Özeti</h2>
            <span style={{ position: "relative", display: "inline-flex" }} className="g-tooltip-wrap">
              <span style={{ fontSize: 11, fontWeight: 700, color: "#F97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 3, padding: "1px 5px", lineHeight: 1.4, cursor: "default" }}>G</span>
              <span style={{ position: "fixed", background: "#1E293B", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", padding: "4px 8px", borderRadius: 5, pointerEvents: "none", opacity: 0, transition: "opacity 0.15s", transform: "translateY(-28px)", zIndex: 9999 }} className="g-tooltip">15 dk gecikmeli</span>
            </span>
            <button
              type="button"
              aria-label="Günlük getiri açıklaması"
              onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setInfoTip({ x: r.left + r.width / 2, y: r.top - 8 }); }}
              onMouseLeave={() => setInfoTip(null)}
              style={{ width: 15, height: 15, borderRadius: "50%", border: "1px solid rgba(148,163,184,0.3)", background: "rgba(148,163,184,0.08)", color: "#64748B", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, cursor: "help", padding: 0, flexShrink: 0 }}
            >
              i
            </button>
            {infoTip && (
              <div style={{ position: "fixed", left: infoTip.x, top: infoTip.y, transform: "translate(-50%, -100%)", width: 210, background: "#0F172A", border: "1px solid rgba(59,130,246,0.2)", color: "#94A3B8", fontSize: 11, fontWeight: 500, lineHeight: 1.5, padding: "8px 10px", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", pointerEvents: "none", zIndex: 9999 }}>
                Günlük getiri, hisselerin portföydeki ağırlığına göre hesaplanır.
              </div>
            )}
          </div>
          <a href="/portfoy" style={{ fontSize: 11, color: "#3B82F6", textDecoration: "none", whiteSpace: "nowrap" }}>Tümü →</a>
        </div>
        <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.10)", borderRadius: 7, padding: 2 }}>
          {[
            { key: "daily" as const, label: "Günlük" },
            { key: "total" as const, label: "Total" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setMod(item.key)}
              style={{ border: "none", borderRadius: 5, padding: "3px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: mod === item.key ? "#3B82F6" : "transparent", color: mod === item.key ? "#fff" : "#64748B" }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: "#64748B", marginBottom: 4, fontWeight: 500 }}>Toplam Değer</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.8px" }}>
          {portfoyOzet.toplamGuncel.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
        </p>
        <p style={{ fontSize: 12, color: "#475569", marginTop: 5, marginBottom: 1 }}>{aktifLabel}</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: aktifPozitif ? "#10B981" : "#EF4444", marginTop: 2 }}>
          {aktifPLYuzde >= 0 ? "%" : "%-"}{Math.abs(aktifPLYuzde).toFixed(2).replace(".", ",")} ({aktifPL >= 0 ? "+" : ""}{aktifPL.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺)
        </p>
      </div>

      {portfoyOzet.hisseDagilim && portfoyOzet.hisseDagilim.length > 0 && (() => {
        const R = 36, cx = 46, cy = 46, sw = 10, GAP = 1.5;
        const circ = 2 * Math.PI * R;
        const topDilims = portfoyOzet.hisseDagilim!.slice(0, 3);
        const digerDilims = portfoyOzet.hisseDagilim!.slice(3);
        const digerYuzde = digerDilims.reduce((a, h) => a + h.yuzde, 0);
        const grafikDilims = digerYuzde > 0
          ? [...topDilims, { ticker: "Diğer", deger: digerDilims.reduce((a, h) => a + h.deger, 0), yuzde: digerYuzde, renk: "#475569" }]
          : topDilims;
        const digerEtiket = digerDilims.map((h) => h.ticker).join(" · ");
        let accDl = 0;
        const segs = grafikDilims.map((h) => {
          const dl = (h.yuzde / 100) * circ;
          const dashOff = circ * 0.25 - accDl;
          const visLen = Math.max(0, dl - GAP);
          const startRad = ((accDl / circ) * 360 - 90) * (Math.PI / 180);
          const endRad = (((accDl + dl) / circ) * 360 - 90) * (Math.PI / 180);
          const x1 = (cx + R * Math.cos(startRad)).toFixed(2);
          const y1 = (cy + R * Math.sin(startRad)).toFixed(2);
          const x2 = (cx + R * Math.cos(endRad)).toFixed(2);
          const y2 = (cy + R * Math.sin(endRad)).toFixed(2);
          const hitPath = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${dl / circ > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`;
          accDl += dl;
          return { ...h, dashOff, visLen, hitPath };
        });
        const hov = hoveredIdx !== null ? segs[hoveredIdx] : null;

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <svg width="92" height="92" viewBox="0 0 92 92" style={{ flexShrink: 0 }}>
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
              {segs.map((seg, i) => (
                <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                  stroke={seg.renk}
                  strokeWidth={hoveredIdx === i ? sw + 4 : sw}
                  strokeDasharray={`${seg.visLen} ${circ - seg.visLen}`}
                  strokeDashoffset={seg.dashOff}
                  strokeLinecap="butt"
                  style={{ transition: "stroke-width 0.15s ease" }}
                />
              ))}
              {segs.map((seg, i) => (
                <path key={`h${i}`} d={seg.hitPath} fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: "pointer" }}
                />
              ))}
              {hov && (
                <>
                  <text x={cx} y={cy - 4} textAnchor="middle" fontSize="8" fill="#CBD5E1" fontWeight="700" fontFamily="sans-serif">{hov.ticker}</text>
                  <text x={cx} y={cy + 7} textAnchor="middle" fontSize="9" fill={hov.renk} fontWeight="700" fontFamily="sans-serif">%{hov.yuzde.toFixed(1)}</text>
                </>
              )}
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              {topDilims.map((h, i) => (
                <div key={`${h.ticker}-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: h.renk }} />
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>{h.ticker}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#64748B" }}>%{h.yuzde.toFixed(1)}</span>
                </div>
              ))}
              {digerDilims.length > 0 && (
                <div style={{ borderTop: "1px solid rgba(71,85,105,0.22)", marginTop: 2, paddingTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#475569" }} />
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>Diğer</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#64748B" }}>%{digerYuzde.toFixed(1)}</span>
                  </div>
                  <div style={{ marginLeft: 10, marginTop: 2, maxWidth: 118, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: "#475569" }}>
                    {digerEtiket}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { label: "Ana Para", value: `${portfoyOzet.toplamMaliyet.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`, color: "#F1F5F9" },
          { label: mod === "daily" ? "Günlük ₺" : "K/Z ₺", value: `${aktifPL >= 0 ? "+" : ""}${aktifPL.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`, color: aktifPozitif ? "#10B981" : "#EF4444" },
          { label: "Hisse", value: `${portfoyOzet.hisseSayisi} hisse`, color: "#F1F5F9" },
          { label: mod === "daily" ? "Günlük" : "Getiri", value: `${aktifPLYuzde >= 0 ? "+" : ""}${aktifPLYuzde.toFixed(2)}%`, color: aktifPozitif ? "#10B981" : "#EF4444" },
        ].map((item) => (
          <div key={item.label} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "7px 10px" }}>
            <p style={{ fontSize: 12, color: "#475569", marginBottom: 2 }}>{item.label}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: item.color }} suppressHydrationWarning>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopMoversCard({ topMovers, goToHisse }: { topMovers: TopMovers | null; goToHisse: (ticker: string) => void }) {
  return (
    <div className="dash-surface" style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 }}>En Çok Yükselenler</h3>
      </div>
      {!topMovers ? (
        <div style={{ padding: "12px 14px", fontSize: 12, color: "#475569" }}>Piyasa hareketleri yükleniyor.</div>
      ) : (
        topMovers.yukselenler.map((h, i) => (
          <div key={h.ticker} onClick={() => goToHisse(h.ticker)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: i < topMovers.yukselenler.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none", cursor: "pointer" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.2px" }}>{h.ticker}</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500 }}>{h.fiyat} ₺</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#10B981" }}>▲ %{Math.abs(Number(h.degisim)).toFixed(2).replace(".", ",")}</div>
            </div>
          </div>
        ))
      )}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)", borderTop: "1px solid rgba(59,130,246,0.06)", display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 }}>En Çok Düşenler</h3>
      </div>
      {!topMovers ? (
        <div style={{ padding: "12px 14px", fontSize: 12, color: "#475569" }}>Piyasa hareketleri yükleniyor.</div>
      ) : (
        topMovers.dusenler.map((h, i) => (
          <div key={h.ticker} onClick={() => goToHisse(h.ticker)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: i < topMovers.dusenler.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none", cursor: "pointer" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.2px" }}>{h.ticker}</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500 }}>{h.fiyat} ₺</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#EF4444" }}>▼ %-{Math.abs(Number(h.degisim)).toFixed(2).replace(".", ",")}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MarketNewsCard({ kap }: { kap: MarketNews[] }) {
  return (
    <div className="dash-surface" style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 }}>Piyasa Haberleri</h3>
      </div>
      {kap.length === 0 ? (
        <div style={{ padding: "14px", color: "#475569", fontSize: 12, lineHeight: 1.5 }}>
          Güncel haberler yükleniyor.
        </div>
      ) : (
        kap.map((k, i) => (
          <div key={`${k.ticker}-${k.time}-${i}`} style={{ padding: "9px 14px", borderBottom: i < kap.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6", marginBottom: 2 }}>{k.ticker}</div>
            <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.4 }}>{k.title}</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{k.time}</div>
          </div>
        ))
      )}
    </div>
  );
}

export default function DashboardSidePanel({ portfoyOzet, topMovers, kap, goToHisse }: DashboardSidePanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PortfolioSummaryCard portfoyOzet={portfoyOzet} />
      <TopMoversCard topMovers={topMovers} goToHisse={goToHisse} />
      <RiskProfilWidget />
      <MarketNewsCard kap={kap} />
    </div>
  );
}
