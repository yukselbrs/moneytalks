"use client";
import { useState } from "react";
import { supabase } from "@/components/lib/supabase";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!email) { setError("E-posta adresi gerekli."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://parakonusur.com/reset-password",
    });
    setLoading(false);
    if (error) { setError("Bir hata oluştu. Lütfen tekrar deneyin."); return; }
    setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-manrope, sans-serif)", padding: "0 24px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/dashboard" style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", textDecoration: "none" }}>
            para<span style={{ color: "#3B82F6" }}>konusur</span>
          </a>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 16, padding: "32px 28px" }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>E-posta gönderildi</p>
              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>
                <strong style={{ color: "#94A3B8" }}>{email}</strong> adresine şifre sıfırlama bağlantısı gönderdik. Gelen kutunuzu kontrol edin.
              </p>
              <button onClick={() => router.push("/login")} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#3B82F6", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Girişe Dön
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>Şifremi Unuttum</p>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 24 }}>E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.</p>
              {error && <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 8 }}>{error}</p>}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "#64748B", fontWeight: 500, display: "block", marginBottom: 6 }}>E-posta</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="ornek@email.com"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(59,130,246,0.15)", background: "rgba(255,255,255,0.03)", color: "#F1F5F9", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <button onClick={handleSubmit} disabled={loading}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#3B82F6", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginBottom: 16 }}>
                {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
              </button>
              <p style={{ textAlign: "center", fontSize: 13, color: "#475569" }}>
                <a href="/login" style={{ color: "#3B82F6", textDecoration: "none" }}>← Girişe Dön</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
