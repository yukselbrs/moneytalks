"use client";

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
  return (
    <div className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 12, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 0, minHeight: 280 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase" }}>Yapay Zekâ Analizi</p>
        <button onClick={onAnalyze}
          style={{ fontSize: 10, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 20, padding: "3px 12px", cursor: "pointer" }}>
          ↻ Yeni
        </button>
      </div>

      {aiPanel?.yukleniyor ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "24px 0" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(59,130,246,0.2)", borderTopColor: "#3B82F6", animation: "spin 0.8s linear infinite" }}/>
          <span style={{ fontSize: 11, color: "#334155" }}>Analiz yapılıyor...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
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
                  strokeDasharray={`${(aiPanel.skor / 100) * 263.9} 263.9`}
                  style={{ filter: `drop-shadow(0 0 5px ${skorRenk(aiPanel.skor)}88)` }}/>
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-1.2px" }}>{aiPanel.skor}</span>
                <span style={{ fontSize: 9, color: "#64748B", fontWeight: 600 }}>AI Skoru</span>
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
              <p style={{ fontSize: 10, color: "#334155", marginTop: 6 }}>
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
          <style>{`.pro-btn-wrap:hover .pro-tooltip { display: block !important; }`}</style>
          <p style={{ fontSize: 9, color: "#334155", marginTop: 6, textAlign: "center", lineHeight: 1.5 }}>
            Yatırım tavsiyesi değildir. Yalnızca teknik veri analizidir.
          </p>
        </>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "32px 16px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🤖</div>
          <p style={{ fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 1.6 }}>Piyasa analizi için<br/>aşağıya tıklayın</p>
          <button onClick={onAnalyze}
            style={{ padding: "9px 24px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>
            ✦ Analiz Et
          </button>
          <p style={{ fontSize: 9, color: "#334155", textAlign: "center", lineHeight: 1.5 }}>Yatırım tavsiyesi değildir.</p>
        </div>
      )}
    </div>
  );
}
