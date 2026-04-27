"use client";

import { useState } from "react";
import { supabase } from "@/components/lib/supabase";
import LogoIcon from "@/components/LogoIcon";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  function validatePassword(pw: string) {
    if (pw.length < 6) return "Şifre en az 6 karakter olmalıdır.";
    if (!/[A-Z]/.test(pw)) return "Şifre en az bir büyük harf içermelidir.";
    if (!/[0-9]/.test(pw)) return "Şifre en az bir rakam içermelidir.";
    return null;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, username } },
    });
    if (error) {
      if (error.message.includes("already registered") || error.message.includes("already been registered")) {
        setError("Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.");
      } else {
        setError("Kayıt sırasında hata oluştu: " + error.message);
      }
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✉</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F1F5F9", marginBottom: 12 }}>E-postanı doğrula</h1>
          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, marginBottom: 24 }}>{email} adresine doğrulama linki gönderdik.</p>
          <a href="/login" style={{ fontSize: 13, color: "#3B82F6", textDecoration: "none", fontWeight: 600 }}>Giriş sayfasına dön →</a>
        </div>
      </div>
    );
  }

  const benefits = [
    { title: "Ücretsiz Başla", desc: "Kredi kartı gerekmez. Hemen analiz yapmaya başlayın." },
    { title: "527+ BIST Hissesi", desc: "Tüm Borsa İstanbul hisselerini tek platformdan takip edin." },
    { title: "Yapay Zeka Destekli", desc: "Her hisse için anında AI analizi ve risk değerlendirmesi alın." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "16px" : "24px" }}>
      <div style={{ width: "100%", maxWidth: isMobile ? 480 : 960, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(59,130,246,0.12)", boxShadow: "0 0 80px rgba(59,130,246,0.07)" }}>

        {/* SOL KOLON - sadece desktop */}
        {!isMobile && (
          <div style={{ background: "linear-gradient(160deg, #0F1C2E 0%, #0B1220 100%)", padding: "52px 44px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid rgba(59,130,246,0.08)" }}>

            <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
              <LogoIcon size={32} />
              <span style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9" }}>
                para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#334155" }}>.com</span>
              </span>
            </a>

            <div style={{ margin: "48px 0 36px" }}>
              <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#10B981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20, padding: "4px 14px", marginBottom: 20 }}>ÜCRETSİZ</div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#F1F5F9", lineHeight: 1.2, letterSpacing: "-0.8px", marginBottom: 12 }}>
                Yatırım yolculuğuna<br />
                <span style={{ color: "#3B82F6" }}>hemen başla.</span>
              </h1>
              <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7 }}>
                Dakikalar içinde hesabını oluştur, yapay zeka destekli BIST analizlerine anında eriş.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 36 }}>
              {benefits.map((b) => (
                <div key={b.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#10B981", fontSize: 14 }}>✓</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", marginBottom: 3 }}>{b.title}</p>
                    <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 20 }}>
              {["256-bit SSL şifreleme", "KVKK uyumlu", "Ücretsiz plan"].map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: "#3B82F6", fontSize: 12 }}>✓</span>
                  <span style={{ fontSize: 11, color: "#475569" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SAĞ KOLON - form */}
        <div style={{ background: "#0F1829", padding: isMobile ? "36px 24px" : "52px 44px", display: "flex", flexDirection: "column", justifyContent: "center" }}>

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", margin: "0 auto 14px", background: "linear-gradient(135deg, rgba(30,64,175,0.3), rgba(59,130,246,0.3))", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoIcon size={28} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", marginBottom: 4 }}>Hesap oluştur</h2>
            <p style={{ fontSize: 13, color: "#64748B" }}>Ücretsiz başla, istediğin zaman yükselt.</p>
          </div>

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, display: "block", marginBottom: 6 }}>Ad Soyad</label>
                <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "0 12px", height: 42 }}>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Adın Soyadın"
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#E2E8F0" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, display: "block", marginBottom: 6 }}>Kullanıcı Adı</label>
                <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "0 12px", height: 42 }}>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} required placeholder="kullanici_adi"
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#E2E8F0" }} />
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, display: "block", marginBottom: 6 }}>E-posta</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "0 14px", height: 42 }}>
                <span style={{ color: "#475569" }}>✉</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@email.com"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#E2E8F0" }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, display: "block", marginBottom: 6 }}>Şifre</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "0 14px", height: 42 }}>
                <span style={{ color: "#475569" }}>🔒</span>
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••••"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#E2E8F0" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}>
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#475569", marginTop: 5 }}>En az 6 karakter, 1 büyük harf ve 1 rakam içermelidir.</p>
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: "#EF4444" }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ height: 44, background: loading ? "#1E3A6E" : "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
              {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 12, color: "#475569", marginTop: 20 }}>
            Zaten hesabın var mı?{" "}
            <a href="/login" style={{ color: "#3B82F6", textDecoration: "none", fontWeight: 600 }}>Giriş yap</a>
          </p>
        </div>
      </div>
    </div>
  );
}
