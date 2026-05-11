"use client";

import StockLogo from "@/components/StockLogo";

type DashboardHisse = {
  ticker: string;
  name: string;
  domain?: string;
};

type Fiyat = {
  fiyat: string;
  degisim: string;
  yukselis: boolean;
} | null;

type TopMovers = {
  yukselenler: { ticker: string; fiyat: string; degisim: number }[];
  dusenler: { ticker: string; fiyat: string; degisim: number }[];
  hacimliler: { ticker: string; fiyat: string; degisim: number }[];
} | null;

type Props = {
  bistHisseler: DashboardHisse[];
  popular: DashboardHisse[];
  fiyatlar: Record<string, Fiyat>;
  topMovers: TopMovers;
  piyasaOdagiTab: string;
  watchlist: { ticker: string }[];
  tickerRenk: (ticker: string) => string;
  setPiyasaOdagiTab: (tab: string) => void;
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  goToHisse: (ticker: string) => void;
};

export default function DashboardMarketFocus({
  bistHisseler,
  popular,
  fiyatlar,
  topMovers,
  piyasaOdagiTab,
  watchlist,
  tickerRenk,
  setPiyasaOdagiTab,
  addToWatchlist,
  removeFromWatchlist,
  goToHisse,
}: Props) {
  const tabs = [
    { key: "one", label: "Öne Çıkanlar" },
    { key: "yukselenler", label: "Yükselenler" },
    { key: "dusenler", label: "Düşenler" },
    { key: "hacim", label: "En Yüksek Hacim" },
  ];

  const liste = piyasaOdagiTab === "yukselenler"
    ? (topMovers?.yukselenler || []).map(h => ({ ticker: h.ticker, fiyat: h.fiyat, degisim: h.degisim, yukselis: h.degisim >= 0 }))
    : piyasaOdagiTab === "dusenler"
    ? (topMovers?.dusenler || []).map(h => ({ ticker: h.ticker, fiyat: h.fiyat, degisim: h.degisim, yukselis: h.degisim >= 0 }))
    : piyasaOdagiTab === "hacim"
    ? (topMovers?.hacimliler || []).map(h => ({ ticker: h.ticker, fiyat: h.fiyat, degisim: h.degisim, yukselis: h.degisim >= 0 }))
    : popular.slice(0, 5).map(s => ({ ticker: s.ticker, fiyat: fiyatlar[s.ticker]?.fiyat || "—", degisim: Number(fiyatlar[s.ticker]?.degisim || 0), yukselis: fiyatlar[s.ticker]?.yukselis ?? true }));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.4px", marginBottom: 2 }}>Piyasa Odakları</h2>
          <p style={{ fontSize: 12, color: "#475569" }}>BIST&apos;te bugün öne çıkan hisseler.</p>
        </div>
        <a href="/hisseler" style={{ fontSize: 13, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "7px 14px", textDecoration: "none", whiteSpace: "nowrap" }}>
          Tüm Hisseler →
        </a>
      </div>

      <div className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 40%, rgba(139,92,246,0.35) 70%, transparent 100%)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setPiyasaOdagiTab(t.key)}
              style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 20, border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                background: piyasaOdagiTab === t.key ? "#3B82F6" : "transparent",
                color: piyasaOdagiTab === t.key ? "#fff" : "#475569",
                borderColor: piyasaOdagiTab === t.key ? "#3B82F6" : "rgba(255,255,255,0.07)" }}>
              {t.label}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#2D3F55", fontWeight: 500 }}>15 dk gecikmeli</span>
        </div>
        {liste.map((s, i) => {
          const h = bistHisseler.find(b => b.ticker === s.ticker);
          const izlemede = watchlist.find(w => w.ticker === s.ticker);
          return (
            <div key={s.ticker} onClick={() => goToHisse(s.ticker)}
              style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto 40px", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < liste.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <StockLogo ticker={s.ticker} domain={h?.domain} size={40} radius={10} color={tickerRenk(s.ticker)} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.3px" }}>{s.ticker}</div>
                <div title={h?.name || s.ticker} style={{ fontSize: 11, color: "#334155", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{h?.name || s.ticker}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.2px" }}>{s.fiyat} ₺</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.yukselis ? "#10B981" : "#EF4444", display: "flex", alignItems: "center", gap: 3 }}>
                  <span>{s.yukselis ? "▲" : "▼"}</span>
                  <span>{s.yukselis ? "%" : "%-"}{Math.abs(Number(s.degisim)).toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
              <button onClick={ev => {
                ev.stopPropagation();
                if (izlemede) removeFromWatchlist(s.ticker);
                else addToWatchlist(s.ticker);
              }}
                style={{ width: 34, height: 34, borderRadius: 8, background: izlemede ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${izlemede ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.07)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: izlemede ? "#3B82F6" : "#2D3F55", transition: "all 0.15s" }}>
                {izlemede ? "★" : "☆"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
