"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/components/lib/supabase";
import AuthShell from "@/components/AuthShell";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
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

  return <AuthShell>
        <section aria-labelledby="login-form-title" className="order-1 mx-auto w-full max-w-[464px] min-w-0 lg:order-2">
          <p className="mb-3 text-xs tracking-[0.16em] text-slate-300">HESABINA GİRİŞ YAP</p>
          <h2 id="login-form-title" className="font-[family-name:var(--font-geist)] text-[30px] font-medium leading-tight tracking-tight sm:text-[34px]">Tekrar hoş geldin.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">Piyasayı kaldığın yerden takip et.</p>

          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="mt-8 flex min-h-[52px] w-full items-center justify-center gap-3 rounded-lg border border-slate-600/70 bg-white/[0.025] px-4 text-sm font-medium transition hover:border-slate-400 hover:bg-white/5 disabled:opacity-50">
            <svg aria-hidden="true" width="21" height="21" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.8 6-15.1Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2c-1.8 1.2-4.1 1.9-6.8 1.9-5.3 0-9.9-3.6-11.5-8.4H5.6v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.5 27.4a12 12 0 0 1 0-7.7v-5.3H5.6a20 20 0 0 0 0 18.3l6.9-5.3Z"/><path fill="#EA4335" d="M24 11.2c3 0 5.7 1 7.8 3l5.9-5.9A19.7 19.7 0 0 0 24 3 20.4 20.4 0 0 0 5.6 14.4l6.9 5.3c1.6-4.9 6.2-8.5 11.5-8.5Z"/></svg>
            Google ile devam et
          </button>
          <div className="my-7 flex items-center gap-5 text-sm text-slate-400" aria-hidden="true"><span className="h-px flex-1 bg-slate-700" />veya<span className="h-px flex-1 bg-slate-700" /></div>
          <form onSubmit={handleLogin} className="flex flex-col gap-5" aria-busy={loading}>
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm text-slate-200">E-posta veya kullanıcı adı</label>
              <input id="login-email" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} type="text" value={email} onChange={e => setEmail(e.target.value)} required placeholder="E-posta veya kullanıcı adın" className="h-[52px] w-full min-w-0 rounded-lg border border-slate-600/70 bg-white/[0.025] px-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-blue-400" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="login-password" className="text-sm text-slate-200">Şifre</label><Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 sm:text-sm">Şifremi unuttum</Link></div>
              <div className="relative">
                <input id="login-password" name="password" autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••••••" className="h-[52px] w-full min-w-0 rounded-lg border border-slate-600/70 bg-white/[0.025] py-3 pl-4 pr-14 text-base text-slate-100 placeholder:text-slate-500 focus:border-blue-400" />
                <button type="button" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-md text-slate-300 hover:text-white">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
            </div>
            <label className="flex min-h-8 cursor-pointer items-center gap-3 text-sm text-slate-400"><input type="checkbox" checked={beniHatirla} onChange={e => handleRememberChange(e.target.checked)} className="h-[18px] w-[18px] accent-blue-500" />Kullanıcı adımı hatırla</label>
            {error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/5 px-4 py-3 text-sm leading-6 text-red-300">{error}</p>}
            <button type="submit" disabled={loading} className="relative mt-1 flex min-h-[54px] items-center justify-center rounded-lg bg-blue-600 px-12 text-base font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60">{loading ? "Giriş yapılıyor…" : "Giriş yap"}<ArrowRight size={22} className="absolute right-5" aria-hidden="true" /></button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-300">Yeni misin? <Link href="/register" className="text-blue-400 hover:text-blue-300">Ücretsiz hesap aç</Link></p>
        </section>
  </AuthShell>;
}
