"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/components/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!password || !confirm) { setError("Tüm alanları doldurun."); return; }
    if (password.length < 8) { setError("Şifre en az 8 karakter olmalıdır."); return; }
    if (password !== confirm) { setError("Şifreler eşleşmiyor."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError("Şifre güncellenemedi. Lütfen tekrar deneyin."); return; }
    setDone(true);
    setTimeout(() => router.push("/login"), 3000);
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
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>Şifreniz güncellendi</p>
              <p style={{ fontSize: 13, color: "#64748B" }}>Giriş sayfasına yönlendiriliyorsunuz...</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>Yeni Şifre Belirle</p>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 24 }}>En az 8 karakter içeren yeni şifrenizi girin.</p>
              {error && <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 8 }}>{error}</p>}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#64748B", fontWeight: 500, display: "block", marginBottom: 6 }}>Yeni Şifre</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="En az 8 karakter"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(59,130,246,0.15)", background: "rgba(255,255,255,0.03)", color: "#F1F5F9", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "#64748B", fontWeight: 500, display: "block", marginBottom: 6 }}>Şifre Tekrar</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Şifreyi tekrar girin"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(59,130,246,0.15)", background: "rgba(255,255,255,0.03)", color: "#F1F5F9", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <button onClick={handleSubmit} disabled={loading}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#3B82F6", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Güncelleniyor..." : "Şifremi Güncelle"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
