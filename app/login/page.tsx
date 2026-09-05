"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/components/lib/supabase";
import LogoIcon from "@/components/LogoIcon";
import { LS } from "@/lib/storage-keys";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [beniHatirla, setBeniHatirla] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const rememberedIdentifier = localStorage.getItem(LS.LOGIN_IDENTIFIER);
      if (!rememberedIdentifier) return;
      setEmail(rememberedIdentifier);
      setBeniHatirla(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function handleRememberChange(checked: boolean) {
    setBeniHatirla(checked);
    if (!checked) localStorage.removeItem(LS.LOGIN_IDENTIFIER);
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const loginIdentifier = email.trim();
    // Giris SUNUCUDA yapilir: kullanici adi -> e-posta cozumlemesi service role ile olur,
    // e-posta istemciye hic donmez (eski anon RPC'si e-posta sizdiriyordu).
    try {
      const res = await fetch("/api/giris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginIdentifier, password }),
      });
      const veri = await res.json();
      if (!res.ok || !veri.access_token) {
        setError(veri.error || "E-posta/kullanıcı adı veya şifre hatalı.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: veri.access_token,
        refresh_token: veri.refresh_token,
      });
      if (error) {
        setError("Oturum başlatılamadı. Lütfen tekrar deneyin.");
        setLoading(false);
        return;
      }
      if (beniHatirla) localStorage.setItem(LS.LOGIN_IDENTIFIER, loginIdentifier);
      else localStorage.removeItem(LS.LOGIN_IDENTIFIER);
      router.push("/dashboard");
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  }

  const features = [
    { title: "Akıllı Analizler", desc: "Yapay zeka destekli analizler ile potansiyel fırsatları keşfedin." },
    { title: "Gecikmeli Veri Şeffaflığı", desc: "Piyasa verilerinde gecikme bilgisini görün, analizleri bu bağlamla okuyun." },
    { title: "Güvenli ve Kişisel", desc: "Portföyünüz ve takip listeniz hesabınıza özel tutulur." },
  ];

  return (
    <div className="login-shell" style={{ minHeight: "100vh", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowX: "hidden", boxSizing: "border-box" }}>
      <style>{`
        @media (max-width: 768px) {
          .login-shell { padding: 16px !important; }
          .login-grid { grid-template-columns: minmax(0, 1fr) !important; width: 100% !important; max-width: 360px !important; }
          .login-left { display: none !important; }
          .login-right { padding: 36px 24px !important; }
          .login-grid,
          .login-right,
          .login-form,
          .login-field {
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .login-remember-row {
            align-items: flex-start !important;
          }
        }
        @media (max-width: 480px) {
          .login-right { padding: 32px 20px !important; }
        }
      `}</style>
      <div className="login-grid" style={{ width: "100%", maxWidth: 900, display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(59,130,246,0.14)", boxShadow: "0 24px 80px rgba(0,0,0,0.28), 0 0 70px rgba(59,130,246,0.06)" }}>

        {/* SOL KOLON */}
        <div className="login-left" style={{ background: "linear-gradient(160deg, #0F1C2E 0%, #0B1220 100%)", padding: "40px 40px 36px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid rgba(59,130,246,0.1)" }}>

          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <LogoIcon size={32} />
            <span style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9" }}>
              para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#334155" }}>.com</span>
            </span>
          </Link>

          <div style={{ margin: "36px 0 28px" }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: "#F8FAFC", lineHeight: 1.18, marginBottom: 12 }}>
              Veriye dayalı kararlar,<br />
              <span style={{ color: "#3B82F6" }}>güçlü yatırımlar.</span>
            </h1>
            <p style={{ fontSize: 14, color: "#8493A8", lineHeight: 1.65, margin: 0 }}>
              BIST odaklı yapay zeka destekli analizler, 15 dakika gecikmeli veri şeffaflığı ve akıllı yatırım araçları.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 26 }}>
            {features.map((f) => (
              <div key={f.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: "rgba(59,130,246,0.09)", border: "1px solid rgba(59,130,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 15, height: 15, borderRadius: 4, background: "linear-gradient(135deg, #60A5FA, #1D4ED8)" }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", margin: "0 0 3px" }}>{f.title}</p>
                  <p style={{ fontSize: 12, color: "#76859A", lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.16)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", margin: 0 }}>Pro özellikler yakında.</p>
              <p style={{ fontSize: 11, color: "#76859A", margin: "3px 0 0" }}>Gelişmiş analizler ve özel veriler.</p>
            </div>
            <Link href="/pro" style={{ flexShrink: 0, padding: "8px 16px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>Pro — Çok Yakında</Link>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
            {["HTTPS bağlantı", "Gizlilik politikası", "Kişisel takip alanı"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: "#3B82F6", fontSize: 12 }}>✓</span>
                <span style={{ fontSize: 11, color: "#5D6B80" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SAG KOLON */}
        <div className="login-right" style={{ background: "#0F1829", padding: "40px 40px 36px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0, boxSizing: "border-box" }}>

          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", margin: "0 auto 14px", background: "linear-gradient(135deg, rgba(30,64,175,0.34), rgba(59,130,246,0.28))", border: "1px solid rgba(59,130,246,0.34)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoIcon size={30} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC", margin: "0 0 6px" }}>Tekrar hoş geldiniz</h2>
            <p style={{ fontSize: 13, color: "#8493A8", margin: 0 }}>Hesabınıza giriş yaparak devam edin.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 15, width: "100%", minWidth: 0 }}>

            <div>
              <label htmlFor="login-email" style={{ fontSize: 12, color: "#A8B4C6", fontWeight: 600, display: "block", marginBottom: 8 }}>E-posta veya kullanıcı adı</label>
              <div className="login-field" style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 10, padding: "0 14px", height: 44, width: "100%", boxSizing: "border-box" }}>
                <span style={{ color: "#65748A" }}>✉</span>
                <input id="login-email" autoComplete="username" type="text" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@email.com veya kullanici_adi"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#F1F5F9", minWidth: 0 }} />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" style={{ fontSize: 12, color: "#A8B4C6", fontWeight: 600, display: "block", marginBottom: 8 }}>Şifre</label>
              <div className="login-field" style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 10, padding: "0 14px", height: 44, width: "100%", boxSizing: "border-box" }}>
                <span style={{ color: "#65748A" }}>🔒</span>
                <input id="login-password" autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••••"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#F1F5F9", minWidth: 0 }} />
                <button type="button" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#65748A", padding: 0, lineHeight: 1 }}>
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="login-remember-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: "1 1 190px", minWidth: 0 }}>
                <input
                  type="checkbox"
                  checked={beniHatirla}
                  onChange={(e) => handleRememberChange(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: "#3B82F6" }}
                />
                <span style={{ fontSize: 12, color: "#8493A8", lineHeight: 1.35 }}>E-posta/kullanıcı adımı hatırla</span>
              </label>
              <Link href="/forgot-password" style={{ fontSize: 12, color: "#3B82F6", textDecoration: "none", whiteSpace: "nowrap" }}>Şifremi unuttum?</Link>
            </div>

            {error && (
              <div role="alert" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: "#EF4444" }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ height: 44, background: loading ? "#1E3A6E" : "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontSize: 11, color: "#334155" }}>veya</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            <button type="button" onClick={handleGoogleLogin} style={{ height: 44, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E2E8F0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Google ile giriş yap
            </button>


          </form>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 22, fontSize: 12, color: "#5D6B80" }}>
            <span>Hesabın yok mu? <Link href="/register" style={{ color: "#3B82F6", textDecoration: "none", fontWeight: 700 }}>Kayıt ol</Link></span>
            <span style={{ color: "#334155" }}>•</span>
            <Link href="/" style={{ color: "#94A3B8", textDecoration: "none", fontWeight: 600 }}>Ana sayfaya dön</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
