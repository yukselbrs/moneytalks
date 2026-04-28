"use client";
import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { BIST_HISSELER } from "@/lib/bist-hisseler";



const RENKLER = ["#3B82F6","#8B5CF6","#EC4899","#F97316","#10B981","#06B6D4","#EAB308","#EF4444","#6366F1","#14B8A6"];
function tickerRenk(t: string) {
  let h = 0; for (let i = 0; i < t.length; i++) h = t.charCodeAt(i) + ((h << 5) - h);
  return RENKLER[Math.abs(h) % RENKLER.length];
}

const SAYFA_BOYUTU = 25;

export default function HisselerPage() {
  const router = useRouter();
  const [arama, setArama] = useState("");
  const [sayfa, setSayfa] = useState(1);
  const [fiyatlar, setFiyatlar] = useState<Record<string, { fiyat: string; degisim: string; yukselis: boolean } | null>>({});
  const [getiriler, setGetiriler] = useState<Record<string, Record<string, string | null>>>({});

  const filtrelendi = BIST_HISSELER.filter(h =>
    arama === "" ||
    h.ticker.startsWith(arama.toUpperCase()) ||
    h.ad.toUpperCase().startsWith(arama.toUpperCase())
  );

  const toplamSayfa = Math.ceil(filtrelendi.length / SAYFA_BOYUTU);
  const sayfadaki = filtrelendi.slice((sayfa - 1) * SAYFA_BOYUTU, sayfa * SAYFA_BOYUTU);

  const fetchFiyatlar = useCallback((tickers: string[]) => {
    const eksik = tickers.filter(t => !fiyatlar[t]);
    if (eksik.length === 0) return;
    fetch(`/api/fiyatlar?extra=${eksik.join(",")}`)
      .then(r => r.json())
      .then(d => setFiyatlar(prev => ({ ...prev, ...d })))
      .catch(() => {});
  }, [fiyatlar]);

  useEffect(() => {
    fetchFiyatlar(sayfadaki.map(h => h.ticker));
  }, [sayfa, arama]);

  useEffect(() => { setSayfa(1); }, [arama]);

  useEffect(() => {
    sayfadaki.forEach(hisse => {
      if (getiriler[hisse.ticker]) return;
      fetch(`/api/getiri?ticker=${hisse.ticker}`)
        .then(r => r.json())
        .then(d => setGetiriler(prev => ({ ...prev, [hisse.ticker]: d })))
        .catch(() => {});
    });
  }, [sayfa, arama]);

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <style>{`
          .hisse-row:hover { background: rgba(59,130,246,0.05) !important; }
          @media (max-width: 640px) {
            .hisse-tablo-header { display: none !important; }
            .hisse-row { grid-template-columns: 1fr 80px 80px !important; }
            .hisse-row .col-no { display: none !important; }
          }
        `}</style>
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px" }}>

          {/* Başlık */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: "#3B82F6", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>BIST · Tüm Hisseler</p>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10 }}>
                Hisseler
                <span style={{ fontSize: 13, color: "#334155", fontWeight: 500, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "2px 10px" }}>{filtrelendi.length} hisse</span>
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "8px 14px", minWidth: 260 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Hisse kodu veya şirket adı ara..."
                style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#94A3B8", width: "100%" }} />
              {arama && <button onClick={() => setArama("")} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14 }}>✕</button>}
            </div>
          </div>

          {/* Tablo */}
          <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden" }}>
            {/* Header */}
            <div className="hisse-tablo-header" style={{ display: "grid", gridTemplateColumns: "48px 1fr 110px 90px 80px 80px 80px 80px", gap: 8, padding: "10px 16px", borderBottom: "1px solid rgba(59,130,246,0.08)", background: "rgba(255,255,255,0.01)" }}>
              {["#", "HİSSE", "FİYAT", "GÜN %", "1H %", "1A %", "3A %", "1Y %"].map((h, i) => (
                <p key={h} style={{ fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.07em", textAlign: i > 1 ? "right" : "left" }}>{h}</p>
              ))}
            </div>

            {sayfadaki.filter(hisse => fiyatlar[hisse.ticker] !== null).map((hisse, i) => {
              const f = fiyatlar[hisse.ticker];
              const renk = tickerRenk(hisse.ticker);
              const globalNo = (sayfa - 1) * SAYFA_BOYUTU + i + 1;
              return (
                <div key={hisse.ticker} className="hisse-row" onClick={() => router.push(`/hisse/${hisse.ticker}`)}
                  style={{ display: "grid", gridTemplateColumns: "48px 1fr 110px 90px 80px 80px 80px 80px", gap: 8, padding: "11px 16px", borderBottom: "1px solid rgba(59,130,246,0.04)", cursor: "pointer", alignItems: "center", background: "transparent", transition: "background 0.1s" }}>
                  <span className="col-no" style={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>{globalNo}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${renk}18`, border: `1px solid ${renk}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                      {hisse.domain ? (
                        <img src={`https://www.google.com/s2/favicons?domain=${hisse.domain}&sz=32`} style={{ width: 18, height: 18, objectFit: "contain" }}
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 700, color: renk }}>{hisse.ticker.slice(0, 3)}</span>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", margin: 0, letterSpacing: "-0.2px" }}>{hisse.ticker}</p>
                      <p style={{ fontSize: 11, color: "#475569", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hisse.ad}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", textAlign: "right", margin: 0 }}>
                    {f ? `${f.fiyat} ₺` : <span style={{ color: "#1E293B" }}>—</span>}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 600, textAlign: "right", margin: 0, color: f ? (f.yukselis ? "#10B981" : "#EF4444") : "#1E293B" }}>
                    {f ? `${f.yukselis ? "▲" : "▼"} %${Math.abs(Number(f.degisim)).toFixed(2).replace(".", ",")}` : "—"}
                  </p>
                  {["1wk","1mo","3mo","1y"].map(range => {
                    const g = getiriler[hisse.ticker]?.[range];
                    const val = g ? parseFloat(g) : null;
                    return (
                      <p key={range} style={{ fontSize: 11, fontWeight: 500, textAlign: "right", margin: 0, color: val === null ? "#1E293B" : val >= 0 ? "#10B981" : "#EF4444" }}>
                        {val === null ? "—" : `${val >= 0 ? "%" : "%-"}${Math.abs(val).toFixed(2).replace(".", ",")}`}
                      </p>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 12, color: "#334155" }}>
              {(sayfa - 1) * SAYFA_BOYUTU + 1} – {Math.min(sayfa * SAYFA_BOYUTU, filtrelendi.length)} / {filtrelendi.length} hisse
            </p>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setSayfa(1)} disabled={sayfa === 1}
                style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.1)", color: sayfa === 1 ? "#1E293B" : "#64748B", cursor: sayfa === 1 ? "not-allowed" : "pointer", fontSize: 12 }}>«</button>
              <button onClick={() => setSayfa(s => Math.max(1, s - 1))} disabled={sayfa === 1}
                style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.1)", color: sayfa === 1 ? "#1E293B" : "#64748B", cursor: sayfa === 1 ? "not-allowed" : "pointer", fontSize: 12 }}>‹</button>
              {Array.from({ length: Math.min(5, toplamSayfa) }, (_, i) => {
                const p = Math.max(1, Math.min(sayfa - 2, toplamSayfa - 4)) + i;
                return (
                  <button key={p} onClick={() => setSayfa(p)}
                    style={{ padding: "6px 10px", borderRadius: 6, background: sayfa === p ? "#3B82F6" : "rgba(255,255,255,0.04)", border: `1px solid ${sayfa === p ? "#3B82F6" : "rgba(59,130,246,0.1)"}`, color: sayfa === p ? "#fff" : "#64748B", cursor: "pointer", fontSize: 12, fontWeight: sayfa === p ? 700 : 400 }}>{p}</button>
                );
              })}
              <button onClick={() => setSayfa(s => Math.min(toplamSayfa, s + 1))} disabled={sayfa === toplamSayfa}
                style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.1)", color: sayfa === toplamSayfa ? "#1E293B" : "#64748B", cursor: sayfa === toplamSayfa ? "not-allowed" : "pointer", fontSize: 12 }}>›</button>
              <button onClick={() => setSayfa(toplamSayfa)} disabled={sayfa === toplamSayfa}
                style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.1)", color: sayfa === toplamSayfa ? "#1E293B" : "#64748B", cursor: sayfa === toplamSayfa ? "not-allowed" : "pointer", fontSize: 12 }}>»</button>
            </div>
          </div>

        </main>
      </div>
    </AppShell>
  );
}
