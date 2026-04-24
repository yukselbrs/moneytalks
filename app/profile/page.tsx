"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import Navbar from "@/components/Navbar";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setEmail(session.user.email || "");
      setFullName(session.user.user_metadata?.full_name || "");
      setLoading(false);
    });
  }, [router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMessage(""); setError("");
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (error) setError(error.message);
    else setMessage("Bilgiler güncellendi.");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(""); setError("");
    if (newPassword !== newPasswordConfirm) { setError("Yeni şifreler eşleşmiyor."); return; }
    if (newPassword.length < 6) { setError("Şifre en az 6 karakter olmalıdır."); return; }
    if (!/[A-Z]/.test(newPassword)) { setError("Şifre en az bir büyük harf içermelidir."); return; }
    if (!/[0-9]/.test(newPassword)) { setError("Şifre en az bir rakam içermelidir."); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setError(error.message);
    else { setMessage("Şifre güncellendi."); setNewPassword(""); setNewPasswordConfirm(""); }
  }

  async function handleDeleteAccount() {
    setError("");
    setMessage("Hesabınızı silmek için hello@parakonusur.com adresine yazın.");
  }

  const initials = fullName ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : email.slice(0, 2).toUpperCase();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1220" }}>
      <p style={{ color: "#475569", fontSize: 14 }}>Yükleniyor...</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <Navbar />

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "100px 24px 36px" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 500, color: "#3B82F6", marginBottom: 24 }}>
          {initials}
        </div>

        {message && <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.2)", borderRadius: 8, fontSize: 12, color: "#1D9E75" }}>{message}</div>}
        {error && <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.2)", borderRadius: 8, fontSize: 12, color: "#E24B4A" }}>{error}</div>}

        {/* Hesap Bilgileri */}
        <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Hesap Bilgileri</p>
        <form onSubmit={handleSaveProfile}>
          <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Ad Soyad</div>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Adın Soyadın"
                style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(59,130,246,0.2)", outline: "none", fontSize: 13, color: "#94A3B8", padding: "4px 0", width: "100%" }} />
            </div>
            <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>E-posta</div>
              <input value={email} disabled
                style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(59,130,246,0.1)", outline: "none", fontSize: 13, color: "#334155", padding: "4px 0", width: "100%" }} />
            </div>
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={{ height: 34, padding: "0 18px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Kaydet</button>
            </div>
          </div>
        </form>

        {/* Şifre Değiştir */}
        <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Şifre Değiştir</p>
        <form onSubmit={handleChangePassword}>
          <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
            {[
              { label: "Yeni Şifre", value: newPassword, setter: setNewPassword },
              { label: "Yeni Şifre Tekrar", value: newPasswordConfirm, setter: setNewPasswordConfirm },
            ].map((field, i, arr) => (
              <div key={field.label} style={{ padding: "13px 16px", borderBottom: i < arr.length - 1 ? "1px solid rgba(59,130,246,0.06)" : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{field.label}</div>
                <input type="password" value={field.value} onChange={(e) => field.setter(e.target.value)} placeholder="••••••••"
                  style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(59,130,246,0.2)", outline: "none", fontSize: 13, color: "#94A3B8", padding: "4px 0", width: "100%" }} />
              </div>
            ))}
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={{ height: 34, padding: "0 18px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Güncelle</button>
            </div>
          </div>
        </form>

        {/* Tehlikeli Alan */}
        <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Tehlikeli Alan</p>
        <div style={{ border: "1px solid rgba(226,75,74,0.15)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px" }}>
            <div>
              <div style={{ fontSize: 13, color: "#E2E8F0" }}>Hesabı Sil</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Bu işlem geri alınamaz.</div>
            </div>
            <button onClick={handleDeleteAccount} style={{ height: 34, padding: "0 14px", background: "rgba(226,75,74,0.1)", color: "#E24B4A", border: "1px solid rgba(226,75,74,0.2)", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              Hesabı Sil
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
