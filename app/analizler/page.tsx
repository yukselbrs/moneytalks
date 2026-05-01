"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import AppShell from "@/components/AppShell";

function gorececeZaman(tarih: string) {
  const saniye = Math.floor((Date.now() - new Date(tarih).getTime()) / 1000);
  if (saniye < 60) return "Az önce";
  const dakika = Math.floor(saniye / 60);
  if (dakika < 60) return `${dakika} dakika önce`;
  const saat = Math.floor(dakika / 60);
  if (saat < 24) return `${saat} saat önce`;
  const gun = Math.floor(saat / 24);
  if (gun < 7) return `${gun} gün önce`;
  return new Date(tarih).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Analiz { ticker: string; created_at: string; analiz?: string; }
interface FiyatBilgi { fiyat: string; degisim: string; yukselis: boolean; }

export default function AnalizlerPage() {
  const [analizler, setAnalizler] = useState<Analiz[]>([]);
  const [fiyatlar, setFiyatlar] = useState<Record<string, FiyatBilgi>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      const { data } = await supabase.from("analizler")
        .select("ticker, created_at, analiz")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (data) {
        setAnalizler(data);
        const tickerler = [...new Set(data.map((a: Analiz) => a.ticker))];
        if (tickerler.length > 0) {
          fetch(`/api/fiyatlar?extra=${tickerler.join(",")}`)
            .then(r => r.json()).then(d => setFiyatlar(d)).catch(() => {});
        }
      }
      setLoading(false);
    });
  }, [router]);

  function kisaOzet(_analiz?: string, ticker?: string): string {
    if (!ticker) return "";
    return ticker + " Hissesi Analizi";
  }

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.3px" }}>Analiz Geçmişi</h1>
              <p style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Yapay zeka ile incelediğiniz tüm hisseler</p>
            </div>
            {analizler.length > 0 && (
              <div style={{ fontSize: 12, color: "#475569", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 14px" }}>
                {analizler.length} analiz
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 88, borderRadius: 12, background: "linear-gradient(90deg,#0F1C2E 25%,#162436 50%,#0F1C2E 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
              ))}
              <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
            </div>
          ) : analizler.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <p style={{ fontSize: 15, color: "#475569", fontWeight: 500 }}>Henüz analiz yapmadınız.</p>
              <p style={{ fontSize: 13, color: "#334155", marginTop: 6 }}>Dashboard'dan bir hisse seçerek ilk analizinizi yapın.</p>
              <button onClick={() => router.push("/dashboard")} style={{ marginTop: 20, background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Dashboard'a Git
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {analizler.map((a, i) => {
                const f = fiyatlar[a.ticker];
                const ozet = kisaOzet(a.analiz, a.ticker);
                const renk = f ? (f.yukselis ? "#10B981" : "#EF4444") : "#64748B";
                return (
                  <div key={i} onClick={() => router.push(`/hisse/${a.ticker}`)}
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.05)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.25)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.1)"; }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#3B82F6", flexShrink: 0 }}>
                          {a.ticker.slice(0, 2)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9" }}>{a.ticker}</span>
                            {f && <span style={{ fontSize: 12, fontWeight: 600, color: renk }}>{f.yukselis ? "▲" : "▼"} %{f.degisim}</span>}
                            <span style={{ fontSize: 11, color: "#334155", marginLeft: "auto" }}>{gorececeZaman(a.created_at)}</span>
                          </div>
                          {ozet && (
                            <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                              {ozet}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        {f && <span style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0" }}>{f.fiyat} ₺</span>}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
