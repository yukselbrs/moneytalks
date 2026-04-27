"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import LogoIcon from "@/components/LogoIcon";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [beniHatirla, setBeniHatirla] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    let loginEmail = email;
    if (!email.includes("@")) {
      const { data, error: rpcError } = await supabase.rpc("get_email_by_username", { uname: email });
      if (rpcError || !data) {
        setError("Kullanıcı adı bulunamadı.");
        setLoading(false);
        return;
      }
      loginEmail = data;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) {
      setError("E-posta/kullanıcı adı veya şifre hatalı.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  const features = [
    { title: "Akıllı Analizler", desc: "Yapay zeka destekli analizler ile potansiyel fırsatları keşfedin." },
    { title: "Gerçek Zamanlı Veriler", desc: "Piyasalardaki gelişmeleri anlık takip edin, hızlı kararlar alın." },
    { title: "Güvenli ve Kişisel", desc: "Verileriniz en üst düzey güvenlik önlemleriyle korunur." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <style>{`
        @media (max-width: 768px) {
          .login-grid { grid-template-columns: 1fr !important; }
          .login-left { display: none !important; }
          .login-right { padding: 40px 28px !important; }
        }
      `}</style>
      <div className="login-grid" style={{ width: "100%", maxWidth: 960, display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(59,130,246,0.12)", boxShadow: "0 0 80px rgba(59,130,246,0.07)" }}>

        {/* SOL KOLON */}
        <div className="login-left" style={{ background: "linear-gradient(160deg, #0F1C2E 0%, #0B1220 100%)", padding: "52px 44px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid rgba(59,130,246,0.08)" }}>

          <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <LogoIcon size={32} />
            <span style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9" }}>
              para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#334155" }}>.com</span>
            </span>
          </a>

          <div style={{ margin: "48px 0 36px" }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#F1F5F9", lineHeight: 1.2, letterSpacing: "-0.8px", marginBottom: 12 }}>
              Veriye dayalı kararlar,<br />
              <span style={{ color: "#3B82F6" }}>güçlü yatırımlar.</span>
            </h1>
            <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7 }}>
              BIST ve küresel piyasalarda yapay zeka destekli analizler, gerçek zamanlı veriler ve akıllı yatırım araçları.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 36 }}>
            {features.map((f) => (
              <div key={f.title} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: "linear-gradient(135deg, #60A5FA, #1E40AF)" }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", marginBottom: 4 }}>{f.title}</p>
                  <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>Pro özellikler ile yatırımınızı bir üst seviyeye taşıyın.</p>
              <p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Daha fazla analiz, gelişmiş araçlar ve özel veriler.</p>
            </div>
            <a href="/pro" style={{ flexShrink: 0, padding: "8px 16px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>Pro'ya Yükselt</a>
          </div>

          <div style={{ display: "flex", gap: 20, marginTop: 32 }}>
            {["256-bit SSL şifreleme", "KVKK uyumlu", "Verileriniz güvende"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: "#3B82F6", fontSize: 12 }}>✓</span>
                <span style={{ fontSize: 11, color: "#475569" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SAG KOLON */}
        <div className="login-right" style={{ background: "#0F1829", padding: "52px 44px", display: "flex", flexDirection: "column", justifyContent: "center" }}>

          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px", background: "linear-gradient(135deg, rgba(30,64,175,0.3), rgba(59,130,246,0.3))", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoIcon size={32} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F1F5F9", marginBottom: 6 }}>Tekrar hoş geldiniz!</h2>
            <p style={{ fontSize: 13, color: "#64748B" }}>Hesabınıza giriş yaparak devam edin.</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            <div>
              <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, display: "block", marginBottom: 8 }}>E-posta veya Kullanıcı Adı</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "0 14px", height: 46 }}>
                <span style={{ color: "#475569" }}>✉</span>
                <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@email.com veya kullanici_adi"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#E2E8F0" }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, display: "block", marginBottom: 8 }}>Şifre</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "0 14px", height: 46 }}>
                <span style={{ color: "#475569" }}>🔒</span>
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••••"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#E2E8F0" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}>
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={beniHatirla} onChange={(e) => setBeniHatirla(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: "#3B82F6" }} />
                <span style={{ fontSize: 12, color: "#64748B" }}>Beni hatırla</span>
              </label>
              <a href="/forgot-password" style={{ fontSize: 12, color: "#3B82F6", textDecoration: "none" }}>Şifremi unuttum?</a>
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: "#EF4444" }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ height: 46, background: loading ? "#1E3A6E" : "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontSize: 11, color: "#334155" }}>veya</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            <button type="button" style={{ height: 46, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#E2E8F0", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Google ile giriş yap
            </button>

            <button type="button" style={{ height: 46, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#E2E8F0", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Apple ile giriş yap
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 12, color: "#475569", marginTop: 24 }}>
            Hesabın yok mu? <a href="/register" style={{ color: "#3B82F6", textDecoration: "none", fontWeight: 600 }}>Kayıt ol</a>
          </p>
        </div>
      </div>
    </div>
  );
}
