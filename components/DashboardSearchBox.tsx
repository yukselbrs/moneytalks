"use client";

import { useRef, useState, type FormEvent } from "react";
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
  const [inputReady, setInputReady] = useState(false);
  const [aramaOneri, setAramaOneri] = useState<DashboardHisse[]>([]);
  const [aramaFiyatlar, setAramaFiyatlar] = useState<Record<string, Fiyat>>({});
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <form className="dash-search-box" onSubmit={onSubmit} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "10px 16px", transition: "border-color 0.2s" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <div className="dash-search-field" style={{ flex: 1, position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => updateSearch(e.target.value)}
          onBlur={() => setTimeout(() => { setAramaOneri([]); setAramaFiyatlar({}); }, 150)}
          style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#94A3B8", padding: "4px 0" }}
          autoComplete="new-password"
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
                      onValueChange(h.ticker);
                      setAramaOneri([]);
                      onSelectHisse(h.ticker);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}
                  >
                    <StockLogo ticker={h.ticker} domain={h.domain} size={28} radius={6} color={tickerRenk(h.ticker)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0" }}>{h.ticker}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{h.name}</div>
                    </div>
                    {(() => { const f = aramaFiyatlar[h.ticker] ?? fiyatlar[h.ticker]; return f ? (
                      <div style={{ textAlign: "right", marginRight: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{f.fiyat} ₺</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: f.yukselis ? "#10B981" : "#EF4444" }}>
                          {f.yukselis ? "▲" : "▼"} %{Math.abs(Number(f.degisim)).toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                    ) : null; })()}
                  </div>
                  <button
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
        )}
      </div>
      <button className="dash-search-submit" type="submit" style={{ height: 32, padding: "0 16px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
        Analiz Et
      </button>
    </form>
  );
}
