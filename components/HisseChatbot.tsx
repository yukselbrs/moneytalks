"use client";

import { useState, useRef, useEffect } from "react";

interface Mesaj {
  role: "user" | "assistant";
  content: string;
}

interface HisseVeri {
  fiyat: number;
  oncekiKapanis: number;
  gunlukYuksek: number;
  gunlukDusuk: number;
  yillikYuksek: number;
  yillikDusuk: number;
  hacim: number;
}

interface PortfoyItem {
  ticker: string;
  adet: number;
  alis_fiyati: number;
}

interface Props {
  ticker: string;
  veri: HisseVeri | null;
  analiz: string;
  portfoy: PortfoyItem[];
}

export default function HisseChatbot({ ticker, veri, analiz, portfoy }: Props) {
  const [acik, setAcik] = useState(false);
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([
    { role: "assistant", content: `Merhaba! ${ticker} hakkında soru sorabilirsin.` }
  ]);
  const [input, setInput] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const altRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mesajlar]);

  async function gonder() {
    const metin = input.trim();
    if (!metin || yukleniyor) return;
    const yeniMesajlar: Mesaj[] = [...mesajlar, { role: "user", content: metin }];
    setMesajlar(yeniMesajlar);
    setInput("");
    setYukleniyor(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: yeniMesajlar, ticker, veri, analiz, portfoy }),
      });
      const data = await res.json();
      setMesajlar(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMesajlar(prev => [...prev, { role: "assistant", content: "Bir hata oluştu, tekrar dene." }]);
    }
    setYukleniyor(false);
  }

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        .pk-pulse::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #3B82F6;
          animation: pulse-ring 1.8s ease-out infinite;
          z-index: -1;
        }
        @keyframes fadein-label {
          from { opacity: 0; transform: translateX(6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Floating button */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, display: "flex", alignItems: "center", gap: 10 }}>
        {!acik && (
          <div style={{
            animation: "fadein-label 0.3s ease",
            background: "#0F1C2E",
            border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: 20,
            padding: "6px 14px",
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            cursor: "pointer",
          }} onClick={() => setAcik(true)}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D9E75", flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#CBD5E1", whiteSpace: "nowrap" }}>AI Asistan</span>
          </div>
        )}
        <button
          onClick={() => setAcik(!acik)}
          className={!acik ? "pk-pulse" : ""}
          style={{
            position: "relative",
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg, #1E40AF, #3B82F6)",
            border: "none", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, color: "#fff", flexShrink: 0,
          }}
        >
          {acik ? "✕" : "💬"}
        </button>
      </div>

      {/* Chat panel */}
      {acik && (
        <div style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 999,
          width: 340, height: 460, borderRadius: 16,
          background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#F8FAFC" }}>{ticker} Asistanı</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {mesajlar.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "8px 12px",
                  borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.role === "user" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)"}`,
                  fontSize: 12, color: "#CBD5E1", lineHeight: 1.6,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {yukleniyor && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "8px 14px", borderRadius: "12px 12px 12px 2px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 18, color: "#475569" }}>
                  ···
                </div>
              </div>
            )}
            <div ref={altRef} />
          </div>

          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(59,130,246,0.1)", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && gonder()}
              placeholder="Soru sor..."
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 8,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)",
                color: "#F8FAFC", fontSize: 12, outline: "none",
              }}
            />
            <button
              onClick={gonder}
              disabled={yukleniyor || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: "linear-gradient(135deg, #1E40AF, #3B82F6)",
                border: "none", cursor: "pointer", color: "#fff", fontSize: 14,
                opacity: yukleniyor || !input.trim() ? 0.4 : 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
