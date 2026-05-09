"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Table
    if (line.startsWith("|") && lines[i + 1]?.match(/^\|[-| :]+\|$/)) {
      const headers = line.split("|").filter(c => c.trim()).map(c => c.trim());
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].startsWith("|")) {
        rows.push(lines[j].split("|").filter(c => c.trim()).map(c => c.trim()));
        j++;
      }
      out.push(
        <div key={i} style={{ overflowX: "auto", margin: "10px 0" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <thead>
              <tr>{headers.map((h, hi) => <th key={hi} style={{ padding: "7px 12px", borderBottom: "1px solid rgba(99,102,241,0.3)", color: "#A5B4FC", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#94A3B8" }}>{cell}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      );
      i = j;
      continue;
    }
    // HR
    if (line.match(/^--+$/)) { out.push(<hr key={i} style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "10px 0" }} />); i++; continue; }
    // Empty line
    if (!line.trim()) { out.push(<br key={i} />); i++; continue; }
    // Normal line with inline formatting
    out.push(<span key={i} style={{ display: "block" }}>{inlineFormat(line)}</span>);
    i++;
  }
  return out;
}

function inlineFormat(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index} style={{ color: "#C4B5FD", fontWeight: 700 }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index} style={{ color: "#BAE6FD" }}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={m.index} style={{ background: "rgba(99,102,241,0.15)", color: "#A5B4FC", borderRadius: 4, padding: "1px 6px", fontSize: 13, fontFamily: "monospace" }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

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
  { ikon: "📈", metin: "Enflasyona karşı dayanıklı BIST sektörleri hangileri?" },
  { ikon: "📊", metin: "F/K ve PD/DD oranları nasıl yorumlanır?" },
  { ikon: "⚡", metin: "RSI 30'un altına düşen hisse ne anlama gelir?" },
  { ikon: "🎯", metin: "Beta katsayısı yüksek hisseler daha riskli mi?" },
  { ikon: "💎", metin: "Temettü verimi nasıl hesaplanır ve yorumlanır?" },
  { ikon: "🔍", metin: "Hacim anomalisi neden önemlidir?" },
  { ikon: "📉", metin: "52 hafta zirvesine yakın hisse fırsatı mı?" },
  { ikon: "⚖️", metin: "Volatilite risk skoru nasıl hesaplanır?" },
  { ikon: "🏦", metin: "XU100 ile bireysel hisse performansı nasıl karşılaştırılır?" },
  { ikon: "💰", metin: "Piyasa değeri küçük hisseler nasıl değerlendirilir?" },
  { ikon: "🔑", metin: "Risk skoru yüksek hissede nelere dikkat edilmeli?" },
  { ikon: "🧭", metin: "Momentum düşüşü satış sinyali midir?" },
];

const PK_LOGO = (
  <svg width="22" height="22" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pkl" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A78BFA"/>
        <stop offset="100%" stopColor="#60A5FA"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="256" height="256" rx="48" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)" strokeWidth="2"/>
    <rect x="70" y="130" width="18" height="70" rx="3" fill="url(#pkl)"/>
    <rect x="94" y="110" width="18" height="90" rx="3" fill="url(#pkl)"/>
    <path d="M112 110 Q 180 110 180 140 Q 180 170 122 170" fill="none" stroke="url(#pkl)" strokeWidth="18" strokeLinecap="round"/>
    <circle cx="180" cy="92" r="7" fill="#A78BFA"/>
  </svg>
);

const PK_LOGO_LG = (
  <svg width="38" height="38" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pkl2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#C4B5FD"/>
        <stop offset="100%" stopColor="#93C5FD"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="256" height="256" rx="48" fill="transparent"/>
    <rect x="70" y="130" width="18" height="70" rx="3" fill="url(#pkl2)"/>
    <rect x="94" y="110" width="18" height="90" rx="3" fill="url(#pkl2)"/>
    <path d="M112 110 Q 180 110 180 140 Q 180 170 122 170" fill="none" stroke="url(#pkl2)" strokeWidth="18" strokeLinecap="round"/>
    <circle cx="180" cy="92" r="7" fill="#C4B5FD"/>
  </svg>
);

const YETENEKLER = [
  { ikon: "📡", baslik: "Piyasa Analizi", aciklama: "XU100, sektörler, günlük hareketler" },
  { ikon: "🔬", baslik: "Teknik Göstergeler", aciklama: "RSI, beta, volatilite, momentum" },
  { ikon: "🧠", baslik: "Temel Analiz", aciklama: "F/K, PD/DD, piyasa değeri" },
];

const LS_KEY = "pako_sohbetler";
const LS_AKTIF = "pako_aktif_id";

export default function YapayZekaPage() {
  const router = useRouter();
  const [sohbetler, setSohbetler] = useState<Sohbet[]>([]);
  const [aktifId, setAktifId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [kalanHak, setKalanHak] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [hoveredSohbet, setHoveredSohbet] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // localStorage'dan yükle
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setSohbetler(JSON.parse(saved));
      const savedId = localStorage.getItem(LS_AKTIF);
      if (savedId) setAktifId(savedId);
    } catch {}
  }, []);

  // localStorage'a kaydet
  useEffect(() => {
    if (sohbetler.length > 0) localStorage.setItem(LS_KEY, JSON.stringify(sohbetler));
  }, [sohbetler]);

  useEffect(() => {
    if (aktifId) localStorage.setItem(LS_AKTIF, aktifId);
  }, [aktifId]);

  const aktifSohbet = sohbetler.find(s => s.id === aktifId) ?? null;
  const messages = aktifSohbet?.mesajlar ?? [];
  const isEmpty = messages.length === 0;

  // Mesajlar gelince en alta scroll
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  function autoResizeTextarea() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }

  function yeniSohbet() {
    const id = crypto.randomUUID();
    setSohbetler(prev => [{ id, baslik: "Yeni Sohbet", mesajlar: [] }, ...prev]);
    setAktifId(id);
    setInput("");
    setKalanHak(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function sohbetSil(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSohbetler(prev => prev.filter(s => s.id !== id));
    if (aktifId === id) setAktifId(null);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let currentId = aktifId;
    if (!currentId) {
      const id = crypto.randomUUID();
      setSohbetler(prev => [{ id, baslik: text.slice(0, 42), mesajlar: [] }, ...prev]);
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
    <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", background: "#04080F" }}>
      <style>{`
        @keyframes aurora-1 { 0%,100%{transform:translate(-50%,-50%) scale(1) rotate(0deg);opacity:0.5} 50%{transform:translate(-50%,-50%) scale(1.2) rotate(180deg);opacity:0.8} }
        @keyframes aurora-2 { 0%,100%{transform:translate(-50%,-50%) scale(1.1);opacity:0.3} 50%{transform:translate(-50%,-50%) scale(0.9);opacity:0.55} }
        @keyframes ring-pulse { 0%,100%{opacity:0.18;transform:scale(1)} 50%{opacity:0.45;transform:scale(1.08)} }
        @keyframes ring-pulse-2 { 0%,100%{opacity:0.1;transform:scale(1)} 50%{opacity:0.28;transform:scale(1.14)} }
        @keyframes icon-glow { 0%,100%{box-shadow:0 0 24px rgba(99,102,241,0.35),inset 0 1px 0 rgba(255,255,255,0.1)} 50%{box-shadow:0 0 50px rgba(99,102,241,0.55),0 0 100px rgba(139,92,246,0.15),inset 0 1px 0 rgba(255,255,255,0.15)} }
        @keyframes dot-bounce { 0%,80%,100%{transform:scale(0.55);opacity:0.35} 40%{transform:scale(1);opacity:1} }
        @keyframes slide-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
        @keyframes badge-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} 50%{box-shadow:0 0 0 4px rgba(99,102,241,0.12)} }

        .pk-sidebar { width:244px; background:#050A12; border-right:1px solid rgba(255,255,255,0.04); display:flex; flex-direction:column; flex-shrink:0; overflow:hidden; }
        .pk-back { display:flex; align-items:center; gap:7px; background:none; border:none; color:#4A6B8A; cursor:pointer; font-size:12px; font-weight:500; font-family:inherit; padding:8px 10px; border-radius:8px; transition:all 0.15s; }
        .pk-back:hover { color:#60A5FA; background:rgba(59,130,246,0.07); }
        .pk-new { display:flex; align-items:center; gap:8px; border-radius:10px; padding:10px 14px; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit; transition:all 0.2s; border:1px solid rgba(99,102,241,0.3); background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(59,130,246,0.07)); color:#A5B4FC; width:100%; }
        .pk-new:hover { border-color:rgba(99,102,241,0.55); background:linear-gradient(135deg,rgba(99,102,241,0.2),rgba(59,130,246,0.12)); box-shadow:0 0 20px rgba(99,102,241,0.18); color:#C4B5FD; }
        .pk-chat-item { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px; cursor:pointer; transition:all 0.12s; border:none; background:none; width:100%; font-family:inherit; text-align:left; position:relative; }
        .pk-chat-item:hover { background:rgba(255,255,255,0.04); }
        .pk-chat-item.active { background:rgba(99,102,241,0.1); }
        .pk-del-btn { opacity:0; transition:opacity 0.15s; background:none; border:none; cursor:pointer; color:#4A6B8A; padding:3px; border-radius:5px; display:flex; align-items:center; flex-shrink:0; }
        .pk-chat-item:hover .pk-del-btn { opacity:1; }
        .pk-del-btn:hover { color:#EF4444 !important; background:rgba(239,68,68,0.1); }
        .pk-onerilen { display:flex; align-items:flex-start; gap:8px; background:none; border:none; cursor:pointer; color:#4E6A8A; font-size:11.5px; font-weight:500; text-align:left; padding:6px 10px; border-radius:7px; line-height:1.45; width:100%; transition:all 0.12s; font-family:inherit; }
        .pk-onerilen:hover { background:rgba(99,102,241,0.07); color:#8AABB8; }
        .pk-chip { display:flex; align-items:flex-start; gap:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); color:#5E7E9E; font-size:13px; font-weight:500; padding:12px 15px; border-radius:13px; cursor:pointer; transition:all 0.2s; font-family:inherit; text-align:left; line-height:1.45; }
        .pk-chip:hover { background:rgba(99,102,241,0.1); border-color:rgba(99,102,241,0.38); color:#A78BFA; transform:translateY(-2px); box-shadow:0 8px 28px rgba(99,102,241,0.12); }
        .pk-textarea { flex:1; background:none; border:none; outline:none; color:#D1D5DB; font-size:15px; resize:none; line-height:1.6; font-family:inherit; overflow-y:auto; }
        .pk-textarea::placeholder { color:#334F6A; }
        .pk-yetenek { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:14px 16px; display:flex; align-items:flex-start; gap:10px; }
        @media (max-width:767px) { .pk-sidebar { display:none!important; } }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div className="pk-sidebar">
        <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.035)" }}>
          <button className="pk-back" onClick={() => router.back()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Geri Dön
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px 6px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,rgba(99,102,241,0.3),rgba(59,130,246,0.18))", border: "1px solid rgba(99,102,241,0.45)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(99,102,241,0.28)" }}>
              {PK_LOGO}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, background: "linear-gradient(90deg,#A78BFA,#60A5FA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pako AI</p>
              <p style={{ margin: 0, fontSize: 10, color: "#4A6888", letterSpacing: "0.04em" }}>BIST Finans Asistanı</p>
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 14px 8px" }}>
          <button className="pk-new" onClick={yeniSohbet}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Yeni Sohbet
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: 12 }}>
          {sohbetler.length > 0 && (
            <div style={{ padding: "4px 0 6px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#3A5878", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 18px 6px" }}>Geçmiş</p>
              {sohbetler.map(s => (
                <div key={s.id} className={`pk-chat-item ${s.id === aktifId ? "active" : ""}`}
                  onClick={() => setAktifId(s.id)}
                  onMouseEnter={() => setHoveredSohbet(s.id)}
                  onMouseLeave={() => setHoveredSohbet(null)}
                  style={{ margin: "0 4px" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s.id === aktifId ? "#6366F1" : "#3A5878"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 500, color: s.id === aktifId ? "#A5B4FC" : "#5E7E9E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, lineHeight: 1.4 }}>
                    {s.baslik}
                  </span>
                  <button className="pk-del-btn" onClick={e => sohbetSil(s.id, e)} title="Sil"
                    style={{ opacity: hoveredSohbet === s.id ? 1 : 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              ))}
              <div style={{ height: 1, background: "rgba(255,255,255,0.035)", margin: "10px 14px" }} />
            </div>
          )}

          <p style={{ fontSize: 10, fontWeight: 700, color: "#3A5878", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 18px 6px" }}>Önerilen</p>
          {ONERILEN_SORULAR.map((s, i) => (
            <button key={i} className="pk-onerilen" onClick={() => sendMessage(s.metin)}>
              <span style={{ fontSize: 12, flexShrink: 0 }}>{s.ikon}</span>
              <span>{s.metin}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", background: "#04080F" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(99,102,241,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.02) 1px,transparent 1px)", backgroundSize: "52px 52px" }} />

        {isEmpty ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px 24px", gap: 32, position: "relative", zIndex: 1, overflow: "hidden" }}>

            {/* Aurora */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: "40%", left: "50%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 65%)", animation: "aurora-1 12s ease-in-out infinite" }} />
              <div style={{ position: "absolute", top: "44%", left: "46%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.05) 0%,transparent 65%)", animation: "aurora-2 8s ease-in-out infinite 2s" }} />
              <div style={{ position: "absolute", top: "38%", left: "54%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.04) 0%,transparent 65%)", animation: "aurora-1 10s ease-in-out infinite 4s" }} />
            </div>

            {/* Icon + rings */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", animation: "fade-in 0.8s ease" }}>
              <div style={{ position: "absolute", width: 140, height: 140, borderRadius: "50%", border: "1px solid rgba(99,102,241,0.08)", animation: "ring-pulse-2 5s ease-in-out infinite" }} />
              <div style={{ position: "absolute", width: 108, height: 108, borderRadius: "50%", border: "1px solid rgba(99,102,241,0.13)", animation: "ring-pulse 4s ease-in-out infinite 0.6s" }} />
              <div style={{ position: "absolute", width: 80, height: 80, borderRadius: "50%", border: "1px solid rgba(99,102,241,0.2)", animation: "ring-pulse 3s ease-in-out infinite 1.2s" }} />
              <div style={{ width: 60, height: 60, borderRadius: 20, zIndex: 1, position: "relative", background: "linear-gradient(135deg,rgba(99,102,241,0.28),rgba(59,130,246,0.14))", border: "1px solid rgba(99,102,241,0.5)", display: "flex", alignItems: "center", justifyContent: "center", animation: "icon-glow 3.5s ease-in-out infinite" }}>
                {PK_LOGO_LG}
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: "center", animation: "slide-up 0.6s ease 0.1s both" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "5px 14px", borderRadius: 20, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", animation: "badge-pulse 3s ease-in-out infinite" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818CF8", boxShadow: "0 0 8px rgba(99,102,241,0.9)", display: "inline-block" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6366F1", letterSpacing: "0.12em" }}>ÇEVRİMİÇİ</span>
              </div>
              <h1 style={{
                margin: "0 0 14px", fontSize: 46, fontWeight: 800, letterSpacing: "-2px",
                fontFamily: "var(--font-manrope, sans-serif)",
                background: "linear-gradient(135deg,#E9E4FF 0%,#A78BFA 40%,#60A5FA 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.05,
              }}>
                Pako AI
              </h1>
              <p style={{ color: "#5A7A9E", fontSize: 15, margin: 0, lineHeight: 1.7, maxWidth: 420 }}>
                BIST piyasası hakkında her şeyi sorun — hisseler, sektörler, teknik analiz
              </p>
            </div>

            {/* Chips */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 580, animation: "slide-up 0.6s ease 0.2s both" }}>
              {ONERILEN_SORULAR.slice(0, 4).map((s, i) => (
                <button key={i} className="pk-chip" onClick={() => sendMessage(s.metin)}>
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{s.ikon}</span>
                  <span>{s.metin}</span>
                </button>
              ))}
            </div>

            {/* Yetenekler */}
            <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 580, animation: "slide-up 0.6s ease 0.35s both" }}>
              {YETENEKLER.map((y, i) => (
                <div key={i} className="pk-yetenek" style={{ flex: 1 }}>
                  <span style={{ fontSize: 16 }}>{y.ikon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#6B84A0", marginBottom: 2 }}>{y.baslik}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#435E7A", lineHeight: 1.4 }}>{y.aciklama}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div ref={messagesContainerRef} style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1 }}>
            <div style={{ maxWidth: 700, width: "100%", margin: "0 auto", padding: "28px 28px 8px", display: "flex", flexDirection: "column", gap: 20 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "slide-up 0.2s ease" }}>
                    {msg.role === "assistant" && (
                      <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 2, background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(59,130,246,0.12))", border: "1px solid rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(99,102,241,0.2)" }}>
                        {PK_LOGO}
                      </div>
                    )}
                    <div style={{
                      maxWidth: "78%", padding: msg.role === "user" ? "10px 16px" : "13px 16px",
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                      background: msg.role === "user" ? "linear-gradient(135deg,rgba(99,102,241,0.22),rgba(59,130,246,0.16))" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${msg.role === "user" ? "rgba(99,102,241,0.38)" : "rgba(255,255,255,0.05)"}`,
                      borderLeft: msg.role === "assistant" ? "2px solid rgba(99,102,241,0.45)" : undefined,
                      color: msg.role === "user" ? "#DDD6FE" : "#94A3B8",
                      fontSize: 14, lineHeight: 1.75,
                    }}>
                      {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: "flex", gap: 12, animation: "slide-up 0.2s ease" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(59,130,246,0.12))", border: "1px solid rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(99,102,241,0.2)" }}>
                      {PK_LOGO}
                    </div>
                    <div style={{ padding: "14px 18px", borderRadius: "4px 16px 16px 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", borderLeft: "2px solid rgba(99,102,241,0.45)", display: "flex", gap: 6, alignItems: "center" }}>
                      {[0, 0.18, 0.36].map((delay, k) => (
                        <span key={k} style={{ width: 7, height: 7, borderRadius: "50%", background: "#5B6EE8", display: "inline-block", animation: `dot-bounce 1.4s ease-in-out infinite ${delay}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* ── INPUT ── */}
        <div style={{ padding: "14px 28px 20px", position: "relative", zIndex: 1 }}>
          <div style={{ position: "absolute", top: 0, left: 28, right: 28, height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.18),rgba(59,130,246,0.12),transparent)" }} />
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "rgba(255,255,255,0.02)", border: `1px solid ${focused ? "rgba(99,102,241,0.48)" : "rgba(255,255,255,0.055)"}`, borderRadius: 16, padding: "13px 14px", boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.07),0 0 32px rgba(99,102,241,0.08)" : "none", transition: "border-color 0.2s,box-shadow 0.25s" }}>
              <textarea ref={textareaRef} className="pk-textarea" value={input}
                onChange={e => { setInput(e.target.value); autoResizeTextarea(); }}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Borsayla ilgili neyi merak ediyorsun?" rows={1}
              />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                style={{ width: 38, height: 38, borderRadius: 10, border: "none", cursor: input.trim() && !loading ? "pointer" : "default", background: input.trim() && !loading ? "linear-gradient(135deg,#6366F1,#3B82F6)" : "rgba(99,102,241,0.09)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s", boxShadow: input.trim() && !loading ? "0 0 20px rgba(99,102,241,0.4)" : "none" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? "#fff" : "#4A6888"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 9 }}>
              {kalanHak !== null
                ? <span style={{ fontSize: 11, color: "#4A6888" }}>{kalanHak} mesaj hakkı kaldı · <a href="/pro" style={{ color: "#818CF8", textDecoration: "none" }}>Pro&apos;ya geç →</a></span>
                : <span style={{ fontSize: 11, color: "#2E4A64" }}>AI analizlerinde hata olabilir — kendi kontrollerinizi yapın</span>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
