"use client";

import RiskProfilWidget from "@/components/RiskProfilWidget";

type PortfolioSummary = {
  toplamMaliyet: number;
  toplamGuncel: number;
  toplamPL: number;
  toplamPLYuzde: number;
  hisseSayisi: number;
  hisseDagilim?: { ticker: string; yuzde: number; renk: string }[];
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

  return (
    <div className="dash-surface" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Portföy Özeti</span>
        <a href="/portfoy" style={{ fontSize: 10, color: "#3B82F6", textDecoration: "none" }}>Tümü →</a>
      </div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: "#64748B", marginBottom: 4, fontWeight: 500 }}>Toplam Değer</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.8px" }}>
          {portfoyOzet.toplamGuncel.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: portfoyOzet.toplamPL >= 0 ? "#10B981" : "#EF4444", marginTop: 2 }}>
          {portfoyOzet.toplamPLYuzde >= 0 ? "%" : "%-"}{Math.abs(portfoyOzet.toplamPLYuzde).toFixed(2).replace(".", ",")} ({portfoyOzet.toplamPL >= 0 ? "+" : ""}{portfoyOzet.toplamPL.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺)
        </p>
      </div>

      {portfoyOzet.hisseDagilim && portfoyOzet.hisseDagilim.length > 0 && (() => {
        const R = 36, cx = 46, cy = 46, sw = 10;
        const circ = 2 * Math.PI * R;
        let acc = 0;

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <svg width="92" height="92" viewBox="0 0 92 92" style={{ flexShrink: 0 }}>
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
              {portfoyOzet.hisseDagilim!.map((h, i) => {
                const dl = (h.yuzde / 100) * circ;
                const el = (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={R}
                    fill="none"
                    stroke={h.renk}
                    strokeWidth={sw}
                    strokeDasharray={`${dl} ${circ - dl}`}
                    strokeDashoffset={circ * 0.25 - acc}
                    strokeLinecap="butt"
                  />
                );
                acc += dl;
                return el;
              })}
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              {portfoyOzet.hisseDagilim!.slice(0, 3).map((h, i) => (
                <div key={`${h.ticker}-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: h.renk }} />
                    <span style={{ fontSize: 10, color: "#94A3B8" }}>{h.ticker}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#64748B" }}>%{h.yuzde.toFixed(1)}</span>
                </div>
              ))}
              {portfoyOzet.hisseDagilim!.length > 3 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#475569" }} />
                    <span style={{ fontSize: 10, color: "#94A3B8" }}>Diğer</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#64748B" }}>%{portfoyOzet.hisseDagilim!.slice(3).reduce((a, h) => a + h.yuzde, 0).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { label: "Ana Para", value: `${portfoyOzet.toplamMaliyet.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`, color: "#F1F5F9" },
          { label: "K/Z ₺", value: `${portfoyOzet.toplamPL >= 0 ? "+" : ""}${portfoyOzet.toplamPL.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`, color: portfoyOzet.toplamPL >= 0 ? "#10B981" : "#EF4444" },
          { label: "Hisse", value: `${portfoyOzet.hisseSayisi} hisse`, color: "#F1F5F9" },
          { label: "Getiri", value: `${portfoyOzet.toplamPLYuzde >= 0 ? "+" : ""}${portfoyOzet.toplamPLYuzde.toFixed(2)}%`, color: portfoyOzet.toplamPL >= 0 ? "#10B981" : "#EF4444" },
        ].map((item) => (
          <div key={item.label} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "7px 10px" }}>
            <p style={{ fontSize: 9, color: "#475569", marginBottom: 2 }}>{item.label}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: item.color }} suppressHydrationWarning>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopMoversCard({ topMovers, goToHisse }: { topMovers: TopMovers | null; goToHisse: (ticker: string) => void }) {
  if (!topMovers) return null;

  return (
    <div className="dash-surface" style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>En Çok Yükselenler</span>
      </div>
      {topMovers.yukselenler.map((h, i) => (
        <div key={h.ticker} onClick={() => goToHisse(h.ticker)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: i < topMovers.yukselenler.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none", cursor: "pointer" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.2px" }}>{h.ticker}</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500 }}>{h.fiyat} ₺</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#10B981" }}>▲ %{Math.abs(Number(h.degisim)).toFixed(2).replace(".", ",")}</div>
          </div>
        </div>
      ))}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)", borderTop: "1px solid rgba(59,130,246,0.06)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>En Çok Düşenler</span>
      </div>
      {topMovers.dusenler.map((h, i) => (
        <div key={h.ticker} onClick={() => goToHisse(h.ticker)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: i < topMovers.dusenler.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none", cursor: "pointer" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.2px" }}>{h.ticker}</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500 }}>{h.fiyat} ₺</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#EF4444" }}>▼ %-{Math.abs(Number(h.degisim)).toFixed(2).replace(".", ",")}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketNewsCard({ kap }: { kap: MarketNews[] }) {
  return (
    <div className="dash-surface" style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Piyasa Haberleri</span>
      </div>
      {kap.map((k, i) => (
        <div key={`${k.ticker}-${k.time}-${i}`} style={{ padding: "9px 14px", borderBottom: i < kap.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6", marginBottom: 2 }}>{k.ticker}</div>
          <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.4 }}>{k.title}</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{k.time}</div>
        </div>
      ))}
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
