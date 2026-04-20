"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

function renderMarkdown(text: string) {
  const sections: { title: string; body: string }[] = [];
  const lines = text.split("\n");
  let current: { title: string; body: string } | null = null;
  for (const line of lines) {
    if (line.startsWith("**") && line.endsWith("**")) {
      if (current) sections.push(current);
      current = { title: line.replace(/\*\*/g, ""), body: "" };
    } else if (line.trim() && current) {
      current.body += (current.body ? " " : "") + line.trim();
    }
  }
  if (current) sections.push(current);
  return sections;
}

export default function HissePage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: tickerParam } = use(params);
  const ticker = tickerParam.toUpperCase();
  const [analiz, setAnaliz] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    handleAnaliz();
  }, [ticker]);

  async function handleAnaliz() {
    setLoading(true);
    setAnaliz("");
    const res = await fetch("/api/analiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    const data = await res.json();
    setAnaliz(data.analiz);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const sections = analiz ? renderMarkdown(analiz) : [];

  return (
    <div className="min-h-screen" style={{ background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <nav style={{ borderBottom: "1px solid rgba(59,130,246,0.1)", padding: "13px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: "#F8FAFC" }}>
          para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#1E293B" }}>.com</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/dashboard" style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>← Dashboard</a>
          <button onClick={handleLogout} style={{ fontSize: 12, color: "#94A3B8", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "5px 13px", background: "transparent", cursor: "pointer" }}>
            Çıkış Yap
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 11, color: "#3B82F6", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>BIST · Hisse Analizi</p>
            <h1 style={{ fontSize: 32, fontWeight: 500, color: "#F8FAFC", letterSpacing: "-0.5px", marginBottom: 4 }}>{ticker}</h1>
          </div>
          <button
            onClick={handleAnaliz}
            disabled={loading}
            style={{ height: 38, padding: "0 20px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: 8, whiteSpace: "nowrap" }}
          >
            {loading ? "Analiz ediliyor..." : "AI Özet Üret"}
          </button>
        </div>

        {sections.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>AI Analiz Özeti</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sections.map((s, i) => (
                <div key={i} style={{ border: "1px solid rgba(59,130,246,0.1)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.title === "Dikkat Noktaları" ? "#E24B4A" : "#3B82F6", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#94A3B8" }}>{s.title}</span>
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "12px 16px", border: "1px solid rgba(59,130,246,0.06)", borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: "#1E293B", lineHeight: 1.6 }}>
                Bu analiz yalnizca bilgilendirme amaclidir ve yatirim tavsiyesi niteligini tasimaz. Her turlu yatirim karari yatirimcinin kendi sorumlulugunadadir.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
