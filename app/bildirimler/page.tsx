"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/components/lib/supabase";

interface Bildirim {
  id: string;
  baslik: string;
  aciklama: string;
  detay: string;
  tip: string;
  ikon: string;
  okundu: boolean;
  created_at: string;
}

const SEKMELER = ["Tümü", "Okunmamış", "Uyarılar", "Haberler", "Sistem"];

const TIP_RENK: Record<string, string> = {
  uyari: "#EF4444", bildirim: "#3B82F6", portfoy: "#10B981",
  analiz: "#8B5CF6", sistem: "#F59E0B", haber: "#F97316",
};

function zamanFormat(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const fark = now.getTime() - date.getTime();
  const gun = Math.floor(fark / 86400000);
  if (gun === 0) return `Bugün ${date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  if (gun === 1) return `Dün ${date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  if (gun < 7) return `${gun} gün önce`;
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

export default function BildirimlerPage() {
  const router = useRouter();
  const [sekme, setSekme] = useState("Tümü");
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [token, setToken] = useState("");
  const [silinen, setSilinen] = useState<Set<string>>(new Set());
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setToken(session.access_token);
      const res = await fetch("/api/bildirimler", {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setBildirimler(data);
      setYukleniyor(false);
    });
  }, []);

  useEffect(() => {
    const el = tabRefs.current[sekme];
    if (el) {
      const parent = el.parentElement;
      const parentRect = parent?.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setIndicator({
        left: rect.left - (parentRect?.left ?? 0),
        width: rect.width,
      });
    }
  }, [sekme, bildirimler]);

  async function tekOku(id: string) {
    setBildirimler(prev => prev.map(b => b.id === id ? { ...b, okundu: true } : b));
    await fetch("/api/bildirimler", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
  }

  async function tumunuOku() {
    setBildirimler(prev => prev.map(b => ({ ...b, okundu: true })));
    await fetch("/api/bildirimler", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ tumunu: true }),
    });
  }

  async function sil(id: string) {
    setSilinen(prev => new Set(prev).add(id));
    setTimeout(() => {
      setBildirimler(prev => prev.filter(b => b.id !== id));
      setSilinen(prev => { const next = new Set(prev); next.delete(id); return next; });
    }, 280);
    await fetch("/api/bildirimler", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
  }

  const filtrelendi = bildirimler.filter(b => {
    if (sekme === "Okunmamış") return !b.okundu;
    if (sekme === "Uyarılar") return b.tip === "uyari";
    if (sekme === "Haberler") return b.tip === "haber";
    if (sekme === "Sistem") return b.tip === "sistem";
    return true;
  });

  const okunmamisSayi = bildirimler.filter(b => !b.okundu).length;

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className="hero-bell">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {okunmamisSayi > 0 && <span className="hero-bell-dot" />}
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.5px", margin: 0, background: "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Bildirimler
              </h1>
            </div>
            {okunmamisSayi > 0 && (
              <button onClick={tumunuOku} className="mark-all-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Tümünü okundu işaretle</span>
              </button>
            )}
          </div>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 28, marginLeft: 50 }}>
            Hesabınızla ilgili bildirimleri görüntüleyin.
          </p>

          {/* Tabs */}
          <div style={{ position: "relative", display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid rgba(59,130,246,0.10)", overflowX: "auto" }}>
            {SEKMELER.map(s => (
              <button
                key={s}
                ref={el => { tabRefs.current[s] = el; }}
                onClick={() => setSekme(s)}
                className="tab-btn"
                style={{ color: sekme === s ? "#60A5FA" : "#64748B" }}
              >
                {s}
                {s === "Okunmamış" && okunmamisSayi > 0 && (
                  <span className="tab-badge">{okunmamisSayi}</span>
                )}
              </button>
            ))}
            <span
              className="tab-indicator"
              style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
            />
          </div>

          {/* Content */}
          {yukleniyor ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "64px 0", gap: 12 }}>
              <div className="loader-orb" />
              <span style={{ fontSize: 13, color: "#64748B" }}>Bildirimler yükleniyor…</span>
            </div>
          ) : filtrelendi.length === 0 ? (
            <div className="empty-wrap">
              <div className="empty-bell-stage">
                <span className="empty-ring empty-ring-1" />
                <span className="empty-ring empty-ring-2" />
                <span className="empty-ring empty-ring-3" />
                <div className="empty-bell">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </div>
                <span className="sparkle sparkle-1" />
                <span className="sparkle sparkle-2" />
                <span className="sparkle sparkle-3" />
                <span className="sparkle sparkle-4" />
              </div>
              <p className="empty-title">Henüz bildirim yok</p>
              <p className="empty-desc">Alarm kurduğunuzda bildirimler burada görünecek.</p>
              <button onClick={() => router.push("/alarmlar")} className="empty-cta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l2 2" />
                  <path d="M5 3 2 6" />
                  <path d="m22 6-3-3" />
                </svg>
                Alarm Kur
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtrelendi.map((b, i) => {
                const renk = TIP_RENK[b.tip] || "#3B82F6";
                const isLeaving = silinen.has(b.id);
                return (
                  <div
                    key={b.id}
                    onClick={() => tekOku(b.id)}
                    className={`bildirim-card ${b.okundu ? "okundu" : "okunmamis"} ${isLeaving ? "leaving" : ""}`}
                    style={{
                      // @ts-expect-error - CSS custom prop
                      "--card-color": renk,
                      "--card-color-bg": `${renk}1A`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  >
                    <div className="bildirim-icon">
                      <span style={{ fontSize: 18, position: "relative", zIndex: 1 }}>{b.ikon}</span>
                      {!b.okundu && <span className="bildirim-icon-glow" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <p className="bildirim-baslik">{b.baslik}</p>
                        <span className="bildirim-zaman">{zamanFormat(b.created_at)}</span>
                      </div>
                      {b.aciklama && <p className="bildirim-aciklama">{b.aciklama}</p>}
                      {b.detay && <p className="bildirim-detay">{b.detay}</p>}
                    </div>
                    {!b.okundu && <span className="unread-pulse" />}
                    <button
                      onClick={e => { e.stopPropagation(); sil(b.id); }}
                      className="sil-btn"
                      aria-label="Sil"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <style jsx>{`
          .hero-bell {
            position: relative;
            width: 36px; height: 36px;
            border-radius: 10px;
            background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.18));
            border: 1px solid rgba(59,130,246,0.28);
            display: flex; align-items: center; justify-content: center;
            color: #93C5FD;
            box-shadow: 0 8px 24px -8px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
            animation: bellSway 4s ease-in-out infinite;
            transform-origin: 50% 20%;
          }
          @keyframes bellSway {
            0%, 92%, 100% { transform: rotate(0); }
            94% { transform: rotate(-8deg); }
            96% { transform: rotate(8deg); }
            98% { transform: rotate(-4deg); }
          }
          .hero-bell-dot {
            position: absolute; top: 4px; right: 4px;
            width: 8px; height: 8px;
            border-radius: 50%;
            background: #EF4444;
            box-shadow: 0 0 0 2px #0B1220, 0 0 10px #EF4444;
            animation: pulseDot 1.8s ease-in-out infinite;
          }
          @keyframes pulseDot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.25); opacity: 0.7; }
          }

          .mark-all-btn {
            display: inline-flex; align-items: center; gap: 7px;
            font-size: 12px; font-weight: 600;
            color: #93C5FD;
            background: linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08));
            border: 1px solid rgba(59,130,246,0.25);
            border-radius: 8px;
            padding: 8px 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            backdrop-filter: blur(8px);
          }
          .mark-all-btn:hover {
            color: #DBEAFE;
            background: linear-gradient(135deg, rgba(59,130,246,0.22), rgba(139,92,246,0.18));
            border-color: rgba(96,165,250,0.45);
            transform: translateY(-1px);
            box-shadow: 0 8px 24px -10px rgba(59,130,246,0.5);
          }

          .tab-btn {
            position: relative;
            font-size: 13px; font-weight: 600;
            padding: 10px 16px;
            background: none; border: none;
            cursor: pointer; white-space: nowrap;
            transition: color 0.2s ease;
            display: flex; align-items: center; gap: 6px;
            z-index: 1;
          }
          .tab-btn:hover { color: #93C5FD !important; }
          .tab-indicator {
            position: absolute;
            bottom: -1px; left: 0;
            height: 2px;
            background: linear-gradient(90deg, #3B82F6, #8B5CF6);
            border-radius: 2px;
            transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), width 0.32s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 0 12px rgba(59,130,246,0.6);
            pointer-events: none;
          }
          .tab-badge {
            font-size: 11px; font-weight: 700;
            color: #DBEAFE;
            background: linear-gradient(135deg, #3B82F6, #6366F1);
            border-radius: 99px;
            padding: 2px 7px;
            box-shadow: 0 2px 8px rgba(59,130,246,0.4);
          }

          .loader-orb {
            width: 28px; height: 28px;
            border-radius: 50%;
            background: conic-gradient(from 0deg, transparent, #3B82F6);
            mask: radial-gradient(circle, transparent 9px, #000 10px);
            -webkit-mask: radial-gradient(circle, transparent 9px, #000 10px);
            animation: spin 0.9s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }

          .empty-wrap {
            display: flex; flex-direction: column; align-items: center;
            padding: 56px 0 32px;
            animation: fadeUp 0.5s ease;
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .empty-bell-stage {
            position: relative;
            width: 140px; height: 140px;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 14px;
          }
          .empty-bell {
            position: relative; z-index: 2;
            width: 78px; height: 78px;
            border-radius: 22px;
            background: linear-gradient(135deg, rgba(59,130,246,0.22), rgba(139,92,246,0.22));
            border: 1px solid rgba(96,165,250,0.35);
            display: flex; align-items: center; justify-content: center;
            color: #93C5FD;
            box-shadow:
              0 20px 50px -15px rgba(59,130,246,0.6),
              inset 0 1px 0 rgba(255,255,255,0.1);
            animation: bellFloat 4.5s ease-in-out infinite;
          }
          @keyframes bellFloat {
            0%, 100% { transform: translateY(0) rotate(0); }
            25% { transform: translateY(-6px) rotate(-3deg); }
            75% { transform: translateY(-3px) rotate(3deg); }
          }
          .empty-ring {
            position: absolute;
            border-radius: 50%;
            border: 1.5px solid rgba(96,165,250,0.4);
            width: 90px; height: 90px;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            animation: ringExpand 3s ease-out infinite;
            opacity: 0;
          }
          .empty-ring-2 { animation-delay: 1s; }
          .empty-ring-3 { animation-delay: 2s; }
          @keyframes ringExpand {
            0% { width: 80px; height: 80px; opacity: 0.8; border-color: rgba(96,165,250,0.5); }
            100% { width: 200px; height: 200px; opacity: 0; border-color: rgba(96,165,250,0); }
          }
          .sparkle {
            position: absolute;
            width: 4px; height: 4px;
            background: #93C5FD;
            border-radius: 50%;
            box-shadow: 0 0 8px #93C5FD;
            animation: sparkle 2.8s ease-in-out infinite;
          }
          .sparkle-1 { top: 12%; left: 18%; animation-delay: 0s; }
          .sparkle-2 { top: 18%; right: 14%; animation-delay: 0.7s; }
          .sparkle-3 { bottom: 18%; left: 16%; animation-delay: 1.4s; }
          .sparkle-4 { bottom: 14%; right: 18%; animation-delay: 2.1s; }
          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1.4); }
          }
          .empty-title {
            font-size: 16px; font-weight: 700;
            color: #F1F5F9;
            margin: 0 0 6px;
            letter-spacing: -0.3px;
          }
          .empty-desc {
            font-size: 13px;
            color: #64748B;
            margin: 0 0 20px;
          }
          .empty-cta {
            display: inline-flex; align-items: center; gap: 8px;
            background: linear-gradient(135deg, #3B82F6, #6366F1);
            color: #fff;
            border: none;
            border-radius: 10px;
            padding: 11px 24px;
            font-size: 13px; font-weight: 700;
            cursor: pointer;
            box-shadow: 0 10px 30px -10px rgba(59,130,246,0.6), inset 0 1px 0 rgba(255,255,255,0.15);
            transition: transform 0.18s ease, box-shadow 0.18s ease;
          }
          .empty-cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 14px 36px -10px rgba(59,130,246,0.75), inset 0 1px 0 rgba(255,255,255,0.2);
          }
          .empty-cta:active { transform: translateY(0); }

          .bildirim-card {
            position: relative;
            display: flex; gap: 12px; align-items: flex-start;
            border-radius: 12px;
            padding: 14px 16px;
            cursor: pointer;
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, opacity 0.28s ease;
            backdrop-filter: blur(8px);
            animation: cardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
          }
          @keyframes cardIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .bildirim-card.okundu {
            background: rgba(255,255,255,0.015);
            border: 1px solid rgba(59,130,246,0.06);
          }
          .bildirim-card.okunmamis {
            background: linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.03));
            border: 1px solid rgba(59,130,246,0.22);
            box-shadow: 0 0 0 1px rgba(59,130,246,0.04) inset;
          }
          .bildirim-card:hover {
            transform: translateX(2px);
            border-color: rgba(96,165,250,0.4);
            box-shadow: 0 10px 30px -14px rgba(59,130,246,0.4);
          }
          .bildirim-card.leaving {
            opacity: 0;
            transform: translateX(40px);
            pointer-events: none;
          }
          .bildirim-icon {
            position: relative;
            width: 40px; height: 40px;
            border-radius: 10px;
            background: var(--card-color-bg);
            border: 1px solid color-mix(in srgb, var(--card-color) 25%, transparent);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
            overflow: hidden;
          }
          .bildirim-icon-glow {
            position: absolute; inset: -8px;
            background: radial-gradient(circle, var(--card-color) 0%, transparent 60%);
            opacity: 0.35;
            animation: iconPulse 2.4s ease-in-out infinite;
          }
          @keyframes iconPulse {
            0%, 100% { opacity: 0.25; }
            50% { opacity: 0.55; }
          }
          .bildirim-baslik {
            font-size: 13px;
            font-weight: 700;
            color: #F1F5F9;
            margin: 0 0 3px;
          }
          .bildirim-card.okundu .bildirim-baslik {
            font-weight: 500;
            color: #94A3B8;
          }
          .bildirim-zaman {
            font-size: 11px; color: #475569;
            white-space: nowrap; flex-shrink: 0;
          }
          .bildirim-aciklama {
            font-size: 12px; color: #64748B; line-height: 1.5;
            margin: 0;
          }
          .bildirim-detay {
            font-size: 11px; color: #475569; margin: 4px 0 0;
          }
          .unread-pulse {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: var(--card-color);
            flex-shrink: 0; margin-top: 6px;
            box-shadow: 0 0 0 0 var(--card-color);
            animation: unreadPulse 1.8s ease-in-out infinite;
          }
          @keyframes unreadPulse {
            0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--card-color) 50%, transparent); }
            70% { box-shadow: 0 0 0 8px transparent; }
            100% { box-shadow: 0 0 0 0 transparent; }
          }
          .sil-btn {
            background: none;
            border: 1px solid transparent;
            color: #475569;
            cursor: pointer;
            flex-shrink: 0;
            padding: 5px;
            border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            opacity: 0;
            transition: all 0.18s ease;
          }
          .bildirim-card:hover .sil-btn {
            opacity: 1;
          }
          .sil-btn:hover {
            color: #F87171;
            background: rgba(239,68,68,0.1);
            border-color: rgba(239,68,68,0.2);
          }
        `}</style>
      </div>
    </AppShell>
  );
}
