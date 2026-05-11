"use client";

import { useState, useEffect } from "react";

type AiPanel = {
  skor: number;
  seviye: string;
  yorum: string;
  guven: string;
  yukleniyor: boolean;
} | null;

type Props = {
  aiPanel: AiPanel;
  onAnalyze: () => void;
};

function skorRenk(skor: number) {
  if (skor >= 65) return "#10B981";
  if (skor >= 45) return "#F59E0B";
  return "#EF4444";
}

function gorunumMetni(skor: number) {
  if (skor >= 65) return "Güçlü Görünüm";
  if (skor >= 55) return "Olumlu Görünüm";
  if (skor >= 45) return "Nötr Görünüm";
  if (skor >= 35) return "Zayıf Görünüm";
  return "Olumsuz Görünüm";
}

export default function DashboardAiPanel({ aiPanel, onAnalyze }: Props) {
  const [displaySkor, setDisplaySkor] = useState(0);

  useEffect(() => {
    if (!aiPanel || aiPanel.yukleniyor) { setDisplaySkor(0); return; }
    const target = aiPanel.skor;
    const duration = 900;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplaySkor(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [aiPanel?.skor, aiPanel?.yukleniyor]);

  return (
    <div style={{ position: "relative", borderRadius: 10, padding: "1px", background: "#0B1220" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes ai-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes ai-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.35); } 50% { box-shadow: 0 0 0 6px rgba(99,102,241,0); } }
        @keyframes border-spin { to { transform: rotate(360deg); } }
        .ai-analyze-btn:hover { background: linear-gradient(135deg, rgba(99,102,241,0.95), rgba(139,92,246,0.95)) !important; box-shadow: 0 6px 20px rgba(99,102,241,0.45) !important; }
        .pro-btn-wrap:hover .pro-tooltip { display: block !important; }
      `}</style>

      {/* Spinning border — thin glowing arc */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "200%", height: "200%", marginTop: "-100%", marginLeft: "-100%", background: "conic-gradient(from 0deg, transparent 0deg, transparent 140deg, rgba(139,92,246,0.45) 160deg, rgba(167,139,250,0.65) 175deg, rgba(139,92,246,0.45) 190deg, transparent 210deg, transparent 360deg)", animation: "border-spin 10s linear infinite" }} />
      </div>

    <div style={{ background: "#0B1220", borderRadius: 9, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 0, minHeight: 280, position: "relative", overflow: "hidden", zIndex: 1 }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#818CF8", animation: "ai-dot 2s ease-in-out infinite", animation: "ai-pulse 2.4s ease-in-out infinite" }} />
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,139,250,0.75)", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>Yapay Zekâ Analizi</p>
        </div>
        <button onClick={onAnalyze}
          style={{ fontSize: 12, fontWeight: 600, color: "#818CF8", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 20, padding: "3px 12px", cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.18)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; }}>
          ↻ Yeni
        </button>
      </div>

      {aiPanel?.yukleniyor ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "24px 0" }}>
          <div style={{ position: "relative", width: 44, height: 44 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.15)", borderTopColor: "#818CF8", animation: "spin 0.8s linear infinite" }} />
            <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "rgba(99,102,241,0.08)" }} />
          </div>
          <span style={{ fontSize: 11, color: "#475569", letterSpacing: "0.02em" }}>Analiz yapılıyor...</span>
        </div>
      ) : aiPanel ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, transform: "rotate(-90deg)" }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7"/>
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={skorRenk(aiPanel.skor)}
                  strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${(displaySkor / 100) * 263.9} 263.9`}
                  style={{ filter: `drop-shadow(0 0 5px ${skorRenk(aiPanel.skor)}88)`, transition: "stroke-dasharray 0.05s linear" }}/>
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-1.2px" }}>{displaySkor}</span>
                <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>AI Skoru</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: skorRenk(aiPanel.skor), marginBottom: 6, letterSpacing: "-0.3px" }}>
                {gorunumMetni(aiPanel.skor)}
              </p>
              {aiPanel.yorum && aiPanel.yorum !== "Analiz yükleniyor..." ? (
                <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>{aiPanel.yorum}</p>
              ) : (
                <div>
                  <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
                    Teknik göstergeler ve risk faktörleri analiz edildi.
                  </p>
                  <a href="/pro" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, fontWeight: 600, color: "#F97316", textDecoration: "none" }}>
                    ⚡ Detaylı yorumu görmek için Pro&apos;ya geç →
                  </a>
                </div>
              )}
              <p style={{ fontSize: 12, color: "#334155", marginTop: 6 }}>
                Güven: <span style={{ color: aiPanel.guven === "Yüksek" ? "#10B981" : aiPanel.guven === "Orta" ? "#F59E0B" : "#EF4444", fontWeight: 600 }}>{aiPanel.guven}</span>
              </p>
              <a href="/pro" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11, fontWeight: 500, color: "#64748B", textDecoration: "none" }}>
                <span style={{ color: "#F97316" }}>⚡</span> Detaylı teknik analiz için Pro&apos;ya geç →
              </a>
            </div>
          </div>

          <div style={{ position: "relative", marginTop: "auto" }} className="pro-btn-wrap">
            <a
              href="/pro"
              style={{ width: "100%", padding: "9px 0", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 8, fontSize: 12, fontWeight: 500, color: "#F97316", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(249,115,22,0.12)"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(249,115,22,0.06)"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.2)"; }}>
              ⚡ Pro&apos;ya Yükselt
            </a>
            <div className="pro-tooltip" style={{ display: "none", position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1E293B", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#F97316", whiteSpace: "nowrap", zIndex: 50 }}>
              Sınırsız analiz ve gerçek zamanlı veriler
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#334155", marginTop: 6, textAlign: "center", lineHeight: 1.5 }}>
            Yatırım tavsiyesi değildir. Yalnızca teknik veri analizidir.
          </p>
        </>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "28px 16px" }}>
          {/* AI icon with pulse ring */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -6, borderRadius: "50%", background: "rgba(99,102,241,0.08)", animation: "ai-pulse 2.4s ease-in-out infinite" }} />
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.09 8.26L19 7L14.74 11.74L21 12L14.74 12.26L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.26L3 12L9.26 11.74L5 7L10.91 8.26L12 2Z" fill="url(#star-grad)" />
                <defs>
                  <linearGradient id="star-grad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#A78BFA"/>
                    <stop offset="1" stopColor="#818CF8"/>
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: "absolute", top: 8, right: 9, width: 5, height: 5, borderRadius: "50%", background: "#818CF8", animation: "ai-dot 2s ease-in-out infinite" }} />
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#C4B5FD", marginBottom: 4, letterSpacing: "-0.2px" }}>AI Piyasa Analizi</p>
            <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>Teknik göstergeler ve risk<br/>faktörleri analiz edilecek</p>
          </div>

          <button
            className="ai-analyze-btn"
            onClick={onAnalyze}
            style={{ padding: "10px 28px", background: "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(139,92,246,0.85))", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#E2D9FF", cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.3)", transition: "all 0.15s", letterSpacing: "0.01em" }}>
            ✦ Analiz Et
          </button>

          <p style={{ fontSize: 11, color: "#2D3F55", textAlign: "center", lineHeight: 1.5 }}>Yatırım tavsiyesi değildir.</p>
        </div>
      )}
    </div>
    </div>
  );
}
