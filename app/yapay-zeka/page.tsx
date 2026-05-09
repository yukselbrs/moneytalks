"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Sohbet {
  id: string;
  baslik: string;
  mesajlar: Message[];
}

const ONERILEN_SORULAR = [
  { ikon: "📈", metin: "Enflasyona karşı dayanıklı BIST sektörleri" },
  { ikon: "📊", metin: "F/K ve PD/DD oranları nasıl yorumlanır?" },
  { ikon: "⚡", metin: "RSI göstergesi ne anlama gelir?" },
  { ikon: "🔵", metin: "Beta katsayısı ve portföy yönetimi" },
  { ikon: "💎", metin: "Temettü yatırımı stratejisi" },
  { ikon: "🔍", metin: "Hisse senedi likidite riski" },
];

export default function YapayZekaPage() {
  const router = useRouter();
  const [sohbetler, setSohbetler] = useState<Sohbet[]>([]);
  const [aktifId, setAktifId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [kalanHak, setKalanHak] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const aktifSohbet = sohbetler.find(s => s.id === aktifId) ?? null;
  const messages = aktifSohbet?.mesajlar ?? [];
  const isEmpty = messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function autoResizeTextarea() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }

  function yeniSohbet() {
    const id = crypto.randomUUID();
    const sohbet: Sohbet = { id, baslik: "Yeni Sohbet", mesajlar: [] };
    setSohbetler(prev => [sohbet, ...prev]);
    setAktifId(id);
    setInput("");
    setKalanHak(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let currentId = aktifId;
    if (!currentId) {
      const id = crypto.randomUUID();
      const sohbet: Sohbet = { id, baslik: text.slice(0, 40), mesajlar: [] };
      setSohbetler(prev => [sohbet, ...prev]);
      setAktifId(id);
      currentId = id;
    }

    const newMessages: Message[] = [...messages, { role: "user", content: text }];

    setSohbetler(prev => prev.map(s => s.id === currentId
      ? { ...s, baslik: s.baslik === "Yeni Sohbet" ? text.slice(0, 42) : s.baslik, mesajlar: newMessages }
      : s
    ));
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      const reply = data.error === "gunluk_limit" ? data.mesaj : (data.reply ?? "Bir hata oluştu.");
      setSohbetler(prev => prev.map(s => s.id === currentId
        ? { ...s, mesajlar: [...s.mesajlar, { role: "assistant", content: reply }] }
        : s
      ));
      if (data.kalanHak !== undefined) setKalanHak(data.kalanHak);
    } catch {
      setSohbetler(prev => prev.map(s => s.id === currentId
        ? { ...s, mesajlar: [...s.mesajlar, { role: "assistant", content: "Bir hata oluştu. Lütfen tekrar deneyin." }] }
        : s
      ));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 53px)", overflow: "hidden", background: "#04080F", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <style>{`
        @keyframes aurora-1 { 0%,100%{transform:translate(-50%,-50%) scale(1) rotate(0deg);opacity:0.4} 50%{transform:translate(-50%,-50%) scale(1.15) rotate(180deg);opacity:0.7} }
        @keyframes aurora-2 { 0%,100%{transform:translate(-50%,-50%) scale(1.1) rotate(0deg);opacity:0.3} 50%{transform:translate(-50%,-50%) scale(0.9) rotate(-120deg);opacity:0.5} }
        @keyframes ring-1 { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.07)} }
        @keyframes ring-2 { 0%,100%{opacity:0.1;transform:scale(1)} 50%{opacity:0.3;transform:scale(1.12)} }
        @keyframes dot-bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes slide-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
        @keyframes icon-glow { 0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.3),inset 0 1px 0 rgba(255,255,255,0.08)} 50%{box-shadow:0 0 40px rgba(99,102,241,0.5),0 0 80px rgba(59,130,246,0.15),inset 0 1px 0 rgba(255,255,255,0.12)} }
        @keyframes border-spin { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

        .pk-sidebar { width:240px; background:#06090F; border-right:1px solid rgba(255,255,255,0.045); display:flex; flex-direction:column; flex-shrink:0; overflow:hidden; }
        .pk-back-btn { display:flex; align-items:center; gap:8px; background:none; border:none; color:#2A3F58; cursor:pointer; font-size:12px; font-weight:500; font-family:inherit; padding:8px 10px; border-radius:8px; transition:all 0.15s; width:100%; }
        .pk-back-btn:hover { color:#60A5FA; background:rgba(59,130,246,0.06); }
        .pk-new-btn { display:flex; align-items:center; gap:8px; margin:0 12px 12px; border-radius:10px; padding:10px 13px; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit; transition:all 0.2s; position:relative; overflow:hidden; border:1px solid rgba(99,102,241,0.35); background:linear-gradient(135deg,rgba(99,102,241,0.14),rgba(59,130,246,0.08)); color:#A78BFA; }
        .pk-new-btn:hover { border-color:rgba(99,102,241,0.6); background:linear-gradient(135deg,rgba(99,102,241,0.22),rgba(59,130,246,0.14)); box-shadow:0 0 20px rgba(99,102,241,0.2); color:#C4B5FD; }
        .pk-sohbet-item { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; cursor:pointer; transition:all 0.12s; border:none; background:none; width:calc(100% - 24px); margin:0 12px; font-family:inherit; text-align:left; }
        .pk-sohbet-item:hover { background:rgba(255,255,255,0.04); }
        .pk-sohbet-item.active { background:rgba(99,102,241,0.1); border:none; }
        .pk-onerilen-btn { display:flex; align-items:flex-start; gap:8px; background:none; border:none; cursor:pointer; color:#2E4560; font-size:12px; font-weight:500; text-align:left; padding:7px 12px; border-radius:8px; line-height:1.45; width:100%; transition:all 0.12s; font-family:inherit; }
        .pk-onerilen-btn:hover { background:rgba(99,102,241,0.07); color:#6B83A0; }
        .pk-chip { display:flex; align-items:flex-start; gap:9px; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06); color:#3D5A7A; font-size:13px; font-weight:500; padding:11px 15px; border-radius:12px; cursor:pointer; transition:all 0.2s; font-family:inherit; text-align:left; line-height:1.45; }
        .pk-chip:hover { background:rgba(99,102,241,0.1); border-color:rgba(99,102,241,0.4); color:#A78BFA; transform:translateY(-2px); box-shadow:0 8px 24px rgba(99,102,241,0.12); }
        .pk-textarea { flex:1; background:none; border:none; outline:none; color:#E2E8F0; font-size:15px; resize:none; line-height:1.6; font-family:inherit; overflow-y:auto; }
        .pk-textarea::placeholder { color:#1E3048; }
        @media (max-width:767px) { .pk-sidebar { display:none!important; } }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div className="pk-sidebar">
        {/* Header */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <button className="pk-back-btn" onClick={() => router.back()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Geri Dön
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 6px 6px" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,rgba(99,102,241,0.35),rgba(59,130,246,0.2))", border: "1px solid rgba(99,102,241,0.5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(99,102,241,0.3)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, background: "linear-gradient(90deg,#A78BFA,#60A5FA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pako AI</p>
              <p style={{ margin: 0, fontSize: 10, color: "#1E3048", letterSpacing: "0.05em" }}>BIST Finans Asistanı</p>
            </div>
          </div>
        </div>

        {/* New Chat */}
        <div style={{ padding: "12px 0 8px" }}>
          <button className="pk-new-btn" onClick={yeniSohbet}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Yeni Sohbet
          </button>
        </div>

        {/* Chat History */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, paddingBottom: 12 }}>
          {sohbetler.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#152030", letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 18px 6px" }}>Geçmiş</p>
              {sohbetler.map(s => (
                <button key={s.id} className={`pk-sohbet-item ${s.id === aktifId ? "active" : ""}`} onClick={() => setAktifId(s.id)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={s.id === aktifId ? "#6366F1" : "#1E3048"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 500, color: s.id === aktifId ? "#8B9CF4" : "#2A3F58", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>
                    {s.baslik}
                  </span>
                </button>
              ))}
              <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "10px 12px" }} />
            </>
          )}

          <p style={{ fontSize: 10, fontWeight: 700, color: "#152030", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 18px 6px" }}>Önerilen</p>
          {ONERILEN_SORULAR.map((s, i) => (
            <button key={i} className="pk-onerilen-btn" onClick={() => sendMessage(s.metin)}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 0 }}>{s.ikon}</span>
              <span>{s.metin}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

        {/* Cyber grid bg */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(99,102,241,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.025) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

        {isEmpty ? (
          /* ── EMPTY STATE ── */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px 64px", gap: 40, position: "relative", zIndex: 1, overflow: "hidden" }}>

            {/* Aurora */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: "38%", left: "50%", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 65%)", animation: "aurora-1 10s ease-in-out infinite", transformOrigin: "center" }} />
              <div style={{ position: "absolute", top: "42%", left: "45%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.05) 0%,transparent 65%)", animation: "aurora-2 7s ease-in-out infinite 1.5s", transformOrigin: "center" }} />
              <div style={{ position: "absolute", top: "36%", left: "55%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.04) 0%,transparent 65%)", animation: "aurora-1 9s ease-in-out infinite 3s", transformOrigin: "center" }} />
            </div>

            {/* Icon orb */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", animation: "fade-in 0.8s ease" }}>
              <div style={{ position: "absolute", width: 130, height: 130, borderRadius: "50%", border: "1px solid rgba(99,102,241,0.1)", animation: "ring-2 4s ease-in-out infinite" }} />
              <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", border: "1px solid rgba(99,102,241,0.15)", animation: "ring-1 3s ease-in-out infinite 0.5s" }} />
              <div style={{ position: "absolute", width: 75, height: 75, borderRadius: "50%", border: "1px solid rgba(99,102,241,0.2)", animation: "ring-1 2.5s ease-in-out infinite 1s" }} />
              <div style={{
                width: 58, height: 58, borderRadius: 20, zIndex: 1, position: "relative",
                background: "linear-gradient(135deg,rgba(99,102,241,0.3),rgba(59,130,246,0.15))",
                border: "1px solid rgba(99,102,241,0.55)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "icon-glow 3s ease-in-out infinite",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: "center", animation: "slide-up 0.6s ease 0.1s both" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "4px 12px", borderRadius: 20, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366F1", boxShadow: "0 0 8px rgba(99,102,241,0.8)", display: "inline-block", animation: "ring-1 2s ease-in-out infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6366F1", letterSpacing: "0.08em" }}>ÇEVRIMIÇI</span>
              </div>
              <h1 style={{ margin: "0 0 12px", fontSize: 36, fontWeight: 800, letterSpacing: "-0.8px", background: "linear-gradient(135deg,#C4B5FD 0%,#818CF8 40%,#60A5FA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1 }}>
                Pako AI
              </h1>
              <p style={{ color: "#2A3F58", fontSize: 15, margin: 0, lineHeight: 1.65, maxWidth: 400 }}>
                BIST piyasası hakkında her şeyi sorun — hisseler, sektörler, teknik analiz
              </p>
            </div>

            {/* Chips grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 580, animation: "slide-up 0.6s ease 0.25s both" }}>
              {ONERILEN_SORULAR.slice(0, 4).map((s, i) => (
                <button key={i} className="pk-chip" onClick={() => sendMessage(s.metin)}>
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{s.ikon}</span>
                  <span>{s.metin}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── MESSAGES ── */
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 0 8px", position: "relative", zIndex: 1 }}>
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 28px", display: "flex", flexDirection: "column", gap: 24 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: 12, justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "slide-up 0.2s ease" }}>
                  {msg.role === "assistant" && (
                    <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 2, background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(59,130,246,0.12))", border: "1px solid rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(99,102,241,0.2)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                      </svg>
                    </div>
                  )}
                  <div style={{
                    maxWidth: "78%", padding: msg.role === "user" ? "10px 16px" : "13px 16px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                    background: msg.role === "user" ? "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(59,130,246,0.18))" : "rgba(255,255,255,0.025)",
                    border: `1px solid ${msg.role === "user" ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.055)"}`,
                    borderLeft: msg.role === "assistant" ? "2px solid rgba(99,102,241,0.5)" : undefined,
                    color: msg.role === "user" ? "#C4B5FD" : "#8099B8",
                    fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", gap: 12, animation: "slide-up 0.2s ease" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(59,130,246,0.12))", border: "1px solid rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(99,102,241,0.2)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                    </svg>
                  </div>
                  <div style={{ padding: "14px 18px", borderRadius: "4px 16px 16px 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)", borderLeft: "2px solid rgba(99,102,241,0.5)", display: "flex", gap: 6, alignItems: "center" }}>
                    {[0, 0.18, 0.36].map((delay, i) => (
                      <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#5B6EE8", display: "inline-block", animation: `dot-bounce 1.4s ease-in-out infinite ${delay}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* ── INPUT ── */}
        <div style={{ padding: "16px 28px 22px", position: "relative", zIndex: 1 }}>
          {/* Üst çizgi gradient */}
          <div style={{ position: "absolute", top: 0, left: 28, right: 28, height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.2),rgba(59,130,246,0.15),transparent)" }} />

          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{
              display: "flex", gap: 10, alignItems: "flex-end",
              background: "rgba(255,255,255,0.025)",
              border: `1px solid ${focused ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 16, padding: "13px 14px",
              boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.08), 0 0 30px rgba(99,102,241,0.1)" : "none",
              transition: "border-color 0.2s, box-shadow 0.25s",
            }}>
              <textarea
                ref={textareaRef}
                className="pk-textarea"
                value={input}
                onChange={e => { setInput(e.target.value); autoResizeTextarea(); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Borsayla ilgili neyi merak ediyorsun?"
                rows={1}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  width: 38, height: 38, borderRadius: 10, border: "none",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  background: input.trim() && !loading ? "linear-gradient(135deg,#6366F1,#3B82F6)" : "rgba(99,102,241,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  transition: "all 0.2s",
                  boxShadow: input.trim() && !loading ? "0 0 18px rgba(99,102,241,0.45)" : "none",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? "#fff" : "#3D5580"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 10 }}>
              {kalanHak !== null
                ? <span style={{ fontSize: 11, color: "#1E3048" }}>{kalanHak} mesaj hakkı kaldı · <a href="/pro" style={{ color: "#6366F1", textDecoration: "none" }}>Pro&apos;ya geç →</a></span>
                : <span style={{ fontSize: 11, color: "#162030" }}>AI analizlerinde hata olabilir — kendi kontrollerinizi yapın</span>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
