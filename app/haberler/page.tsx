"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

interface Haber {
  id: string;
  baslik: string;
  kaynak: string;
  kaynakUrl: string;
  tarih: string;
  tip: "kap" | "ekonomi" | "piyasa";
  ticker?: string;
}

function gorececeZaman(tarih: string) {
  const saniye = Math.floor((Date.now() - new Date(tarih).getTime()) / 1000);
  if (saniye < 60) return "Az önce";
  const dakika = Math.floor(saniye / 60);
  if (dakika < 60) return `${dakika} dk önce`;
  const saat = Math.floor(dakika / 60);
  if (saat < 24) return `${saat} sa önce`;
  return new Date(tarih).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

const TIP_RENK: Record<string, string> = { kap: "#F97316", piyasa: "#3B82F6", ekonomi: "#10B981" };
const TIP_ETIKET: Record<string, string> = { kap: "KAP", piyasa: "Piyasa", ekonomi: "Ekonomi" };

export default function HaberlerPage() {
  const [haberler, setHaberler] = useState<Haber[]>([]);
  const [loading, setLoading] = useState(true);
  const [aktifTip, setAktifTip] = useState("tumu");
  const [guncelleme, setGuncelleme] = useState("");

  async function fetchHaberler(tip: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/haberler?tip=${tip}`);
      const data = await res.json();
      setHaberler(data.haberler || []);
      setGuncelleme(data.guncelleme);
    } catch {
      setHaberler([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchHaberler("tumu"); }, []);

  const filtrelenmis = aktifTip === "tumu" ? haberler : haberler.filter(h => h.tip === aktifTip);

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <style>{`
          @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
          .haber-kart:hover { background: rgba(59,130,246,0.05) !important; border-color: rgba(59,130,246,0.2) !important; }
        `}</style>
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 11, color: "#3B82F6", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>ParaKonuşur · Haberler</p>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.3px", margin: 0 }}>Piyasa Haberleri</h1>
            </div>
            <button onClick={() => fetchHaberler(aktifTip)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 14px", fontSize: 12, color: "#64748B", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              ↻ Yenile
              {guncelleme && <span style={{ fontSize: 10, color: "#334155" }}>{gorececeZaman(guncelleme)}</span>}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[["tumu", "Tümü"], ["kap", "KAP"], ["piyasa", "Piyasa"]].map(([val, label]) => (
              <button key={val} onClick={() => setAktifTip(val)}
                style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, border: "1px solid", cursor: "pointer", transition: "all 0.15s", background: aktifTip === val ? "#3B82F6" : "transparent", color: aktifTip === val ? "#fff" : "#64748B", borderColor: aktifTip === val ? "#3B82F6" : "rgba(255,255,255,0.08)" }}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ height: 76, borderRadius: 12, background: "linear-gradient(90deg,#0F1C2E 25%,#162436 50%,#0F1C2E 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
              ))}
            </div>
          ) : filtrelenmis.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📰</div>
              <p style={{ color: "#475569", fontSize: 14 }}>Haber bulunamadı.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtrelenmis.map(haber => (
                <a key={haber.id} href={haber.kaynakUrl} target="_blank" rel="noopener noreferrer" className="haber-kart"
                  style={{ display: "block", textDecoration: "none", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, padding: "14px 18px", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: TIP_RENK[haber.tip] || "#64748B", background: `${TIP_RENK[haber.tip]}18`, border: `1px solid ${TIP_RENK[haber.tip]}33`, borderRadius: 4, padding: "1px 6px", letterSpacing: "0.04em", flexShrink: 0 }}>
                          {TIP_ETIKET[haber.tip] || haber.kaynak}
                        </span>
                        {haber.ticker && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", background: "rgba(59,130,246,0.08)", borderRadius: 4, padding: "1px 6px" }}>
                            {haber.ticker}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "#334155", marginLeft: "auto", flexShrink: 0 }}>
                          {gorececeZaman(haber.tarih)}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#E2E8F0", lineHeight: 1.5, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {haber.baslik}
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                </a>
              ))}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
