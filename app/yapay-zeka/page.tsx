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

const ONERILEN_IKONLAR = ["📈", "📊", "📉", "⚡", "💰", "🔍"];

export default function YapayZekaPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [kalanHak, setKalanHak] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function autoResizeTextarea() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
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
    <div style={{ display: "flex", height: "calc(100vh - 53px)", overflow: "hidden", background: "#060C18" }}>
      <style>{`
        @keyframes aurora { 0%,100% { opacity:0.5; transform:scale(1) rotate(0deg); } 50% { opacity:0.8; transform:scale(1.08) rotate(180deg); } }
        @keyframes ring-pulse { 0%,100% { opacity:0.15; transform:scale(1); } 50% { opacity:0.3; transform:scale(1.06); } }
        @keyframes dot-blink { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.7); } }
        @keyframes slide-up { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fade-in { from { opacity:0; } to { opacity:1; } }

        .yz-left { width: 228px; border-right: 1px solid rgba(255,255,255,0.055); background: #070D1A; display: flex; flex-direction: column; padding: 16px 12px 20px; gap: 4px; flex-shrink: 0; overflow-y: auto; }
        .yz-new-btn { display:flex; align-items:center; gap:8px; background:linear-gradient(135deg,rgba(99,102,241,0.14),rgba(59,130,246,0.1)); border:1px solid rgba(99,102,241,0.3); color:#A78BFA; border-radius:10px; padding:10px 14px; cursor:pointer; font-size:13px; font-weight:600; width:100%; font-family:inherit; transition:all 0.18s; }
        .yz-new-btn:hover { background:linear-gradient(135deg,rgba(99,102,241,0.22),rgba(59,130,246,0.16)); border-color:rgba(99,102,241,0.5); color:#C4B5FD; box-shadow:0 0 16px rgba(99,102,241,0.2); }
        .yz-soru-btn { background:none; border:none; cursor:pointer; color:#3D5470; font-size:12px; font-weight:500; text-align:left; padding:7px 10px; border-radius:8px; line-height:1.45; width:100%; transition:all 0.12s; font-family:inherit; display:flex; align-items:flex-start; gap:7px; }
        .yz-soru-btn:hover { background:rgba(99,102,241,0.07); color:#7C93B0; }
        .yz-chip { display:flex; align-items:center; gap:7px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); color:#4A6080; font-size:13px; font-weight:500; padding:10px 16px; border-radius:12px; cursor:pointer; transition:all 0.18s; font-family:inherit; text-align:left; line-height:1.4; }
        .yz-chip:hover { background:rgba(99,102,241,0.1); border-color:rgba(99,102,241,0.35); color:#A78BFA; transform:translateY(-1px); box-shadow:0 4px 16px rgba(99,102,241,0.12); }
        .yz-textarea { flex:1; background:none; border:none; outline:none; color:#E2E8F0; font-size:15px; resize:none; line-height:1.6; font-family:inherit; overflow-y:auto; }
        .yz-textarea::placeholder { color:#2A3F58; }
        .yz-msg-ai { animation: slide-up 0.2s ease; }
        .yz-msg-user { animation: slide-up 0.15s ease; }
        @media (max-width: 767px) { .yz-left { display:none !important; } }
      `}</style>

      {/* Left Panel */}
      <div className="yz-left">
        {/* Branding */}
        <div style={{ padding: "4px 6px 12px", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(59,130,246,0.2))",
            border: "1px solid rgba(99,102,241,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 12px rgba(99,102,241,0.25)",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, background: "linear-gradient(90deg, #A78BFA, #60A5FA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pako AI</p>
            <p style={{ margin: 0, fontSize: 10, color: "#2A3F58", fontWeight: 500 }}>BIST Finans Asistanı</p>
          </div>
        </div>

        <button className="yz-new-btn" onClick={yeniSohbet}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Yeni Sohbet
        </button>

        <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "10px 0 6px" }} />

        <p style={{ fontSize: 10, fontWeight: 700, color: "#1E3048", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 6px 4px" }}>
          Önerilen
        </p>
        {ONERILEN_SORULAR.map((soru, i) => (
          <button key={i} className="yz-soru-btn" onClick={() => sendMessage(soru)}>
            <span style={{ fontSize: 13, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>{ONERILEN_IKONLAR[i]}</span>
            <span>{soru}</span>
          </button>
        ))}
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {isEmpty ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 60px", gap: 36, position: "relative", overflow: "hidden" }}>

            {/* Aurora background */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", animation: "aurora 8s ease-in-out infinite" }} />
              <div style={{ position: "absolute", top: "35%", left: "48%", transform: "translate(-50%,-50%)", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)", animation: "aurora 6s ease-in-out infinite 2s" }} />
            </div>

            {/* Hero Icon */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Rings */}
              {[96, 72, 52].map((size, i) => (
                <div key={i} style={{
                  position: "absolute", width: size, height: size, borderRadius: "50%",
                  border: `1px solid rgba(99,102,241,${0.12 - i * 0.03})`,
                  animation: `ring-pulse ${3 + i}s ease-in-out infinite ${i * 0.8}s`,
                }} />
              ))}
              {/* Core */}
              <div style={{
                width: 56, height: 56, borderRadius: 18, position: "relative", zIndex: 1,
                background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(59,130,246,0.15))",
                border: "1px solid rgba(99,102,241,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 30px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: "center", animation: "fade-in 0.6s ease" }}>
              <h1 style={{
                margin: "0 0 10px", fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px",
                background: "linear-gradient(135deg, #C4B5FD 0%, #93C5FD 60%, #7DD3FC 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                Pako AI
              </h1>
              <p style={{ color: "#334E6A", fontSize: 15, margin: 0, lineHeight: 1.6, maxWidth: 380 }}>
                BIST hisseleri ve piyasa dinamikleri hakkında soru sor
              </p>
            </div>

            {/* Chips */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 560, animation: "slide-up 0.5s ease 0.1s both" }}>
              {ONERILEN_SORULAR.slice(0, 4).map((soru, i) => (
                <button key={i} className="yz-chip" onClick={() => sendMessage(soru)}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{ONERILEN_IKONLAR[i]}</span>
                  {soru}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 0 8px" }}>
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 28px", display: "flex", flexDirection: "column", gap: 24 }}>
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "assistant" ? "yz-msg-ai" : "yz-msg-user"} style={{ display: "flex", gap: 12, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 2,
                      background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.12))",
                      border: "1px solid rgba(99,102,241,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 10px rgba(99,102,241,0.15)",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                      </svg>
                    </div>
                  )}
                  <div style={{
                    maxWidth: "78%",
                    padding: msg.role === "user" ? "10px 15px" : "13px 16px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                    background: msg.role === "user"
                      ? "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(59,130,246,0.18))"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${msg.role === "user" ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.06)"}`,
                    borderLeft: msg.role === "assistant" ? "2px solid rgba(99,102,241,0.4)" : undefined,
                    color: msg.role === "user" ? "#C4B5FD" : "#94A3B8",
                    fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="yz-msg-ai" style={{ display: "flex", gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.12))",
                    border: "1px solid rgba(99,102,241,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 10px rgba(99,102,241,0.15)",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                    </svg>
                  </div>
                  <div style={{ padding: "14px 18px", borderRadius: "4px 16px 16px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderLeft: "2px solid rgba(99,102,241,0.4)", display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#4B5FD6", display: "inline-block", animation: `dot-blink 1.2s ease-in-out infinite ${delay}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "16px 28px 20px", background: "#060C18" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{
              display: "flex", gap: 10, alignItems: "flex-end",
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${focused ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 14, padding: "12px 14px",
              boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.08)" : "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}>
              <textarea
                ref={textareaRef}
                className="yz-textarea"
                value={input}
                onChange={e => { setInput(e.target.value); autoResizeTextarea(); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
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
                  width: 36, height: 36, borderRadius: 10, border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
                  background: input.trim() && !loading
                    ? "linear-gradient(135deg, #6366F1, #3B82F6)"
                    : "rgba(99,102,241,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.2s",
                  boxShadow: input.trim() && !loading ? "0 0 14px rgba(99,102,241,0.35)" : "none",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke={input.trim() && !loading ? "#fff" : "#4B5FD6"}
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 10 }}>
              {kalanHak !== null && (
                <span style={{ fontSize: 11, color: "#2A3F58" }}>
                  {kalanHak} mesaj hakkı kaldı ·{" "}
                  <a href="/pro" style={{ color: "#6366F1", textDecoration: "none" }}>Pro&apos;ya geç →</a>
                </span>
              )}
              {kalanHak === null && (
                <span style={{ fontSize: 11, color: "#1A2E44" }}>
                  AI analizlerinde hata olabilir — kendi kontrollerinizi yapın
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
