"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";

const BILDIRIMLER = [
  { id: 1, gun: "Bugün", saat: "20:45", baslik: "TUPRS hedef fiyata yaklaştı", aciklama: "TUPRS hissesi hedef fiyatınıza (%90) ulaştı.", detay: "Hedef Fiyat: 300,00 ₺ · Güncel Fiyat: 269,00 ₺", tip: "uyari", okundu: false, ikon: "📈" },
  { id: 2, gun: "Bugün", saat: "19:32", baslik: "GARAN izleme listenize eklendi", aciklama: "GARAN hissesi izleme listenize başarıyla eklendi.", detay: "", tip: "bildirim", okundu: false, ikon: "🔔" },
  { id: 3, gun: "Bugün", saat: "18:10", baslik: "Portföy güncellendi", aciklama: "Portföyünüzdeki 2 hisse için yeni analiz raporları hazır.", detay: "", tip: "portfoy", okundu: false, ikon: "💼" },
  { id: 4, gun: "Dün", saat: "17:22", baslik: "THYAO analiz raporu hazır", aciklama: "THYAO hissesi için günlük analiz raporu oluşturuldu.", detay: "", tip: "analiz", okundu: true, ikon: "📊" },
  { id: 5, gun: "Dün", saat: "16:05", baslik: "Şifre değiştirildi", aciklama: "Hesap şifreniz başarıyla değiştirildi.", detay: "", tip: "sistem", okundu: true, ikon: "🔒" },
  { id: 6, gun: "Bu Hafta", saat: "23 Nis", baslik: "BIST 100 haftalık bülteni yayınlandı", aciklama: "Haftalık piyasa bültenini okumak için tıklayın.", detay: "", tip: "haber", okundu: true, ikon: "📢" },
  { id: 7, gun: "Bu Hafta", saat: "22 Nis", baslik: "ASELS %5 yükseldi", aciklama: "ASELS hissesi günlük %5,23 artışla kapandı.", detay: "", tip: "uyari", okundu: true, ikon: "📈" },
  { id: 8, gun: "Bu Hafta", saat: "21 Nis", baslik: "Yeni analiz özelliği eklendi", aciklama: "Teknik analiz göstergelerine RSI ve MACD eklendi.", detay: "", tip: "sistem", okundu: true, ikon: "⚡" },
];

const SEKMELER = ["Tümü", "Okunmamış", "Uyarılar", "Haberler", "Sistem"];

const TIP_RENK: Record<string, string> = {
  uyari: "#EF4444", bildirim: "#3B82F6", portfoy: "#10B981",
  analiz: "#8B5CF6", sistem: "#F59E0B", haber: "#F97316",
};

