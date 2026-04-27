"use client";
import { useState } from "react";
import { supabase } from "@/components/lib/supabase";

interface Props {
  onKapat: () => void;
  onEklendi: () => void;
  varsayilanTip?: "fiyat_seviye" | "fiyat_yuzde";
}

export default function AlarmModal({ onKapat, onEklendi, varsayilanTip = "fiyat_seviye" }: Props) {
  const [tip, setTip] = useState<"fiyat_seviye" | "fiyat_yuzde">(varsayilanTip);
  const [ticker, setTicker] = useState("");
  const [kosul, setKosul] = useState<"yukari" | "asagi">("yukari");
  const [hedefDeger, setHedefDeger] = useState("");
  const [hedefYuzde, setHedefYuzde] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [basarili, setBasarili] = useState(false);

  async function handleKaydet() {
    if (!ticker.trim()) { setHata("Hisse kodu gerekli"); return; }
    if (tip === "fiyat_seviye" && !hedefDeger) { setHata("Hedef fiyat gerekli"); return; }
    if (tip === "fiyat_yuzde" && !hedefYuzde) { setHata("Yüzde değeri gerekli"); return; }
    setYukleniyor(true);
    setHata("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setHata("Oturum bulunamadı"); setYukleniyor(false); return; }
    const res = await fetch("/api/alarmlar", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        ticker: ticker.trim().toUpperCase(),
        tip,
        kosul,
        hedef_deger: tip === "fiyat_seviye" ? parseFloat(hedefDeger.replace(",", ".")) : null,
        hedef_yuzde: tip === "fiyat_yuzde" ? parseFloat(hedefYuzde.replace(",", ".")) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setHata(data.error || "Hata oluştu"); setYukleniyor(false); return; }
    setBasarili(true);
    setTimeout(() => { onEklendi(); onKapat(); }, 1500);
    setYukleniyor(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onKapat()}>
      <div style={{ background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 16, width: "100%", maxWidth: 440, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#F8FAFC" }}>📈 Fiyat Alarmı Ekle</span>
          <button onClick={onKapat} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {basarili ? (
          <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <p style={{ fontSize: 14, color: "#10B981", fontWeight: 600 }}>Alarm oluşturuldu!</p>
            <p style={{ fontSize: 12, color: "#475569" }}>E-posta onayı gönderildi.</p>
          </div>
        ) : (
          <div style={{ padding: "20px" }}>
            {/* Tip seçici */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 8, letterSpacing: "0.07em", textTransform: "uppercase" }}>Alarm Tipi</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { value: "fiyat_seviye", label: "Fiyat Seviyesi", desc: "Belirli bir fiyata ulaşınca" },
                  { value: "fiyat_yuzde", label: "Yüzde Değişim", desc: "% kadar hareket edince" },
                ].map(t => (
                  <button key={t.value} onClick={() => setTip(t.value as "fiyat_seviye" | "fiyat_yuzde")}
                    style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${tip === t.value ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.12)"}`, background: tip === t.value ? "rgba(59,130,246,0.1)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: tip === t.value ? "#3B82F6" : "#94A3B8", margin: 0 }}>{t.label}</p>
                    <p style={{ fontSize: 10, color: "#475569", margin: "2px 0 0" }}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Ticker */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" }}>Hisse Kodu</p>
              <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="THYAO"
                style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, color: "#F8FAFC", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box", letterSpacing: "0.05em" }} />
            </div>

            {/* Koşul */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" }}>Koşul</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { value: "yukari", label: "▲ Yükselirse" },
                  { value: "asagi", label: "▼ Düşerse" },
                ].map(k => (
                  <button key={k.value} onClick={() => setKosul(k.value as "yukari" | "asagi")}
                    style={{ padding: "10px", borderRadius: 8, border: `1px solid ${kosul === k.value ? (k.value === "yukari" ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)") : "rgba(59,130,246,0.12)"}`, background: kosul === k.value ? (k.value === "yukari" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)") : "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: kosul === k.value ? (k.value === "yukari" ? "#10B981" : "#EF4444") : "#64748B" }}>
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hedef */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                {tip === "fiyat_seviye" ? "Hedef Fiyat (₺)" : "Yüzde Değişim (%)"}
              </p>
              <input
                value={tip === "fiyat_seviye" ? hedefDeger : hedefYuzde}
                onChange={e => tip === "fiyat_seviye" ? setHedefDeger(e.target.value) : setHedefYuzde(e.target.value)}
                placeholder={tip === "fiyat_seviye" ? "300,00" : "5,00"}
                type="number"
                style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, color: "#F8FAFC", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            {hata && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{hata}</p>}

            <button onClick={handleKaydet} disabled={yukleniyor}
              style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: yukleniyor ? "not-allowed" : "pointer", opacity: yukleniyor ? 0.6 : 1 }}>
              {yukleniyor ? "Kaydediliyor..." : "Alarmı Kaydet"}
            </button>
            <p style={{ fontSize: 10, color: "#334155", marginTop: 8, textAlign: "center" }}>Alarm tetiklendiğinde e-posta bildirim alacaksınız.</p>
          </div>
        )}
      </div>
    </div>
  );
}
