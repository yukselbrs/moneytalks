"use client";

import { useEffect, useMemo, useState } from "react";
import StockLogo from "@/components/StockLogo";
import { formatPercent } from "@/lib/formatters";

type NedenKap = { index: number; tipEtiket: string; ozet: string | null };

type NedenData = {
  endeksDegisim: number | null;
  hisseler: Record<string, { kap: NedenKap | null }>;
};

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

  const bistMap = useMemo(() => new Map(bistHisseler.map(h => [h.ticker, h])), [bistHisseler]);
  const watchlistSet = useMemo(() => new Set(watchlist.map(w => w.ticker)), [watchlist]);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [neden, setNeden] = useState<NedenData | null>(null);

  const moverTickers = useMemo(() => {
    if (!topMovers) return "";
    const uniq = [...new Set([...topMovers.yukselenler, ...topMovers.dusenler].map(h => h.ticker))];
    return uniq.slice(0, 20).join(",");
  }, [topMovers]);

  useEffect(() => {
    if (!moverTickers) return;
    let iptal = false;
    fetch(`/api/neden?tickers=${moverTickers}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (!iptal && data?.hisseler) setNeden(data); })
      .catch(() => {});
    return () => { iptal = true; };
  }, [moverTickers]);

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

      <div className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", position: "relative" }}>
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
        {liste.length === 0 && piyasaOdagiTab !== "one" ? (
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 44, borderRadius: 8, background: "linear-gradient(90deg,#1E293B 25%,#2D3F55 50%,#1E293B 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
            ))}
          </div>
        ) : liste.map((s, i) => {
          const h = bistMap.get(s.ticker);
          const izlemede = watchlistSet.has(s.ticker);
          const degisimLabel = `${s.yukselis ? "artı" : "eksi"} ${formatPercent(Number(s.degisim), { symbolPosition: "prefix", signDisplay: "never" })}`;
          const moverTab = piyasaOdagiTab === "yukselenler" || piyasaOdagiTab === "dusenler";
          const kap = moverTab ? neden?.hisseler[s.ticker]?.kap ?? null : null;
          const endeks = neden?.endeksDegisim ?? null;
          const endeksYonlu = moverTab && !kap && endeks !== null && Math.abs(endeks) >= 1 && (endeks >= 0) === s.yukselis;
          return (
            <div key={s.ticker} onClick={() => goToHisse(s.ticker)}
              style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto 40px", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < liste.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <StockLogo ticker={s.ticker} domain={h?.domain} size={40} radius={10} color={tickerRenk(s.ticker)} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.3px" }}>{s.ticker}</span>
                  {kap && (
                    <a href={`/kap/${kap.index}`}
                      onClick={ev => ev.stopPropagation()}
                      aria-label={`${s.ticker} KAP bildirimi: ${kap.tipEtiket} — detayı aç`}
                      title={`${kap.ozet ? kap.ozet + " — " : ""}Bu hareketin son 24 saatteki KAP bildirimiyle zamansal örtüşmesi var; kesin neden göstermez. Detay için tıkla.`}
                      style={{ fontSize: 11, fontWeight: 600, color: "#A78BFA", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 20, padding: "4px 10px", textDecoration: "none", whiteSpace: "nowrap", minHeight: 24, display: "inline-flex", alignItems: "center" }}>
                      KAP: {kap.tipEtiket}
                    </a>
                  )}
                  {endeksYonlu && (
                    <span
                      title={`XU100 bugün ${formatPercent(endeks!, { symbolPosition: "prefix" })} — hareket endeksle aynı yönde; hisseye özgü bir gelişme göstermez.`}
                      style={{ fontSize: 11, fontWeight: 600, color: "#64748B", background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.25)", borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap", minHeight: 24, display: "inline-flex", alignItems: "center" }}>
                      Endeks yönlü
                    </span>
                  )}
                </div>
                <div title={h?.name || s.ticker} style={{ fontSize: 11, color: "#334155", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{h?.name || s.ticker}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.2px" }}>{s.fiyat} ₺</div>
              </div>
              <div style={{ textAlign: "right" }} aria-label={degisimLabel}>
                <div aria-hidden="true" style={{ fontSize: 13, fontWeight: 700, color: s.yukselis ? "#10B981" : "#EF4444", display: "flex", alignItems: "center", gap: 3 }}>
                  <span>{s.yukselis ? "▲" : "▼"}</span>
                  <span>{formatPercent(Number(s.degisim), { symbolPosition: "prefix", signDisplay: "never" })}</span>
                </div>
              </div>
              <button
                onClick={ev => { ev.stopPropagation(); if (izlemede) removeFromWatchlist(s.ticker); else { addToWatchlist(s.ticker); setJustAdded(s.ticker); setTimeout(() => setJustAdded(t => t === s.ticker ? null : t), 400); } }}
                aria-label={izlemede ? `${s.ticker} izleme listesinden çıkar` : `${s.ticker} izleme listesine ekle`}
                style={{ width: 34, height: 34, borderRadius: 8, background: izlemede ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${izlemede ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.07)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: izlemede ? "#3B82F6" : "#2D3F55", transition: "all 0.15s" }}>
                <span aria-hidden="true" style={{ display: "inline-block", transform: justAdded === s.ticker ? "scale(1.5)" : "scale(1)", transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}>{izlemede ? "★" : "☆"}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
