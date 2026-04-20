"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
 

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
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
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-full max-w-md p-8 rounded-2xl bg-[#1E293B] border border-[#334155] text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h1 className="text-2xl font-bold text-white mb-2">E-postanı doğrula</h1>
          <p className="text-[#94A3B8]">
            {email} adresine doğrulama linki gönderdik. Lütfen e-postanı kontrol et.
          </p>
          <a href="/login" className="mt-6 inline-block text-[#3B82F6] hover:underline">
            Giriş sayfasına dön
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[#1E293B] border border-[#334155]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Kayıt Ol</h1>
          <p className="text-[#94A3B8] mt-2">Ücretsiz hesap oluştur</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">Ad Soyad</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-[#0F172A] border border-[#334155] text-white focus:outline-none focus:border-[#3B82F6]"
              placeholder="Adın Soyadın"
            />
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-[#0F172A] border border-[#334155] text-white focus:outline-none focus:border-[#3B82F6]"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg bg-[#0F172A] border border-[#334155] text-white focus:outline-none focus:border-[#3B82F6]"
              placeholder="En az 6 karakter"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#1E40AF] hover:bg-[#2563EB] text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
          </button>

          <p className="text-center text-[#94A3B8] text-sm">
            Zaten hesabın var mı?{" "}
            <a href="/login" className="text-[#3B82F6] hover:underline">
              Giriş yap
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}