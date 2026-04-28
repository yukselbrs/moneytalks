"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/components/lib/supabase";
import { useRouter } from "next/navigation";

const SORULAR = [
  {
    key: "vade",
    soru: "Yatırım vadeniz ne kadar?",
    secenekler: ["Kısa vadeli (0-6 ay)", "Orta vadeli (6ay-2yıl)", "Uzun vadeli (2yıl+)"],
  },
  {
    key: "risk_toleransi",
    soru: "Risk toleransınız nasıl?",
    secenekler: ["Düşük — sermayemi korumak isterim", "Orta — makul risk alabilirim", "Yüksek — agresif büyüme isterim"],
  },
  {
    key: "sermaye",
    soru: "Yatırım sermayeniz?",
    secenekler: ["10.000 ₺ altı", "10.000 – 100.000 ₺", "100.000 ₺ üzeri"],
  },
  {
    key: "sektor",
    soru: "Sektör tercihiniz?",
    secenekler: ["Bankacılık & Finans", "Sanayi & Enerji", "Teknoloji & Savunma", "Tüketim & Perakende", "Farketmez"],
  },
  {
    key: "deneyim",
    soru: "Borsa deneyiminiz?",
    secenekler: ["Yeni başlıyorum", "1-3 yıl deneyimim var", "3 yıl+ deneyimim var"],
  },
];

interface OneriHisse { ticker: string; neden: string; }
interface Oneri { profil: string; hisseler: OneriHisse[]; }

export default function RiskProfilWidget() {
  const router = useRouter();
  const [adim, setAdim] = useState(0);
  const [cevaplar, setCevaplar] = useState<Record<string, string>>({});
  const [yukleniyor, setYukleniyor] = useState(false);
  const [oneri, setOneri] = useState<Oneri | null>(null);
  const [mevcutProfil, setMevcutProfil] = useState<Record<string, string> | null>(null);
  const [ilkYukleme, setIlkYukleme] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const res = await fetch("/api/risk-profil", {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data?.ai_oneri) {
        try {
          const parsed = JSON.parse(data.ai_oneri);
          setOneri(parsed);
          setMevcutProfil(data);
        } catch {}
      }
      setIlkYukleme(false);
    });
  }, []);

  async function handleSecim(key: string, deger: string) {
    const yeniCevaplar = { ...cevaplar, [key]: deger };
    setCevaplar(yeniCevaplar);
    if (adim < SORULAR.length - 1) {
      setAdim(adim + 1);
    } else {
      setYukleniyor(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/risk-profil", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(yeniCevaplar),
      });
      const data = await res.json();
      try {
        setOneri(JSON.parse(data.ai_oneri));
      } catch {}
      setYukleniyor(false);
    }
  }

  if (ilkYukleme) return null;

  return (
    <div style={{ border: "1px solid rgba(59,130,246,0.12)", borderRadius: 12, overflow: "hidden", background: "#0B1220" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Risk Profili</span>
        </div>
        {oneri && (
          <button onClick={() => { setOneri(null); setMevcutProfil(null); setAdim(0); setCevaplar({}); }}
            style={{ fontSize: 10, color: "#3B82F6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, padding: "2px 10px", cursor: "pointer" }}>
            Yenile
          </button>
        )}
      </div>

      <div style={{ padding: "14px 16px" }}>
        {yukleniyor ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "20px 0" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(59,130,246,0.2)", borderTopColor: "#3B82F6", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 12, color: "#475569" }}>Profil analiz ediliyor...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : oneri ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6, fontStyle: "italic" }}>"{oneri.profil}"</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.07em", textTransform: "uppercase" }}>Önerilen Hisseler</p>
            {oneri.hisseler?.map((h) => (
              <div key={h.ticker} onClick={() => router.push(`/hisse/${h.ticker}`)}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 8, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.1)")}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#3B82F6", minWidth: 48 }}>{h.ticker}</span>
                <span style={{ fontSize: 11, color: "#475569", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{h.neden}</span>
              </div>
            ))}
            <p style={{ fontSize: 9, color: "#1E293B", lineHeight: 1.5 }}>Yatırım tavsiyesi değildir. Yalnızca teknik veri analizidir.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {SORULAR.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= adim ? "#3B82F6" : "rgba(59,130,246,0.15)" }} />
              ))}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", lineHeight: 1.5 }}>{SORULAR[adim].soru}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SORULAR[adim].secenekler.map((s) => (
                <button key={s} onClick={() => handleSecim(SORULAR[adim].key, s)}
                  style={{ padding: "9px 14px", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 8, fontSize: 12, color: "#94A3B8", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget.style.background = "rgba(59,130,246,0.1)"); (e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"); (e.currentTarget.style.color = "#F8FAFC"); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = "rgba(59,130,246,0.04)"); (e.currentTarget.style.borderColor = "rgba(59,130,246,0.12)"); (e.currentTarget.style.color = "#94A3B8"); }}>
                  {s}
                </button>
              ))}
            </div>
            {adim > 0 && (
              <button onClick={() => setAdim(adim - 1)}
                style={{ fontSize: 11, color: "#334155", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                ← Geri
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
