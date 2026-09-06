"use client";

import { useMemo } from "react";
import StockLogo from "@/components/StockLogo";
import { formatPercent } from "@/lib/formatters";

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

  const bistMap = useMemo(() => new Map(bistHisseler.map(h => [h.ticker, h])), [bistHisseler]);

  return (
    <div className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 40%, rgba(139,92,246,0.35) 70%, transparent 100%)" }} />

      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#93C5FD", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>İzleme Listem</p>
        <button
          onClick={() => { setWatchlistInputAcik(!watchlistInputAcik); setWatchlistInput(""); }}
          aria-label={watchlistInputAcik ? "İzleme listesine ekleme alanını kapat" : "İzleme listesine hisse ekle"}
          style={{ width: 24, height: 24, borderRadius: 6, background: watchlistInputAcik ? "rgba(255,255,255,0.05)" : "rgba(59,130,246,0.1)", border: `1px solid ${watchlistInputAcik ? "rgba(255,255,255,0.08)" : "rgba(59,130,246,0.25)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: watchlistInputAcik ? "#475569" : "#3B82F6", fontSize: 16, lineHeight: 1, fontWeight: 300 }}
        >
          {watchlistInputAcik ? "×" : "+"}
        </button>
      </div>

      {watchlistInputAcik && (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 6 }}>
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
                    <div key={h.ticker} onMouseDown={() => { addToWatchlist(h.ticker); closeInput(); }}
                      style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{h.ticker}</span>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>{h.name}</span>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}
          </div>
          <button onMouseDown={addCurrentInput}
            aria-label="Yazılan hisseyi izleme listesine ekle"
            style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#3B82F6", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
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
        const ortLabel = formatPercent(ortDegisim, { symbolPosition: "prefix" });

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {[
              { label: "TOPLAM", value: `${watchlist.length} hisse`, renk: "#94A3B8" },
              { label: "GÜNÜN EN İYİSİ", value: enIyi?.ticker || "-", renk: "#10B981" },
              { label: "ORT. DEĞİŞİM", value: ortLabel, renk: ortRenk },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: "10px 14px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.renk }}>{s.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {watchlist.length === 0 ? (
        <div style={{ padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(59,130,246,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#3B82F6" }}>☆</div>
          <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", margin: 0 }}>Henüz hisse eklemediniz</p>
          <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", margin: 0 }}>Hisse sayfalarındaki yıldız ikonuna tıklayın</p>
        </div>
      ) : (
        watchlist.map((w, i) => {
          const h = bistMap.get(w.ticker);
          const f = fiyatlar[w.ticker];
          const degisimLabel = f ? `${f.yukselis ? "artı" : "eksi"} ${formatPercent(Number(f.degisim), { symbolPosition: "prefix", signDisplay: "never" })}` : undefined;
          return (
            <div key={w.ticker} onClick={() => goToHisse(w.ticker)}
              style={{ display: "grid", gridTemplateColumns: "40px 1fr auto auto 32px", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < watchlist.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <StockLogo ticker={w.ticker} domain={h?.domain} size={38} radius={9} color={tickerRenk(w.ticker)} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.2px" }}>{w.ticker}</div>
                <div title={h?.name || w.ticker} style={{ fontSize: 12, color: "#94A3B8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{h?.name || w.ticker}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>{f?.fiyat || "—"} ₺</div>
              </div>
              <div style={{ textAlign: "right" }} aria-label={degisimLabel}>
                <div aria-hidden="true" style={{ fontSize: 12, fontWeight: 700, color: f?.yukselis ? "#10B981" : "#EF4444", display: "flex", alignItems: "center", gap: 2 }}>
                  {f ? <><span>{f.yukselis ? "▲" : "▼"}</span><span>{formatPercent(Number(f.degisim), { symbolPosition: "prefix", signDisplay: "never" })}</span></> : "—"}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFromWatchlist(w.ticker); }}
                aria-label={`${w.ticker} izleme listesinden çıkar`}
                style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", transition: "all 0.12s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLButtonElement).style.color = "#94A3B8"; }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          );
        })
      )}

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "12px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#93C5FD", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>Son Analizlerim</p>
          <a href="/analizler" style={{ fontSize: 12, color: "#3B82F6", textDecoration: "none", opacity: 0.8 }}>Tümü →</a>
        </div>
        {recent.length === 0 ? (
          <p style={{ fontSize: 12, color: "#94A3B8", padding: "6px 0 8px", margin: 0 }}>Henüz analiz yapmadınız</p>
        ) : (
          recent.map((r, i) => {
            const h = bistMap.get(r.ticker);
            const f = fiyatlar[r.ticker];
            const sirketAdi = h?.name || "";
            return (
              <div key={`${r.ticker}-${r.time}-${i}`} onClick={() => goToHisse(r.ticker)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < recent.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer", borderRadius: 6, transition: "background 0.12s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <StockLogo ticker={r.ticker} domain={h?.domain} size={34} radius={8} color={tickerRenk(r.ticker)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{r.ticker}</span>
                    {sirketAdi && <span title={sirketAdi} style={{ fontSize: 12, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sirketAdi}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#2D3F55" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>{r.time}</span>
                  </div>
                </div>
                {f && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0" }}>{f.fiyat} ₺</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: f.yukselis ? "#10B981" : "#EF4444" }}>
                      {f.yukselis ? "▲" : "▼"} {formatPercent(Number(f.degisim), { symbolPosition: "prefix", signDisplay: "never" })}
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