export default function BildirimlerPage() {
  const [sekme, setSekme] = useState("Tümü");
  const [bildirimler, setBildirimler] = useState(BILDIRIMLER);

  const filtrelendi = bildirimler.filter(b => {
    if (sekme === "Okunmamış") return !b.okundu;
    if (sekme === "Uyarılar") return b.tip === "uyari";
    if (sekme === "Haberler") return b.tip === "haber";
    if (sekme === "Sistem") return b.tip === "sistem";
    return true;
  });

  const okunmamisSayi = bildirimler.filter(b => !b.okundu).length;

  const tumunuOku = () => setBildirimler(prev => prev.map(b => ({ ...b, okundu: true })));
  const tekOku = (id: number) => setBildirimler(prev => prev.map(b => b.id === id ? { ...b, okundu: true } : b));

  const gunler = [...new Set(filtrelendi.map(b => b.gun))];

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", marginBottom: 4 }}>Bildirimler</h1>
          <p style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>Hesabınızla ilgili bildirimleri ve uyarıları burada görüntüleyin.</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
            {/* Sol */}
            <div>
              {/* Sekmeler + Tümünü Oku */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(59,130,246,0.08)", marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
                  {SEKMELER.map(s => (
                    <button key={s} onClick={() => setSekme(s)} style={{ fontSize: 13, fontWeight: 500, padding: "8px 16px", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", color: sekme===s ? "#3B82F6" : "#475569", borderBottom: sekme===s ? "2px solid #3B82F6" : "2px solid transparent", marginBottom: -1 }}>
                      {s}{s === "Okunmamış" && okunmamisSayi > 0 && <span style={{ marginLeft: 6, background: "#3B82F6", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 6px" }}>{okunmamisSayi}</span>}
                    </button>
                  ))}
                </div>
                {okunmamisSayi > 0 && (
                  <button onClick={tumunuOku} style={{ fontSize: 12, color: "#3B82F6", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", padding: "0 4px" }}>✓ Tümünü Okundu İşaretle</button>
                )}
              </div>

              {/* Bildirimler */}
              {filtrelendi.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", color: "#334155", fontSize: 13 }}>Bu kategoride bildirim yok.</div>
              ) : gunler.map(gun => (
                <div key={gun} style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 10 }}>{gun}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {filtrelendi.filter(b => b.gun === gun).map(b => (
                      <div key={b.id} onClick={() => tekOku(b.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 10, background: b.okundu ? "rgba(255,255,255,0.01)" : "rgba(59,130,246,0.04)", border: `1px solid ${b.okundu ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.15)"}`, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.06)")}
                        onMouseLeave={e => (e.currentTarget.style.background = b.okundu ? "rgba(255,255,255,0.01)" : "rgba(59,130,246,0.04)")}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: TIP_RENK[b.tip] + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          {b.ikon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            {!b.okundu && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", flexShrink: 0 }}/>}
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{b.baslik}</span>
                          </div>
                          <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>{b.aciklama}</p>
                          {b.detay && <p style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{b.detay}</p>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: "#334155" }}>{b.saat}</span>
                          <span style={{ fontSize: 11, color: "#475569" }}>›</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Sağ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Özet */}
              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, padding: "16px", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Bildirim Özeti</p>
                  <span style={{ fontSize: 11, color: "#3B82F6" }}>Tüm Zamanlar</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Toplam Bildirim", value: bildirimler.length, ikon: "🔔", renk: "#3B82F6" },
                    { label: "Okunmamış", value: okunmamisSayi, ikon: "💬", renk: "#F97316" },
                    { label: "Uyarılar", value: bildirimler.filter(b=>b.tip==="uyari").length, ikon: "⚠️", renk: "#EF4444" },
                    { label: "Haberler", value: bildirimler.filter(b=>b.tip==="haber").length, ikon: "📰", renk: "#10B981" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 16 }}>{s.ikon}</span>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 800, color: s.renk }}>{s.value}</p>
                      <p style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bildirim Tercihleri */}
              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Bildirim Tercihleri</p>
                </div>
                {[
                  { label: "Fiyat Uyarıları", aciklama: "Hedef fiyata ulaşma, % değişim uyarıları", aktif: true },
                  { label: "Portföy Bildirimleri", aciklama: "Portföy güncellemeleri, analiz raporları", aktif: true },
                  { label: "Haberler", aciklama: "Piyasa haberleri ve gelişmeler", aktif: true },
                  { label: "Ekonomik Takvim", aciklama: "Önemli ekonomik etkinlik uyarıları", aktif: false },
                  { label: "Sistem Bildirimleri", aciklama: "Hesap ve güvenlik bildirimleri", aktif: true },
                ].map((t, i, arr) => (
                  <div key={t.label} style={{ padding: "12px 16px", borderBottom: i < arr.length-1 ? "1px solid rgba(59,130,246,0.04)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", marginBottom: 2 }}>{t.label}</p>
                      <p style={{ fontSize: 11, color: "#475569" }}>{t.aciklama}</p>
                    </div>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: t.aktif ? "#3B82F6" : "#1E293B", border: `1px solid ${t.aktif ? "#3B82F6" : "rgba(255,255,255,0.1)"}`, position: "relative", flexShrink: 0, cursor: "pointer" }}>
                      <div style={{ position: "absolute", top: 2, left: t.aktif ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }}/>
                    </div>
                  </div>
                ))}
                <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(59,130,246,0.06)" }}>
                  <button style={{ fontSize: 12, color: "#3B82F6", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    ⚙ Tercihleri Düzenle →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
