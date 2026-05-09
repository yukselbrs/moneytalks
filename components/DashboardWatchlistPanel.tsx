"use client";

import StockLogo from "@/components/StockLogo";
import bistSirketler from "@/data/bist-companies.json";

function toTitleCase(str: string): string {
  return str.split(" ").slice(0, 2).map(
    (k) => k.charAt(0).toLocaleUpperCase("tr-TR") + k.slice(1).toLocaleLowerCase("tr-TR")
  ).join(" ");
}

const sirketAdlari: Record<string, string> = Object.fromEntries(
  (bistSirketler as { ticker: string; ad: string }[]).map((s) => [s.ticker, toTitleCase(s.ad)])
);

type DashboardHisse = {
  ticker: string;
  name: string;
  domain?: string;
};

type WatchlistItem = {
  ticker: string;
};

type Fiyat = {
  fiyat: string;
  degisim: string;
  yukselis: boolean;
} | null;

type RecentAnalysis = {
  ticker: string;
  time: string;
};

type DashboardWatchlistPanelProps = {
  bistHisseler: DashboardHisse[];
  watchlist: WatchlistItem[];
  fiyatlar: Record<string, Fiyat>;
  recent: RecentAnalysis[];
  watchlistInput: string;
  watchlistInputAcik: boolean;
  tickerRenk: (ticker: string) => string;
  setWatchlistInput: (value: string) => void;
  setWatchlistInputAcik: (value: boolean) => void;
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  goToHisse: (ticker: string) => void;
};

