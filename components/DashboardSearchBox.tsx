"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import StockLogo from "@/components/StockLogo";
import { formatPercent } from "@/lib/formatters";
import { tickerRenk } from "@/lib/utils";

type DashboardHisse = {
  ticker: string;
  name: string;
  domain?: string;
};

type Fiyat = { fiyat: string; degisim: string; yukselis: boolean } | null;

type DashboardSearchBoxProps = {
  value: string;
  onValueChange: (ticker: string) => void;
  onSubmit: () => void;
  onSelectHisse: (ticker: string) => void;
  bistHisseler: DashboardHisse[];
  watchlist: { ticker: string }[];
  fiyatlar: Record<string, Fiyat>;
  onAddToWatchlist: (ticker: string) => void;
  onRemoveFromWatchlist: (ticker: string) => void;
};

export default function DashboardSearchBox({
  value,
  onValueChange,
  onSubmit,
  onSelectHisse,
  bistHisseler,
  watchlist,
  fiyatlar,
  onAddToWatchlist,
  onRemoveFromWatchlist,
}: DashboardSearchBoxProps) {
  const [aramaOneri, setAramaOneri] = useState<DashboardHisse[]>([]);
  const [aramaFiyatlar, setAramaFiyatlar] = useState<Record<string, Fiyat>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();
  const suggestionsOpen = aramaOneri.length > 0;
  const activeOptionId = suggestionsOpen ? `${listboxId}-${aramaOneri[activeIndex]?.ticker}` : undefined;

  const closeSuggestions = () => {
    setAramaOneri([]);
    setAramaFiyatlar({});
    setActiveIndex(0);
  };

  const selectSuggestion = (hisse: DashboardHisse) => {
    onValueChange(hisse.ticker);
    closeSuggestions();
    onSelectHisse(hisse.ticker);
  };

  const updateSearch = (val: string) => {
    onValueChange(val);
    if (val.trim().length < 1) {
      setAramaOneri([]);
      setAramaFiyatlar({});
      return;
    }
    const q = val.trim().toUpperCase();
    const sonuclar = bistHisseler
      .filter((h) => h.ticker.startsWith(q) || h.name.toUpperCase().startsWith(q))
      .slice(0, 6);
    setAramaOneri(sonuclar);
    setActiveIndex(0);

    if (fetchRef.current) clearTimeout(fetchRef.current);
    if (sonuclar.length === 0) return;
    fetchRef.current = setTimeout(() => {
      const extra = sonuclar.map((h) => h.ticker).join(",");
      fetch(`/api/fiyatlar?extra=${extra}`)
        .then((r) => r.json())
        .then((data) => setAramaFiyatlar(data))
        .catch(() => {});
    }, 250);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (suggestionsOpen && e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((current) => (current + 1) % aramaOneri.length);
      return;
    }

    if (suggestionsOpen && e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((current) => (current - 1 + aramaOneri.length) % aramaOneri.length);
      return;
    }

    if (suggestionsOpen && e.key === "Escape") {
      e.preventDefault();
      closeSuggestions();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestionsOpen && aramaOneri[activeIndex]) {
        selectSuggestion(aramaOneri[activeIndex]);
        return;
      }
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="dash-search-box" style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "10px 16px", transition: "border-color 0.2s" }}>
      <style>{`
        .dash-search-backdrop,
        .dash-search-sheet-header { display: none; }
        .dash-search-suggestions {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #0F1C2E;
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 8px;
          z-index: 50;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .dash-search-option {
          width: 100%;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 0;
          cursor: pointer;
          text-align: left;
          min-width: 0;
        }
        .dash-search-option:hover,
        .dash-search-option[aria-selected="true"] { background: rgba(59,130,246,0.06); }
        .dash-search-company { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        @media (max-width: 767px) {
          .dash-search-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 190;
            background: rgba(2,6,23,0.58);
            backdrop-filter: blur(3px);
          }
          .dash-search-suggestions {
            position: fixed;
            left: 0;
            right: 0;
            top: auto;
            bottom: 0;
            max-height: min(72vh, 560px);
            border-radius: 18px 18px 0 0;
            z-index: 200;
            border-left: none;
            border-right: none;
            border-bottom: none;
            overflow-y: auto;
            padding-bottom: calc(12px + env(safe-area-inset-bottom));
            box-shadow: 0 -18px 48px rgba(0,0,0,0.48);
          }
          .dash-search-sheet-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px 10px;
            border-bottom: 1px solid rgba(59,130,246,0.10);
            position: sticky;
            top: 0;
            background: rgba(15,28,46,0.98);
            backdrop-filter: blur(12px);
            z-index: 1;
          }
          .dash-search-option {
            padding: 11px 0;
          }
        }
      `}</style>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <div className="dash-search-field" style={{ flex: 1, position: "relative" }}>
        <input
          type="text"
          role="combobox"
          value={value}
          onChange={(e) => updateSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(closeSuggestions, 150)}
          style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#94A3B8", padding: "4px 0" }}
          aria-expanded={suggestionsOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Hisse kodu veya şirket adı ara..."
        />
        {suggestionsOpen && (
          <>
          <div className="dash-search-backdrop" onMouseDown={(e) => { e.preventDefault(); closeSuggestions(); }} />
          <div className="dash-search-suggestions">
            <div className="dash-search-sheet-header">
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#60A5FA" }}>Hisse Ara</div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{aramaOneri.length} sonuç</div>
              </div>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); closeSuggestions(); }}
                aria-label="Arama önerilerini kapat"
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(148,163,184,0.12)", background: "rgba(255,255,255,0.04)", color: "#94A3B8", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <div id={listboxId} role="listbox" aria-label="Hisse arama önerileri">
            {aramaOneri.map((h, index) => {
              const izlemede = watchlist.some((w) => w.ticker === h.ticker);
              return (
                <div
                  key={h.ticker}
                  id={`${listboxId}-${h.ticker}`}
                  className="dash-search-option"
                  role="option"
                  aria-selected={activeIndex === index}
                  tabIndex={-1}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(h);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                >
                  <StockLogo ticker={h.ticker} domain={h.domain} size={28} radius={6} color={tickerRenk(h.ticker)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0" }}>{h.ticker}</div>
                    <div className="dash-search-company" style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>{h.name}</div>
                  </div>
                  {(() => { const f = aramaFiyatlar[h.ticker] ?? fiyatlar[h.ticker]; return f ? (
                    <div style={{ textAlign: "right", marginRight: 4, flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", whiteSpace: "nowrap" }}>{f.fiyat} ₺</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: f.yukselis ? "#10B981" : "#EF4444" }}>
                        {f.yukselis ? "▲" : "▼"} {formatPercent(Number(f.degisim), { symbolPosition: "prefix", signDisplay: "never" })}
                      </div>
                    </div>
                  ) : null; })()}
                  <button
                    type="button"
                    aria-label={izlemede ? `${h.ticker} izleme listesinden çıkar` : `${h.ticker} izleme listesine ekle`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (izlemede) onRemoveFromWatchlist(h.ticker);
                      else onAddToWatchlist(h.ticker);
                    }}
                    style={{ fontSize: 14, color: izlemede ? "#F97316" : "#334155", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                  >
                    {izlemede ? "★" : "☆"}
                  </button>
                </div>
              );
            })}
            </div>
          </div>
          </>
        )}
      </div>
      <button className="dash-search-submit" type="button" onClick={() => onSubmit()} style={{ height: 32, padding: "0 16px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
        Analiz Et
      </button>
    </div>
  );
}
