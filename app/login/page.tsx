"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <a href="/" style={{ fontSize: 18, fontWeight: 500, color: "#F8FAFC", textDecoration: "none" }}>
            para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#1E293B" }}>.com</span>
          </a>
          <p style={{ fontSize: 13, color: "#334155", marginTop: 8 }}>Hesabına giriş yap</p>
        </div>

        <div style={{ border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12, padding: "28px 24px", background: "rgba(255,255,255,0.02)" }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "#475569", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>E-posta veya Kullanıcı Adı</label>
              <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@email.com veya kullanici_adi"
                style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(59,130,246,0.2)", outline: "none", fontSize: 14, color: "#94A3B8", padding: "6px 0" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#475569", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Şifre</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(59,130,246,0.2)", outline: "none", fontSize: 14, color: "#94A3B8", padding: "6px 0" }} />
            </div>
            {error && <p style={{ fontSize: 12, color: "#E24B4A" }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ marginTop: 8, height: 40, background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 20 }}>
          Hesabın yok mu?{" "}
          <a href="/register" style={{ color: "#3B82F6", textDecoration: "none" }}>Kayıt ol</a>
        </p>
      </div>
    </div>
  );
}
