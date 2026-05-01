"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import AppShell from "@/components/AppShell";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const SEKMELER = ["Hesap Bilgileri", "Güvenlik", "İstatistikler", "Üyelik Planı"];

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sekme, setSekme] = useState("Hesap Bilgileri");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [silmeModal, setSilmeModal] = useState(false);
  const [silmeOnay, setSilmeOnay] = useState("");
  const [silmeLoading, setSilmeLoading] = useState(false);
  const [istatistik, setIstatistik] = useState({ analizSayisi: 0, watchlistSayisi: 0, portfoySayisi: 0 });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
      setEmail(session.user.email || "");
      setFullName(session.user.user_metadata?.full_name || "");
      setUsername(session.user.user_metadata?.username || "");
      setAvatarUrl(session.user.user_metadata?.avatar_url || "");
      setLoading(false);
      // İstatistikleri çek
      Promise.all([
        supabase.from("analizler").select("id", { count: "exact" }).eq("user_id", session.user.id),
        supabase.from("watchlist").select("id", { count: "exact" }).eq("user_id", session.user.id),
        supabase.from("portfoy").select("id", { count: "exact" }).eq("user_id", session.user.id),
      ]).then(([analizRes, watchlistRes, portfoyRes]) => {
        setIstatistik({
          analizSayisi: analizRes.count || 0,
          watchlistSayisi: watchlistRes.count || 0,
          portfoySayisi: portfoyRes.count || 0,
        });
      });
    });
  }, [router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMessage(""); setError("");
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName, username } });
    if (error) setError(error.message);
    else setMessage("Bilgiler güncellendi.");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(""); setError("");
    if (!currentPassword) { setError("Mevcut şifrenizi girin."); return; }
    if (newPassword !== newPasswordConfirm) { setError("Şifreler eşleşmiyor."); return; }
    if (newPassword.length < 6) { setError("En az 6 karakter olmalı."); return; }
    if (!/[A-Z]/.test(newPassword)) { setError("En az bir büyük harf gerekli."); return; }
    if (!/[0-9]/.test(newPassword)) { setError("En az bir rakam gerekli."); return; }
    const { data: { session } } = await supabase.auth.getSession();
    const emailAddr = session?.user?.email;
    if (!emailAddr) { setError("Oturum bulunamadı."); return; }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: emailAddr, password: currentPassword });
    if (signInError) { setError("Mevcut şifre yanlış."); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setError(error.message);
    else { setMessage("Şifre güncellendi."); setCurrentPassword(""); setNewPassword(""); setNewPasswordConfirm(""); }
  }

  const initials = fullName
    ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { setError("Fotoğraf 2MB'dan küçük olmalı."); return; }
    setAvatarUploading(true); setError("");
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setError("Yükleme hatası: " + upErr.message); setAvatarUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updErr } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    if (updErr) setError("Profil güncelleme hatası.");
    else { setAvatarUrl(publicUrl); setMessage("Profil fotoğrafı güncellendi."); }
    setAvatarUploading(false);
  }

  const displayName = username || email.split("@")[0];

  async function handleHesapSil() {
    if (silmeOnay !== "SİL") { setError('Onay için "SİL" yazın.'); return; }
    setSilmeLoading(true); setError("");
    try {
      await supabase.auth.signOut();
      const res = await fetch("/api/hesap-sil", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error("Silme başarısız");
      router.push("/");
    } catch {
      setError("Hesap silinemedi. Lütfen hello@parakonusur.com adresine yazın.");
      setSilmeLoading(false);
    }
  }

  const isMobil = useMediaQuery("(max-width: 767px)");

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1220" }}>
      <p style={{ color: "#475569", fontSize: 14 }}>Yükleniyor...</p>
    </div>
  );

  return (
    <AppShell>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <main style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 24px" }}>

          {/* Profil Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
            <label style={{ position: "relative", cursor: "pointer", flexShrink: 0 }} title="Fotoğraf yükle">
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "2px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#3B82F6", overflow: "hidden", position: "relative" }}>
                {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                {avatarUploading && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
            </label>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.3px" }}>{fullName || displayName}</h1>
              <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>@{displayName} · {email}</p>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#F97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 20, padding: "3px 10px" }}>DEMO</span>
          </div>

          {/* Sekmeler */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(59,130,246,0.08)", paddingBottom: 0, overflowX: "auto" }}>
            {SEKMELER.map((s) => (
              <button key={s} onClick={() => { setSekme(s); setMessage(""); setError(""); }}
                style={{ fontSize: 13, fontWeight: 500, padding: "8px 16px", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap",
                  color: sekme === s ? "#3B82F6" : "#475569",
                  borderBottom: sekme === s ? "2px solid #3B82F6" : "2px solid transparent",
                  marginBottom: -1,
                }}>
                {s}
              </button>
            ))}
          </div>

          {/* Mesaj/Hata */}
          {message && <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, fontSize: 12, color: "#10B981" }}>{message}</div>}
          {error && <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 12, color: "#EF4444" }}>{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: sekme === "Hesap Bilgileri" && !isMobil ? "1fr 320px" : "1fr", gap: 20 }}>

          {/* HESAP BİLGİLERİ */}
          {sekme === "Hesap Bilgileri" && (<>
            <form onSubmit={handleSaveProfile}>
              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Kişisel Bilgiler</p>
                </div>
                {[
                  { label: "Ad Soyad", value: fullName, setter: setFullName, placeholder: "Adın Soyadın", disabled: false },
                  { label: "Kullanıcı Adı", value: username, setter: (v: string) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, "")), placeholder: "kullanici_adi", disabled: false },
                  { label: "E-posta", value: email, setter: () => {}, placeholder: "", disabled: true },
                ].map((f, i, arr) => (
                  <div key={f.label} style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid rgba(59,130,246,0.06)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "#64748B", minWidth: 140 }}>{f.label}</span>
                    <input value={f.value} onChange={(e) => !f.disabled && f.setter(e.target.value)} disabled={f.disabled} placeholder={f.placeholder}
                      style={{ background: "transparent", border: "none", borderBottom: f.disabled ? "none" : "1px solid rgba(59,130,246,0.2)", outline: "none", fontSize: 13, color: f.disabled ? "#334155" : "#E2E8F0", padding: "4px 0", textAlign: "right", flex: 1, maxWidth: 280 }} />
                  </div>
                ))}
                <div style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" style={{ height: 34, padding: "0 20px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Kaydet</button>
                </div>
              </div>
            </form>

            {/* Sağ — İstatistik özeti */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, padding: "16px 20px", background: "rgba(255,255,255,0.01)" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 14 }}>Hesap Özeti</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Üyelik", value: user?.created_at ? new Date(user.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                    { label: "Son Giriş", value: "Bugün" },
                    { label: "Analizler", value: istatistik.analizSayisi },
                    { label: "İzleme", value: istatistik.watchlistSayisi },
                  ].map((s) => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{s.label}</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ border: "1px solid rgba(249,115,22,0.15)", borderRadius: 12, padding: "16px 20px", background: "rgba(249,115,22,0.04)" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#F97316", marginBottom: 4 }}>⚡ Demo Hesap</p>
                <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>Pro'ya geçerek sınırsız analiz ve gerçek zamanlı veri erişimi kazanın.</p>
                <a href="/pro" style={{ display: "inline-block", marginTop: 10, fontSize: 12, fontWeight: 600, color: "#fff", background: "linear-gradient(90deg, #EA580C, #F97316)", padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Pro'ya Yükselt →</a>
              </div>
            </div>
          </>)}

          {/* GÜVENLİK */}
          {sekme === "Güvenlik" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
              <form onSubmit={handleChangePassword}>
                <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Şifre Değiştir</p>
                  </div>
                  {[
                    { label: "Mevcut Şifre", value: currentPassword, setter: setCurrentPassword },
                    { label: "Yeni Şifre", value: newPassword, setter: setNewPassword },
                    { label: "Şifre Tekrar", value: newPasswordConfirm, setter: setNewPasswordConfirm },
                  ].map((f, i, arr) => (
                    <div key={f.label} style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid rgba(59,130,246,0.06)" : "none" }}>
                      <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>{f.label}</div>
                        <input type={showPasswords[f.label] ? "text" : "password"} value={f.value} onChange={(e) => f.setter(e.target.value)} placeholder="••••••••"
                          style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#E2E8F0", padding: "4px 0", flex: 1 }} />
                        <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, [f.label]: !prev[f.label] }))}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "0 4px", color: "#64748B", fontSize: 16, lineHeight: 1 }}>
                          {showPasswords[f.label] ? "🙈" : "👁"}
                        </button>
                    </div>
                  ))}
                  <div style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end" }}>
                    <button type="submit" style={{ height: 34, padding: "0 20px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Güncelle</button>
                  </div>
                </div>
              </form>

              <div style={{ border: "1px solid rgba(16,185,129,0.15)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Hesap Güvenliği</p>
                </div>
                {[
                  { label: "E-posta Doğrulama", value: "✓ Doğrulandı", color: "#10B981" },
                  { label: "İki Faktörlü Doğrulama", value: "Aktif değil", color: "#64748B" },
                ].map((s, i, arr) => (
                  <div key={s.label} style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid rgba(59,130,246,0.06)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#94A3B8" }}>{s.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 13, color: "#E2E8F0" }}>Hesabı Sil</p>
                    <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Bu işlem geri alınamaz.</p>
                  </div>
                  <a href="mailto:hello@parakonusur.com?subject=Hesap%20Silme%20Talebi" style={{ height: 34, padding: "0 14px", background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 12, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Hesabı Sil</a>
                </div>
              </div>
            </div>
          )}

          {/* İSTATİSTİKLER */}
          {sekme === "İstatistikler" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobil ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { label: "Oluşturulan Analiz", value: istatistik.analizSayisi, sub: "Toplam" },
                  { label: "İzlenen Hisse", value: istatistik.watchlistSayisi, sub: "Toplam" },
                  { label: "Portföydeki Hisse", value: istatistik.portfoySayisi, sub: "Toplam" },
                  { label: "Üyelik", value: "Demo", sub: "Mevcut plan" },
                ].map((s) => (
                  <div key={s.label} style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, padding: "16px 20px", background: "rgba(255,255,255,0.01)" }}>
                    <p style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 28, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.8px" }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Aktivite Geçmişi</p>
                </div>
                {[
                  { zaman: "Bugün 14:22", mesaj: "TUPRS analizi oluşturuldu", ikon: "📊" },
                  { zaman: "Bugün 11:05", mesaj: "GARAN izleme listesine eklendi", ikon: "⭐" },
                  { zaman: "Dün 18:10", mesaj: "Portföy güncellendi", ikon: "💼" },
                  { zaman: "Dün 17:22", mesaj: "THYAO analizi oluşturuldu", ikon: "📊" },
                  { zaman: "2 gün önce", mesaj: "Şifre değiştirildi", ikon: "🔒" },
                ].map((a, i) => (
                  <div key={i} style={{ padding: "12px 20px", borderBottom: i < 4 ? "1px solid rgba(59,130,246,0.05)" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 16 }}>{a.ikon}</span>
                    <span style={{ fontSize: 13, color: "#94A3B8", flex: 1 }}>{a.mesaj}</span>
                    <span style={{ fontSize: 11, color: "#334155" }}>{a.zaman}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ÜYELİK PLANI */}
          {sekme === "Üyelik Planı" && (
            <div style={{ display: "grid", gridTemplateColumns: isMobil ? "1fr" : "1fr 1fr", gap: 16 }}>
              {[
                {
                  isim: "Demo", fiyat: "Ücretsiz", aktif: true,
                  ozellikler: ["5 analiz/ay", "Gecikmeli veri (15dk)", "Temel risk skoru", "İzleme listesi (5 hisse)"],
                },
                {
                  isim: "Pro", fiyat: "Yakında", aktif: false,
                  ozellikler: ["Sınırsız analiz", "Gerçek zamanlı veri", "Gelişmiş risk skoru", "Sınırsız izleme listesi", "AI destekli yorumlar", "Reklamsız deneyim"],
                },
              ].map((plan) => (
                <div key={plan.isim} style={{ border: `1px solid ${plan.aktif ? "rgba(59,130,246,0.2)" : "rgba(249,115,22,0.2)"}`, borderRadius: 12, padding: "20px", background: plan.aktif ? "rgba(59,130,246,0.04)" : "rgba(249,115,22,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9" }}>{plan.isim}</p>
                    {plan.aktif && <span style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", background: "rgba(59,130,246,0.12)", borderRadius: 20, padding: "3px 10px" }}>AKTİF</span>}
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 800, color: "#F1F5F9", marginBottom: 16 }}>{plan.fiyat}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {plan.ozellikler.map((o) => (
                      <div key={o} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: plan.aktif ? "#3B82F6" : "#F97316", fontSize: 12 }}>✓</span>
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>{o}</span>
                      </div>
                    ))}
                  </div>
                  {!plan.aktif && (
                    <a href="/pro" style={{ display: "block", textAlign: "center", background: "linear-gradient(90deg, #EA580C, #F97316)", color: "#fff", fontSize: 13, fontWeight: 600, padding: "10px", borderRadius: 8, textDecoration: "none" }}>
                      Pro'ya Yükselt →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          </div>
        </main>
      </div>
      {silmeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#0F1C2E", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 16, padding: 32, maxWidth: 420, width: "100%" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>Hesabı Sil</h2>
            <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, marginBottom: 20 }}>
              Bu işlem geri alınamaz. Tüm verileriniz (portföy, analizler, izleme listesi, alarmlar) kalıcı olarak silinecek.
              Onaylamak için aşağıya <strong style={{ color: "#EF4444" }}>SİL</strong> yazın.
            </p>
            <input
              value={silmeOnay}
              onChange={e => setSilmeOnay(e.target.value)}
              placeholder='SİL yazın'
              style={{ width: "100%", padding: "10px 14px", background: "#0B1220", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#F1F5F9", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}
            />
            {error && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setSilmeModal(false); setSilmeOnay(""); setError(""); }}
                style={{ flex: 1, height: 38, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#94A3B8", fontSize: 13, cursor: "pointer" }}>
                Vazgeç
              </button>
              <button onClick={handleHesapSil} disabled={silmeLoading}
                style={{ flex: 1, height: 38, background: "#EF4444", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: silmeLoading ? "not-allowed" : "pointer", opacity: silmeLoading ? 0.7 : 1 }}>
                {silmeLoading ? "Siliniyor..." : "Hesabı Kalıcı Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
