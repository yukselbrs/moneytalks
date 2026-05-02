"use client";
import { useState } from "react";
import { supabase } from "@/components/lib/supabase";
import { BIST_HISSELER } from "@/lib/bist-hisseler";

type ModalTip = "fiyat_seviye" | "fiyat_yuzde" | "gosterge" | "haber" | "bildirim_tercihleri";

interface Props {
  onKapat: () => void;
  onEklendi: () => void;
  varsayilanTip?: ModalTip;
}

const GOSTERGE_LISTESI = [
  { value: "rsi_asagi", label: "RSI (14) belirli seviyenin altına düşünce" },
  { value: "rsi_yukari", label: "RSI (14) belirli seviyenin üstüne çıkınca" },
  { value: "macd_pozitif", label: "MACD pozitif kesişim yapınca" },
  { value: "macd_negatif", label: "MACD negatif kesişim yapınca" },
  { value: "ma50_yukari", label: "Fiyat 50 günlük MA üstüne çıkınca" },
  { value: "ma50_asagi", label: "Fiyat 50 günlük MA altına düşünce" },
  { value: "hacim_artis", label: "Hacim ortalamanın 2 katına çıkınca" },
];

const MODAL_BASLIK: Record<ModalTip, string> = {
  fiyat_seviye: "📈 Fiyat Alarmı Ekle",
  fiyat_yuzde: "📈 Fiyat Alarmı Ekle",
  gosterge: "📊 Gösterge Alarmı Ekle",
  haber: "📰 Haber Alarmı",
  bildirim_tercihleri: "⚙️ Bildirim Tercihleri",
};

