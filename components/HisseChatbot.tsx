"use client";

import { useState, useRef, useEffect } from "react";

interface Mesaj {
  role: "user" | "assistant";
  proLink?: boolean;
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
  maliyet: number;
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
  const [limitDoldu, setLimitDoldu] = useState(false);
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
      const { data: { session } } = await (await import("@/components/lib/supabase")).supabase.auth.getSession();
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: yeniMesajlar, ticker, veri, analiz, portfoy }),
      });

      // 429 / hata: JSON cevap — SSE değil
      if (!res.ok) {
        const errJson = await res.json().catch(() => null) as { error?: string; mesaj?: string } | null;
        if (errJson?.error === "gunluk_limit") {
          setLimitDoldu(true);
          setMesajlar(prev => [...prev, {
            role: "assistant",
            content: "⚡ Günlük ücretsiz mesaj hakkınız doldu. Sınırsız analiz için Pro'ya geçin.",
            proLink: true,
          }]);
        } else {
          setMesajlar(prev => [...prev, { role: "assistant", content: errJson?.mesaj || errJson?.error || "Bir hata oluştu, tekrar dene." }]);
        }
        setYukleniyor(false);
        return;
      }

      if (!res.body) throw new Error("no stream");

      // SSE stream'i oku ve mesaja yaz
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let aktifMesajVar = false;
      let kalanHak: number | undefined;

      const upsertSon = (icerik: string) => {
        setMesajlar(prev => {
          if (!aktifMesajVar) {
            aktifMesajVar = true;
            return [...prev, { role: "assistant", content: icerik }];
          }
          const next = [...prev];
          const son = next[next.length - 1];
          if (son?.role === "assistant") next[next.length - 1] = { ...son, content: icerik };
          return next;
        });
      };
      let toplam = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as { type: string; text?: string; kalanHak?: number | null; pro?: boolean };
            if (ev.type === "delta" && ev.text) { toplam += ev.text; upsertSon(toplam); }
            else if (ev.type === "replace" && ev.text) { toplam = ev.text; upsertSon(toplam); }
            else if (ev.type === "done" && typeof ev.kalanHak === "number") { kalanHak = ev.kalanHak; }
            // Pro kullanıcılarda kalanHak=null gelir, ek metin eklenmez
          } catch { /* parse skip */ }
        }
      }

      if (!aktifMesajVar) {
        setMesajlar(prev => [...prev, { role: "assistant", content: "Cevap üretilemedi, tekrar dene." }]);
      } else if (kalanHak === 0 || kalanHak === 1) {
        const ek = kalanHak === 0 ? " · Günlük hakkınız bitti, Pro'ya geçin." : " · Son mesaj hakkınız.";
        setMesajlar(prev => {
          const next = [...prev];
          const son = next[next.length - 1];
          if (son?.role === "assistant") next[next.length - 1] = { ...son, content: son.content + ek };
          return next;
        });
      }
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
        .hisse-chatbot-float {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .hisse-chatbot-panel {
          position: fixed;
          bottom: 88px;
          right: 24px;
          z-index: 999;
          width: 340px;
          height: 460px;
          border-radius: 16px;
          background: #0F1C2E;
          border: 1px solid rgba(59,130,246,0.2);
          box-shadow: 0 8px 40px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        @media (max-width: 767px) {
          .hisse-chatbot-float {
            bottom: calc(76px + env(safe-area-inset-bottom));
            right: 14px;
            gap: 8px;
          }
          .hisse-chatbot-label {
            display: none !important;
          }
          .hisse-chatbot-button {
            width: 48px !important;
            height: 48px !important;
            font-size: 20px !important;
          }
          .hisse-chatbot-panel {
            left: 12px;
            right: 12px;
            bottom: calc(132px + env(safe-area-inset-bottom));
            width: auto;
            height: min(460px, calc(100vh - 170px));
            border-radius: 14px;
          }
        }
      `}</style>

      {/* Floating button */}
      <div className="hisse-chatbot-float">
        {!acik && (
          <div className="hisse-chatbot-label" style={{
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
          className={`${!acik ? "pk-pulse" : ""} hisse-chatbot-button`}
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
        <div className="hisse-chatbot-panel">
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
                  {m.proLink && (
                    <a href="/pro" style={{ display: "block", marginTop: 8, padding: "6px 12px", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#F97316", textDecoration: "none", textAlign: "center" }}>
                      ⚡ Pro'ya Yükselt
                    </a>
                  )}
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
            {limitDoldu ? (
              <a href="/pro" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px", borderRadius: 8, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316", fontSize: 12, fontWeight: 600, textDecoration: "none", gap: 6 }}>
                ⚡ Pro'ya Yükselt — Sınırsız Analiz
              </a>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
