"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/components/lib/supabase";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ONERILEN_SORULAR = [
  "BİST'te hangi sektörler enflasyona karşı dayanıklıdır?",
  "F/K ve PD/DD oranları nasıl yorumlanır?",
  "Teknik analizde RSI göstergesi ne anlama gelir?",
  "Beta katsayısı nedir, portföyde nasıl kullanılır?",
  "Temettü yatırımı stratejisi nedir?",
  "Hisse senedi likidite riski nasıl değerlendirilir?",
];

const AIIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default function YapayZekaPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [kalanHak, setKalanHak] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function autoResizeTextarea() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (data.error === "gunluk_limit") {
        setMessages(prev => [...prev, { role: "assistant", content: data.mesaj }]);
      } else if (data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        if (data.kalanHak !== undefined) setKalanHak(data.kalanHak);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Bir hata oluştu. Lütfen tekrar deneyin." }]);
    } finally {
      setLoading(false);
    }
  }

  function yeniSohbet() {
    setMessages([]);
    setInput("");
    setKalanHak(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 53px)", overflow: "hidden" }}>
      <style>{`
        .yz-left { width: 220px; border-right: 1px solid rgba(255,255,255,0.06); background: #070D1A; display: flex; flex-direction: column; padding: 16px 12px; gap: 6px; flex-shrink: 0; overflow-y: auto; }
        .yz-soru-btn { background: none; border: none; cursor: pointer; color: #475569; font-size: 12px; font-weight: 500; text-align: left; padding: 7px 8px; border-radius: 7px; line-height: 1.4; width: 100%; transition: background 0.1s, color 0.1s; font-family: inherit; }
        .yz-soru-btn:hover { background: rgba(255,255,255,0.04); color: #94A3B8; }
        .yz-chip { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #64748B; font-size: 12px; font-weight: 500; padding: 8px 14px; border-radius: 20px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .yz-chip:hover { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); color: #93C5FD; }
        .yz-textarea { flex: 1; background: none; border: none; outline: none; color: #F1F5F9; font-size: 14px; resize: none; line-height: 1.5; font-family: inherit; overflow-y: auto; }
        .yz-textarea::placeholder { color: #334155; }
        @media (max-width: 767px) { .yz-left { display: none !important; } }
      `}</style>

      {/* Left Panel */}
      <div className="yz-left">
        <button
          onClick={yeniSohbet}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
            color: "#60A5FA", borderRadius: 8, padding: "9px 12px", cursor: "pointer",
            fontSize: 13, fontWeight: 600, width: "100%", fontFamily: "inherit",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Yeni Sohbet
        </button>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 0" }} />

        <p style={{ fontSize: 10, fontWeight: 700, color: "#2D3F55", letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 4px" }}>
          Önerilen Sorular
        </p>
        {ONERILEN_SORULAR.map((soru, i) => (
          <button key={i} className="yz-soru-btn" onClick={() => sendMessage(soru)}>
            {soru}
          </button>
        ))}
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {isEmpty ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", gap: 28 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18,
                background: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(37,99,235,0.08))",
                border: "1px solid rgba(59,130,246,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h2 style={{ color: "#F1F5F9", fontSize: 22, fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.3px" }}>
                BIST AI Asistan
              </h2>
              <p style={{ color: "#475569", fontSize: 14, margin: 0, maxWidth: 420, lineHeight: 1.65 }}>
                BIST hisseleri, piyasa dinamikleri ve finans hakkındaki sorularınızı sorun.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 580 }}>
              {ONERILEN_SORULAR.slice(0, 4).map((soru, i) => (
                <button key={i} className="yz-chip" onClick={() => sendMessage(soru)}>
                  {soru}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 20 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: 12, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 32, height: 32, borderRadius: 10,
                      background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.22)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 2,
                    }}>
                      <AIIcon />
                    </div>
                  )}
                  <div style={{
                    maxWidth: "75%", padding: "11px 15px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${msg.role === "user" ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.07)"}`,
                    color: "#CBD5E1", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.22)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <AIIcon />
                  </div>
                  <div style={{
                    padding: "12px 16px", borderRadius: "14px 14px 14px 4px",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                    <span style={{ color: "#3B5575", fontSize: 20, letterSpacing: 4 }}>···</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#060C18" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{
              display: "flex", gap: 10, alignItems: "flex-end",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 12, padding: "10px 12px",
            }}>
              <textarea
                ref={textareaRef}
                className="yz-textarea"
                value={input}
                onChange={e => { setInput(e.target.value); autoResizeTextarea(); }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Borsayla ilgili neyi merak ediyorsun?"
                rows={1}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: "none", cursor: "pointer",
                  background: input.trim() && !loading ? "#3B82F6" : "rgba(59,130,246,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "background 0.15s",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={input.trim() && !loading ? "#fff" : "#3B82F6"}
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            {kalanHak !== null && (
              <p style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 8 }}>
                Bugün {kalanHak} mesaj hakkın kaldı ·{" "}
                <a href="/pro" style={{ color: "#3B82F6", textDecoration: "none" }}>Pro&apos;ya geç →</a>
              </p>
            )}
            <p style={{ fontSize: 11, color: "#1E293B", textAlign: "center", marginTop: kalanHak !== null ? 2 : 8 }}>
              AI ile yapılan analizlerde hata olabilir, kendi kontrollerinizi yapın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
