"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import StockLogo from "@/components/StockLogo";
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
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
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsOpen = aramaOneri.length > 0;

  const closeSuggestions = () => {
    setAramaOneri([]);
    setAramaFiyatlar({});
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
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(e as unknown as FormEvent<HTMLFormElement>);
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
        .dash-search-option:hover { background: rgba(59,130,246,0.06); }
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
          aria-controls="dashboard-search-suggestions"
          aria-autocomplete="list"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Hisse kodu veya şirket adı ara..."
        />
        {suggestionsOpen && (
          <>
          <div className="dash-search-backdrop" onMouseDown={(e) => { e.preventDefault(); closeSuggestions(); }} />
          <div id="dashboard-search-suggestions" className="dash-search-suggestions" role="listbox" aria-label="Hisse arama önerileri">
            <div className="dash-search-sheet-header">
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#60A5FA" }}>Hisse Ara</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{aramaOneri.length} sonuç</div>
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
            {aramaOneri.map((h) => {
              const izlemede = watchlist.some((w) => w.ticker === h.ticker);
              return (
                <div
                  key={h.ticker}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                >
                  <button
                    type="button"
                    className="dash-search-option"
                    role="option"
                    aria-selected={false}
                    onMouseDown={() => {
                      onValueChange(h.ticker);
                      closeSuggestions();
                      onSelectHisse(h.ticker);
                    }}
                  >
                    <StockLogo ticker={h.ticker} domain={h.domain} size={28} radius={6} color={tickerRenk(h.ticker)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0" }}>{h.ticker}</div>
                      <div className="dash-search-company" style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{h.name}</div>
                    </div>
                    {(() => { const f = aramaFiyatlar[h.ticker] ?? fiyatlar[h.ticker]; return f ? (
                      <div style={{ textAlign: "right", marginRight: 4, flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", whiteSpace: "nowrap" }}>{f.fiyat} ₺</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: f.yukselis ? "#10B981" : "#EF4444" }}>
                          {f.yukselis ? "▲" : "▼"} %{Math.abs(Number(f.degisim)).toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                    ) : null; })()}
                  </button>
                  <button
                    type="button"
                    aria-label={izlemede ? `${h.ticker} izleme listesinden çıkar` : `${h.ticker} izleme listesine ekle`}
                    onMouseDown={(e) => {
                      e.preventDefault();
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
          </>
        )}
      </div>
      <button className="dash-search-submit" type="button" onClick={(e) => onSubmit(e as unknown as FormEvent<HTMLFormElement>)} style={{ height: 32, padding: "0 16px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
        Analiz Et
      </button>
    </div>
  );
}