export default function AlarmModal({ onKapat, onEklendi, varsayilanTip = "fiyat_seviye" }: Props) {
  const modalTip = varsayilanTip;

  // Fiyat alarmı state
  const [tip, setTip] = useState<"fiyat_seviye" | "fiyat_yuzde">(
    varsayilanTip === "fiyat_yuzde" ? "fiyat_yuzde" : "fiyat_seviye"
  );
  const [ticker, setTicker] = useState("");
  const [kosul, setKosul] = useState<"yukari" | "asagi">("yukari");
  const [hedefDeger, setHedefDeger] = useState("");
  const [hedefYuzde, setHedefYuzde] = useState("");

  // Gösterge alarmı state
  const [gostergeTicker, setGostergeTicker] = useState("");
  const [gosterge, setGosterge] = useState(GOSTERGE_LISTESI[0].value);
  const [gostergeEsik, setGostergeEsik] = useState("");

  // Bildirim tercihleri state
  const [emailAktif, setEmailAktif] = useState(true);
  const [siteAktif, setSiteAktif] = useState(true);
  const [frekans, setFrekans] = useState<"aninda" | "gunluk">("aninda");

  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [basarili, setBasarili] = useState(false);

  async function handleKaydetFiyat() {
    if (!ticker.trim()) { setHata("Hisse kodu gerekli"); return; }
    if (tip === "fiyat_seviye" && !hedefDeger) { setHata("Hedef fiyat gerekli"); return; }
    if (tip === "fiyat_yuzde" && !hedefYuzde) { setHata("Yüzde değeri gerekli"); return; }
    setYukleniyor(true); setHata("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setHata("Oturum bulunamadı"); setYukleniyor(false); return; }
    const res = await fetch("/api/alarmlar", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        ticker: ticker.trim().toUpperCase(), tip, kosul,
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

  async function handleKaydetGosterge() {
    if (!gostergeTicker.trim()) { setHata("Hisse kodu gerekli"); return; }
    const esikGerekli = gosterge.startsWith("rsi");
    if (esikGerekli && !gostergeEsik) { setHata("Eşik değeri gerekli"); return; }
    setYukleniyor(true); setHata("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setHata("Oturum bulunamadı"); setYukleniyor(false); return; }
    const res = await fetch("/api/alarmlar", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        ticker: gostergeTicker.trim().toUpperCase(),
        tip: "gosterge",
        kosul: gosterge.includes("asagi") || gosterge.includes("negatif") ? "asagi" : "yukari",
        gosterge_tipi: gosterge,
        gosterge_esik: esikGerekli ? parseFloat(gostergeEsik.replace(",", ".")) : null,
        hedef_deger: null,
        hedef_yuzde: null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setHata(data.error || "Hata oluştu"); setYukleniyor(false); return; }
    setBasarili(true);
    setTimeout(() => { onEklendi(); onKapat(); }, 1500);
    setYukleniyor(false);
  }

  async function handleKaydetBildirim() {
    setYukleniyor(true);
    // Supabase user metadata'ya kaydet
    await supabase.auth.updateUser({
      data: { bildirim_email: emailAktif, bildirim_site: siteAktif, bildirim_frekans: frekans }
    });
    setBasarili(true);
    setTimeout(() => { onEklendi(); onKapat(); }, 1500);
    setYukleniyor(false);
  }

  const overlay = (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onKapat()}>
      <div style={{ background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 16, width: "100%", maxWidth: 440, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#F8FAFC" }}>{MODAL_BASLIK[modalTip]}</span>
          <button onClick={onKapat} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {basarili ? (
          <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <p style={{ fontSize: 14, color: "#10B981", fontWeight: 600 }}>
              {modalTip === "bildirim_tercihleri" ? "Tercihler kaydedildi!" : "Alarm oluşturuldu!"}
            </p>
            {modalTip !== "bildirim_tercihleri" && <p style={{ fontSize: 12, color: "#475569" }}>E-posta onayı gönderildi.</p>}
          </div>
        ) : (
          <div style={{ padding: "20px" }}>

            {/* FİYAT ALARMI */}
            {(modalTip === "fiyat_seviye" || modalTip === "fiyat_yuzde") && (<>
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
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" }}>Hisse Kodu</p>
                <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="THYAO"
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, color: "#F8FAFC", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" }}>Koşul</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[{ value: "yukari", label: "▲ Yükselirse" }, { value: "asagi", label: "▼ Düşerse" }].map(k => (
                    <button key={k.value} onClick={() => setKosul(k.value as "yukari" | "asagi")}
                      style={{ padding: "10px", borderRadius: 8, border: `1px solid ${kosul === k.value ? (k.value === "yukari" ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)") : "rgba(59,130,246,0.12)"}`, background: kosul === k.value ? (k.value === "yukari" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)") : "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: kosul === k.value ? (k.value === "yukari" ? "#10B981" : "#EF4444") : "#64748B" }}>
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  {tip === "fiyat_seviye" ? "Hedef Fiyat (₺)" : "Yüzde Değişim (%)"}
                </p>
                <input value={tip === "fiyat_seviye" ? hedefDeger : hedefYuzde}
                  onChange={e => tip === "fiyat_seviye" ? setHedefDeger(e.target.value) : setHedefYuzde(e.target.value)}
                  placeholder={tip === "fiyat_seviye" ? "300,00" : "5,00"} type="number"
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, color: "#F8FAFC", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              {hata && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{hata}</p>}
              <button onClick={handleKaydetFiyat} disabled={yukleniyor}
                style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: yukleniyor ? "not-allowed" : "pointer", opacity: yukleniyor ? 0.6 : 1 }}>
                {yukleniyor ? "Kaydediliyor..." : "Alarmı Kaydet"}
              </button>
              <p style={{ fontSize: 10, color: "#334155", marginTop: 8, textAlign: "center" }}>Alarm tetiklendiğinde e-posta bildirim alacaksınız.</p>
            </>)}

            {/* GÖSTERGE ALARMI */}
            {modalTip === "gosterge" && (<>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" }}>Hisse Kodu</p>
                <input value={gostergeTicker} onChange={e => setGostergeTicker(e.target.value.toUpperCase())} placeholder="THYAO"
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, color: "#F8FAFC", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" }}>Gösterge Koşulu</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {GOSTERGE_LISTESI.map(g => (
                    <button key={g.value} onClick={() => setGosterge(g.value)}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${gosterge === g.value ? "rgba(139,92,246,0.5)" : "rgba(59,130,246,0.12)"}`, background: gosterge === g.value ? "rgba(139,92,246,0.1)" : "transparent", cursor: "pointer", textAlign: "left", fontSize: 12, color: gosterge === g.value ? "#A78BFA" : "#94A3B8" }}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              {gosterge.startsWith("rsi") && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" }}>RSI Eşik Değeri</p>
                  <input value={gostergeEsik} onChange={e => setGostergeEsik(e.target.value)} placeholder="30" type="number"
                    style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, color: "#F8FAFC", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              )}
              {hata && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{hata}</p>}
              <button onClick={handleKaydetGosterge} disabled={yukleniyor}
                style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #5B21B6, #8B5CF6)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: yukleniyor ? "not-allowed" : "pointer", opacity: yukleniyor ? 0.6 : 1 }}>
                {yukleniyor ? "Kaydediliyor..." : "Alarmı Kaydet"}
              </button>
              <p style={{ fontSize: 10, color: "#334155", marginTop: 8, textAlign: "center" }}>Alarm tetiklendiğinde e-posta bildirim alacaksınız.</p>
            </>)}

            {/* HABER ALARMI - YAKINDA */}
            {modalTip === "haber" && (
              <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 40 }}>📰</div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9" }}>Haber Alarmları</p>
                <p style={{ fontSize: 13, color: "#475569", textAlign: "center", lineHeight: 1.6 }}>KAP duyuruları ve piyasa haberleri için alarm özelliği yakında aktif olacak.</p>
                <div style={{ marginTop: 8, padding: "8px 20px", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 20 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#F97316" }}>Çok Yakında</span>
                </div>
              </div>
            )}

            {/* BİLDİRİM TERCİHLERİ */}
            {modalTip === "bildirim_tercihleri" && (<>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}>Bildirim Kanalları</p>
                {[
                  { label: "E-posta Bildirimleri", desc: "Alarm tetiklenince e-posta al", value: emailAktif, set: setEmailAktif },
                  { label: "Site İçi Bildirimler", desc: "Bildirimler sayfasında göster", value: siteAktif, set: setSiteAktif },
                ].map(b => (
                  <div key={b.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", margin: 0 }}>{b.label}</p>
                      <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 0" }}>{b.desc}</p>
                    </div>
                    <div onClick={() => b.set(!b.value)}
                      style={{ width: 40, height: 22, borderRadius: 11, background: b.value ? "#3B82F6" : "#1E293B", border: `1px solid ${b.value ? "#3B82F6" : "rgba(255,255,255,0.1)"}`, position: "relative", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 2, left: b.value ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 8, letterSpacing: "0.07em", textTransform: "uppercase" }}>Bildirim Sıklığı</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { value: "aninda", label: "⚡ Anlık", desc: "Her tetiklemede bildir" },
                    { value: "gunluk", label: "📅 Günlük Özet", desc: "Günde bir özet gönder" },
                  ].map(f => (
                    <button key={f.value} onClick={() => setFrekans(f.value as "aninda" | "gunluk")}
                      style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${frekans === f.value ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.12)"}`, background: frekans === f.value ? "rgba(59,130,246,0.1)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: frekans === f.value ? "#3B82F6" : "#94A3B8", margin: 0 }}>{f.label}</p>
                      <p style={{ fontSize: 10, color: "#475569", margin: "2px 0 0" }}>{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              {hata && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{hata}</p>}
              <button onClick={handleKaydetBildirim} disabled={yukleniyor}
                style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: yukleniyor ? "not-allowed" : "pointer", opacity: yukleniyor ? 0.6 : 1 }}>
                {yukleniyor ? "Kaydediliyor..." : "Tercihleri Kaydet"}
              </button>
            </>)}

          </div>
        )}
      </div>
    </div>
  );

  return overlay;
}
