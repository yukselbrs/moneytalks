"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import AppShell from "@/components/AppShell";

export default function IzlemePage() {
  const [watchlist, setWatchlist] = useState<{ ticker: string; added_at: string }[]>([]);
  const [fiyatlar, setFiyatlar] = useState<Record<string, { fiyat: string; degisim: string; yukselis: boolean } | null>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      const { data } = await supabase
        .from("watchlist")
        .select("ticker, added_at")
        .eq("user_id", session.user.id)
        .order("added_at", { ascending: false });
      if (data) {
        setWatchlist(data);
        const tickers = data.map((w: { ticker: string }) => w.ticker).join(",");
        if (tickers) {
          fetch(`/api/fiyatlar?extra=${tickers}`)
            .then(r => r.json())
            .then(d => setFiyatlar(d));
        }
      }
      setLoading(false);
    });
  }, [router]);

  async function removeFromWatchlist(ticker: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("ticker", ticker);
    setWatchlist(prev => prev.filter(w => w.ticker !== ticker));
  }

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "#F8FAFC", marginBottom: 20 }}>İzleme Listesi</h1>
          {loading ? (
            <p style={{ fontSize: 13, color: "#475569" }}>Yükleniyor...</p>
          ) : watchlist.length === 0 ? (
            <p style={{ fontSize: 13, color: "#475569" }}>İzleme listeniz boş.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {watchlist.map((w, i) => (
                <div key={i}
                  style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(59,130,246,0.1)", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div onClick={() => router.push(`/hisse/${w.ticker}`)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flex: 1 }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = "0.8"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = "1"}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(59,130,246,0.1)", border: "0.5px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#3B82F6" }}>
                      {w.ticker.slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#E2E8F0" }}>{w.ticker}</div>
                      {fiyatlar[w.ticker] && (
                        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                          <span style={{ fontSize: 12, color: "#94A3B8" }}>{fiyatlar[w.ticker]!.fiyat} ₺</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: fiyatlar[w.ticker]!.yukselis ? "#1D9E75" : "#E24B4A", display: "flex", alignItems: "center", gap: 2 }}>
                            <span>{fiyatlar[w.ticker]!.yukselis ? "▲" : "▼"}</span>
                            <span>{fiyatlar[w.ticker]!.yukselis ? "%" : "%-"}{Math.abs(Number(fiyatlar[w.ticker]!.degisim)).toFixed(2).replace(".", ",")}</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>
                      {new Date(w.added_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <button onClick={() => removeFromWatchlist(w.ticker)}
                    style={{ fontSize: 12, color: "#334155", background: "none", border: "none", cursor: "pointer", marginLeft: 16 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
