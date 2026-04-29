"use client";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";

const RENKLER = ["#3B82F6","#8B5CF6","#EC4899","#F97316","#10B981","#06B6D4","#EAB308","#EF4444","#6366F1","#14B8A6"];
function tickerRenk(t: string) {
  let h = 0; for (let i = 0; i < t.length; i++) h = t.charCodeAt(i) + ((h << 5) - h);
  return RENKLER[Math.abs(h) % RENKLER.length];
}

type Hisse = {
  ticker: string;
  ad: string;
  domain?: string;
  fiyat: string | null;
  degisim: string | null;
  yukselis: boolean | null;
  hacim: number | null;
  getiri_1h: string | null;
  getiri_1a: string | null;
  getiri_3a: string | null;
  getiri_1y: string | null;
};

type ApiResponse = {
  items: Hisse[];
  total: number;
  page: number;
  pageSize: number;
};

const SIRALAMA_OPTIONS = [
  { key: "alfabetik", label: "A-Z" },
  { key: "yukselis", label: "▲ Yükselenler" },
  { key: "dusus", label: "▼ Düşenler" },
  { key: "hacim", label: "Hacim" },
  { key: "1wk", label: "1H %" },
  { key: "1mo", label: "1A %" },
  { key: "3mo", label: "3A %" },
  { key: "1y", label: "1Y %" },
];

function HisselerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sort = searchParams.get("sort") || "alfabetik";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const q = searchParams.get("q") || "";

  const [arama, setArama] = useState(q);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  // URL search param güncelleme yardımcısı
  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    });
    router.replace(`/hisseler?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Arama input → URL (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (arama !== q) {
        updateParams({ q: arama || null, page: "1" });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [arama]);

  // URL değişince data fetch
  useEffect(() => {
    setYukleniyor(true);
    const params = new URLSearchParams({ sort, page: String(page) });
    if (q) params.set("q", q);
    fetch(`/api/hisseler?${params.toString()}`)
      .then(r => r.json())
      .then((d: ApiResponse) => { setData(d); setYukleniyor(false); })
      .catch(() => setYukleniyor(false));
  }, [sort, page, q]);

  const items = data?.items || [];
  const toplam = data?.total || 0;
  const toplamSayfa = Math.max(1, Math.ceil(toplam / 25));

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
                <span style={{ fontSize: 13, color: "#334155", fontWeight: 500, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "2px 10px" }}>
                  {yukleniyor ? "..." : `${toplam} hisse`}
                </span>
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {SIRALAMA_OPTIONS.map(s => (
                <button key={s.key} onClick={() => updateParams({ sort: s.key, page: "1" })}
                  style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${sort === s.key ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.12)"}`, background: sort === s.key ? "rgba(59,130,246,0.15)" : "transparent", color: sort === s.key ? "#3B82F6" : "#64748B", fontSize: 12, fontWeight: sort === s.key ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {s.label}
                </button>
              ))}
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
            <div className="hisse-tablo-header" style={{ display: "grid", gridTemplateColumns: "48px 1fr 110px 90px 80px 80px 80px 80px", gap: 8, padding: "10px 16px", borderBottom: "1px solid rgba(59,130,246,0.08)", background: "rgba(255,255,255,0.01)" }}>
              {["#", "HİSSE", "FİYAT", "GÜN %", "1H %", "1A %", "3A %", "1Y %"].map((h, i) => (
                <p key={h} style={{ fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.07em", textAlign: i > 1 ? "right" : "left" }}>{h}</p>
              ))}
            </div>

            {yukleniyor && (
              <div style={{ padding: "60px 16px", textAlign: "center", color: "#475569", fontSize: 13 }}>
                Yükleniyor...
              </div>
            )}

            {!yukleniyor && items.length === 0 && (
              <div style={{ padding: "60px 16px", textAlign: "center", color: "#475569", fontSize: 13 }}>
                Sonuç bulunamadı
              </div>
            )}

            {!yukleniyor && items.map((hisse, i) => {
              const renk = tickerRenk(hisse.ticker);
              const globalNo = (page - 1) * 25 + i + 1;
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
                    {hisse.fiyat ? `${hisse.fiyat} ₺` : <span style={{ color: "#1E293B" }}>—</span>}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 600, textAlign: "right", margin: 0, color: hisse.degisim !== null ? (hisse.yukselis ? "#10B981" : "#EF4444") : "#1E293B" }}>
                    {hisse.degisim !== null ? `${hisse.yukselis ? "▲" : "▼"} %${Math.abs(Number(hisse.degisim)).toFixed(2).replace(".", ",")}` : "—"}
                  </p>
                  {(["getiri_1h","getiri_1a","getiri_3a","getiri_1y"] as const).map(key => {
                    const g = hisse[key];
                    const val = g !== null ? parseFloat(g) : null;
                    return (
                      <p key={key} style={{ fontSize: 11, fontWeight: 500, textAlign: "right", margin: 0, color: val === null ? "#1E293B" : val >= 0 ? "#10B981" : "#EF4444" }}>
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
              {toplam === 0 ? "0" : `${(page - 1) * 25 + 1} – ${Math.min(page * 25, toplam)}`} / {toplam} hisse
            </p>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => updateParams({ page: "1" })} disabled={page === 1}
                style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.1)", color: page === 1 ? "#1E293B" : "#64748B", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 12 }}>«</button>
              <button onClick={() => updateParams({ page: String(Math.max(1, page - 1)) })} disabled={page === 1}
                style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.1)", color: page === 1 ? "#1E293B" : "#64748B", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 12 }}>‹</button>
              {Array.from({ length: Math.min(5, toplamSayfa) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, toplamSayfa - 4)) + i;
                return (
                  <button key={p} onClick={() => updateParams({ page: String(p) })}
                    style={{ padding: "6px 10px", borderRadius: 6, background: page === p ? "#3B82F6" : "rgba(255,255,255,0.04)", border: `1px solid ${page === p ? "#3B82F6" : "rgba(59,130,246,0.1)"}`, color: page === p ? "#fff" : "#64748B", cursor: "pointer", fontSize: 12, fontWeight: page === p ? 700 : 400 }}>{p}</button>
                );
              })}
              <button onClick={() => updateParams({ page: String(Math.min(toplamSayfa, page + 1)) })} disabled={page === toplamSayfa}
                style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.1)", color: page === toplamSayfa ? "#1E293B" : "#64748B", cursor: page === toplamSayfa ? "not-allowed" : "pointer", fontSize: 12 }}>›</button>
              <button onClick={() => updateParams({ page: String(toplamSayfa) })} disabled={page === toplamSayfa}
                style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.1)", color: page === toplamSayfa ? "#1E293B" : "#64748B", cursor: page === toplamSayfa ? "not-allowed" : "pointer", fontSize: 12 }}>»</button>
            </div>
          </div>

        </main>
      </div>
    </AppShell>
  );
}

export default function HisselerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>}>
      <HisselerContent />
    </Suspense>
  );
}
