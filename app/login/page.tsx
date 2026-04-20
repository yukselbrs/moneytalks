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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("E-posta veya şifre hatalı.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[#1E293B] border border-[#334155]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Giriş Yap</h1>
          <p className="text-[#94A3B8] mt-2">ParaKonusur hesabına giriş yap</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
              className="w-full px-4 py-3 rounded-lg bg-[#0F172A] border border-[#334155] text-white focus:outline-none focus:border-[#3B82F6]"
              placeholder="••••••••"
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
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          <p className="text-center text-[#94A3B8] text-sm">
            Hesabın yok mu?{" "}
            <a href="/register" className="text-[#3B82F6] hover:underline">
              Kayıt ol
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}