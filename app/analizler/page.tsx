"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import AppShell from "@/components/AppShell";

export default function AnalizlerPage() {
  const [analizler, setAnalizler] = useState<{ ticker: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      const { data } = await supabase
        .from("analizler")
        .select("ticker, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (data) setAnalizler(data);
      setLoading(false);
    });
  }, [router]);

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "#F8FAFC", marginBottom: 20 }}>Analiz Geçmişi</h1>
          {loading ? (
            <p style={{ fontSize: 13, color: "#475569" }}>Yükleniyor...</p>
          ) : analizler.length === 0 ? (
            <p style={{ fontSize: 13, color: "#475569" }}>Henüz analiz yapmadınız.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {analizler.map((a, i) => (
                <div key={i} onClick={() => router.push(`/hisse/${a.ticker}`)}
                  style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(59,130,246,0.1)", borderRadius: 10, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.05)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.25)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.1)"; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(59,130,246,0.1)", border: "0.5px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#3B82F6" }}>
                      {a.ticker.slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#E2E8F0" }}>{a.ticker}</div>
                      <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>
                        {new Date(a.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: "#1E40AF" }}>→</span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
