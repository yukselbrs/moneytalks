"use client";

import type { FormEvent } from "react";
import StockLogo from "@/components/StockLogo";

type DashboardHisse = {
  ticker: string;
  name: string;
  domain?: string;
};

type DashboardSearchBoxProps = {
  ticker: string;
  inputReady: boolean;
  aramaOneri: DashboardHisse[];
  bistHisseler: DashboardHisse[];
  watchlist: { ticker: string }[];
  tickerRenk: (ticker: string) => string;
  setTicker: (ticker: string) => void;
  setInputReady: (ready: boolean) => void;
  setAramaOneri: (oneriler: DashboardHisse[]) => void;
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  goToHisse: (ticker: string) => void;
};

export default function DashboardSearchBox({
  ticker,
  inputReady,
  aramaOneri,
  bistHisseler,
  watchlist,
  tickerRenk,
  setTicker,
  setInputReady,
  setAramaOneri,
  addToWatchlist,
  removeFromWatchlist,
  onSubmit,
  goToHisse,
}: DashboardSearchBoxProps) {
  const updateSearch = (value: string) => {
    setTicker(value);
    if (value.trim().length < 1) {
      setAramaOneri([]);
      return;
    }

    const q = value.trim().toUpperCase();
    setAramaOneri(
      bistHisseler
        .filter((h) => h.ticker.startsWith(q) || h.name.toUpperCase().startsWith(q))
        .slice(0, 6)
    );
  };

  return (
    <form className="dash-search-box" onSubmit={onSubmit} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "10px 16px", transition: "border-color 0.2s" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <div className="dash-search-field" style={{ flex: 1, position: "relative" }}>
        <input
          type="search"
          value={ticker}
          onChange={(e) => updateSearch(e.target.value)}
          onBlur={() => setTimeout(() => setAramaOneri([]), 150)}
          style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#94A3B8", padding: "4px 0" }}
          autoComplete="off"
          readOnly={!inputReady}
          onFocus={() => setInputReady(true)}
          placeholder="Hisse kodu veya şirket adı ara..."
        />
        {aramaOneri.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, zIndex: 50, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            {aramaOneri.map((h) => {
              const izlemede = watchlist.some((w) => w.ticker === h.ticker);

              return (
                <div
                  key={h.ticker}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    onMouseDown={() => {
                      setTicker(h.ticker);
                      setAramaOneri([]);
                      goToHisse(h.ticker);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}
                  >
                    <StockLogo ticker={h.ticker} domain={h.domain} size={28} radius={6} color={tickerRenk(h.ticker)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{h.ticker}</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>{h.name}</div>
                    </div>
                  </div>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (izlemede) {
                        removeFromWatchlist(h.ticker);
                      } else {
                        addToWatchlist(h.ticker);
                      }
                    }}
                    style={{ fontSize: 14, color: izlemede ? "#F97316" : "#334155", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                  >
                    {izlemede ? "★" : "☆"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button className="dash-search-submit" type="submit" style={{ height: 32, padding: "0 16px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
        Analiz Et
      </button>
    </form>
  );
}
