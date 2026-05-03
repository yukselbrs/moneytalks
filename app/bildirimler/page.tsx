"use client";
import { useState, useEffect } from "react";
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
  const [sekme, setSekme] = useState("Tümü");
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [token, setToken] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setToken(session.access_token);
      const res = await fetch("/api/bildirimler", {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setBildirimler(data);
      setYukleniyor(false);
    });
  }, []);

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
    setBildirimler(prev => prev.filter(b => b.id !== id));
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
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC" }}>Bildirimler</h1>
            {okunmamisSayi > 0 && (
              <button onClick={tumunuOku}
                style={{ fontSize: 12, color: "#3B82F6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
                Tümünü okundu işaretle
              </button>
            )}
          </div>
          <p style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>Hesabınızla ilgili bildirimleri görüntüleyin.</p>

          <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(59,130,246,0.08)", overflowX: "auto" }}>
            {SEKMELER.map(s => (
              <button key={s} onClick={() => setSekme(s)}
                style={{ fontSize: 13, fontWeight: 500, padding: "8px 14px", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", color: sekme === s ? "#3B82F6" : "#475569", borderBottom: sekme === s ? "2px solid #3B82F6" : "2px solid transparent", marginBottom: -1, display: "flex", alignItems: "center", gap: 6 }}>
                {s}
                {s === "Okunmamış" && okunmamisSayi > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", background: "rgba(59,130,246,0.1)", borderRadius: 99, padding: "1px 6px" }}>{okunmamisSayi}</span>
                )}
              </button>
            ))}
          </div>

          {yukleniyor ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(59,130,246,0.2)", borderTopColor: "#3B82F6", animation: "spin 0.8s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : filtrelendi.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 0" }}>
              <div style={{ fontSize: 36 }}>🔔</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", margin: 0 }}>Henüz bildirim yok</p>
              <p style={{ fontSize: 13, color: "#475569" }}>Alarm kurduğunuzda bildirimler burada görünecek.</p>
              <button onClick={() => router.push("/alarmlar")} style={{ marginTop: 4, background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Alarm Kur</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtrelendi.map(b => (
                <div key={b.id} onClick={() => tekOku(b.id)}
                  style={{ border: `1px solid ${b.okundu ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.18)"}`, borderRadius: 10, padding: "14px 16px", background: b.okundu ? "rgba(255,255,255,0.01)" : "rgba(59,130,246,0.04)", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start", transition: "all 0.15s" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${TIP_RENK[b.tip] || "#3B82F6"}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {b.ikon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: b.okundu ? 500 : 700, color: b.okundu ? "#94A3B8" : "#F1F5F9", marginBottom: 2 }}>{b.baslik}</p>
                      <span style={{ fontSize: 11, color: "#334155", whiteSpace: "nowrap", flexShrink: 0 }}>{zamanFormat(b.created_at)}</span>
                    </div>
                    {b.aciklama && <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{b.aciklama}</p>}
                    {b.detay && <p style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>{b.detay}</p>}
                  </div>
                  {!b.okundu && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3B82F6", flexShrink: 0, marginTop: 4 }} />}
                  <button onClick={e => { e.stopPropagation(); sil(b.id); }}
                    style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 14, flexShrink: 0, padding: "0 4px" }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
