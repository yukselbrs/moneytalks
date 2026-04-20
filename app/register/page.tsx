"use client";

import { useState } from "react";
import { supabase } from "@/components/lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setError("Kayıt sırasında hata oluştu: " + error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <div style={{ width: "100%", maxWidth: 400, padding: "0 24px", textAlign: "center" }}>
          <a href="/" style={{ fontSize: 18, fontWeight: 500, color: "#F8FAFC", textDecoration: "none" }}>
            para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#1E293B" }}>.com</span>
          </a>
          <div style={{ border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12, padding: "36px 24px", background: "rgba(255,255,255,0.02)", marginTop: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20 }}>✉</div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: "#F8FAFC", marginBottom: 8 }}>E-postanı doğrula</h1>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{email} adresine doğrulama linki gönderdik. Lütfen e-postanı kontrol et.</p>
            <a href="/login" style={{ display: "inline-block", marginTop: 20, fontSize: 12, color: "#3B82F6", textDecoration: "none" }}>Giriş sayfasına dön →</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <a href="/" style={{ fontSize: 18, fontWeight: 500, color: "#F8FAFC", textDecoration: "none" }}>
            para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#1E293B" }}>.com</span>
          </a>
          <p style={{ fontSize: 13, color: "#334155", marginTop: 8 }}>Ücretsiz hesap oluştur</p>
        </div>

        <div style={{ border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12, padding: "28px 24px", background: "rgba(255,255,255,0.02)" }}>
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "#475569", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Ad Soyad</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Adın Soyadın"
                style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(59,130,246,0.2)", outline: "none", fontSize: 14, color: "#94A3B8", padding: "6px 0" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#475569", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>E-posta</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@email.com"
                style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(59,130,246,0.2)", outline: "none", fontSize: 14, color: "#94A3B8", padding: "6px 0" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#475569", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Şifre</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••"
                style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(59,130,246,0.2)", outline: "none", fontSize: 14, color: "#94A3B8", padding: "6px 0" }} />
              <p style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>En az 6 karakter, 1 büyük harf ve 1 rakam içermelidir.</p>
            </div>
            {error && <p style={{ fontSize: 12, color: "#E24B4A" }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ marginTop: 8, height: 40, background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 20 }}>
          Zaten hesabın var mı?{" "}
          <a href="/login" style={{ color: "#3B82F6", textDecoration: "none" }}>Giriş yap</a>
        </p>
      </div>
    </div>
  );
}