export default function DashboardWatchlistPanel({
  bistHisseler,
  watchlist,
  fiyatlar,
  recent,
  watchlistInput,
  watchlistInputAcik,
  tickerRenk,
  setWatchlistInput,
  setWatchlistInputAcik,
  addToWatchlist,
  removeFromWatchlist,
  goToHisse,
}: DashboardWatchlistPanelProps) {
  const closeInput = () => {
    setWatchlistInputAcik(false);
    setWatchlistInput("");
  };

  const addCurrentInput = () => {
    if (!watchlistInput.trim()) return;
    addToWatchlist(watchlistInput.trim());
    closeInput();
  };

  return (
    <div className="dash-surface" style={{ border: "1px solid rgba(59,130,246,0.1)", borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 }}>İzleme Listem</h2>
        <button
          onClick={() => {
            setWatchlistInputAcik(!watchlistInputAcik);
            setWatchlistInput("");
          }}
          style={{ fontSize: 16, color: watchlistInputAcik ? "#94A3B8" : "#3B82F6", background: "none", border: "none", cursor: "pointer", lineHeight: 1, fontWeight: 300 }}
        >
          {watchlistInputAcik ? "x" : "+"}
        </button>
      </div>

      {watchlistInputAcik && (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", gap: 6 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              autoFocus
              autoComplete="off"
              value={watchlistInput}
              onChange={(e) => setWatchlistInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") addCurrentInput();
                if (e.key === "Escape") closeInput();
              }}
              placeholder="THYAO"
              style={{ width: "100%", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#E2E8F0", outline: "none" }}
            />
            {watchlistInput.length > 0 && (() => {
              const q = watchlistInput.toUpperCase();
              const filtered = bistHisseler.filter((h) => h.ticker.startsWith(q) || h.name.toUpperCase().startsWith(q)).slice(0, 5);
              return filtered.length > 0 ? (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, zIndex: 100, overflow: "hidden" }}>
                  {filtered.map((h) => (
                    <div
                      key={h.ticker}
                      onMouseDown={() => {
                        addToWatchlist(h.ticker);
                        closeInput();
                      }}
                      style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{h.ticker}</span>
                      <span style={{ fontSize: 11, color: "#475569" }}>{h.name}</span>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}
          </div>
          <button
            onMouseDown={addCurrentInput}
            style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#3B82F6", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}
          >
            Ekle
          </button>
        </div>
      )}

      {watchlist.length > 0 && (() => {
        const enIyi = watchlist.reduce((best, w) => {
          const d = Number(fiyatlar[w.ticker]?.degisim || 0);
          return d > Number(fiyatlar[best?.ticker]?.degisim || -Infinity) ? w : best;
        }, watchlist[0]);
        const degisimler = watchlist.map((w) => Number(fiyatlar[w.ticker]?.degisim || 0)).filter((d) => d !== 0);
        const ortDegisim = degisimler.length > 0 ? degisimler.reduce((a, b) => a + b, 0) / degisimler.length : 0;
        const ortRenk = ortDegisim >= 0 ? "#10B981" : "#EF4444";
        const ortLabel = `${ortDegisim >= 0 ? "%" : "%-"}${Math.abs(ortDegisim).toFixed(2).replace(".", ",")}`;

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
            {[
              { label: "TOPLAM", value: `${watchlist.length} hisse`, renk: "#E2E8F0" },
              { label: "GÜNÜN EN İYİSİ", value: enIyi?.ticker || "-", renk: "#10B981" },
              { label: "ORT. DEĞİŞİM", value: ortLabel, renk: ortRenk },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: "12px 16px", borderRight: i < 2 ? "1px solid rgba(59,130,246,0.06)" : "none" }}>
                <div style={{ fontSize: 12, color: "#475569", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.renk }}>{s.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {watchlist.length === 0 ? (
        <div style={{ padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 28 }}>☆</div>
          <p style={{ fontSize: 13, color: "#475569", textAlign: "center" }}>Henüz hisse eklemediniz</p>
          <p style={{ fontSize: 11, color: "#334155", textAlign: "center" }}>Hisse sayfalarındaki yıldız ikonuna tıklayın</p>
        </div>
      ) : (
        watchlist.map((w, i) => {
          const h = bistHisseler.find((b) => b.ticker === w.ticker);
          const f = fiyatlar[w.ticker];
          return (
            <div
              key={w.ticker}
              onClick={() => goToHisse(w.ticker)}
              style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto 36px", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < watchlist.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <StockLogo ticker={w.ticker} domain={h?.domain} size={40} radius={10} color={tickerRenk(w.ticker)} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.2px" }}>{w.ticker}</div>
                <div title={h?.name || w.ticker} style={{ fontSize: 11, color: "#475569", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{h?.name || w.ticker}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#334155", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 2 }}>FİYAT</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9" }}>{f?.fiyat || "-"} ₺</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#334155", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 2 }}>GÜNLÜK</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: f?.yukselis ? "#10B981" : "#EF4444", display: "flex", alignItems: "center", gap: 2 }}>
                  {f ? <><span>{f.yukselis ? "▲" : "▼"}</span><span>{f.yukselis ? "%" : "%-"}{Math.abs(Number(f.degisim)).toFixed(2).replace(".", ",")}</span></> : "-"}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromWatchlist(w.ticker);
                }}
                style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#475569" }}
              >
                x
              </button>
            </div>
          );
        })
      )}

      <div style={{ borderTop: "1px solid rgba(59,130,246,0.08)", padding: "12px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 }}>Son Analizlerim</h3>
          <a href="/analizler" style={{ fontSize: 11, color: "#3B82F6", textDecoration: "none" }}>Tümü →</a>
        </div>
        {recent.length === 0 ? (
          <p style={{ fontSize: 12, color: "#334155", padding: "6px 0 8px" }}>Henüz analiz yapmadınız</p>
        ) : (
          recent.map((r, i) => {
            const h = bistHisseler.find((b) => b.ticker === r.ticker);
            const f = fiyatlar[r.ticker];
            const sirketAdi = h?.name || sirketAdlari[r.ticker] || "";
            return (
              <div
                key={`${r.ticker}-${r.time}-${i}`}
                onClick={() => goToHisse(r.ticker)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < recent.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <StockLogo ticker={r.ticker} domain={h?.domain} size={36} radius={9} color={tickerRenk(r.ticker)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{r.ticker}</span>
                    {sirketAdi && <span title={sirketAdi} style={{ fontSize: 10, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sirketAdi}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
                    <span style={{ fontSize: 10, color: "#475569" }}>{r.time}</span>
                  </div>
                </div>
                {f && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{f.fiyat} ₺</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: f.yukselis ? "#10B981" : "#EF4444" }}>
                      {f.yukselis ? "▲" : "▼"} %{Math.abs(Number(f.degisim)).toFixed(2).replace(".", ",")}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
