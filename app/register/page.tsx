"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/components/lib/supabase";
import AuthShell from "@/components/AuthShell";
import { ArrowRight, Eye, EyeOff, Mail } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sozlesmeOnay, setSozlesmeOnay] = useState(false);
  const [modalIcerik, setModalIcerik] = useState<{baslik: string; icerik: string} | null>(null);
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
    if (!sozlesmeOnay) { setError("Devam etmek için kullanım şartlarını ve gizlilik politikasını kabul etmelisiniz."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, username } },
    });
    if (error) {
      const mesaj = typeof error.message === "string" ? error.message : "";
      if (mesaj.includes("already registered") || mesaj.includes("already been registered")) {
        setError("Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.");
      } else {
        setError(mesaj && mesaj !== "{}"
          ? `Kayıt sırasında hata oluştu: ${mesaj}`
          : "Kayıt tamamlanamadı. Lütfen farklı bir e-posta adresiyle tekrar deneyin.");
      }
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  const KULLANIM = `Kullanım Şartları\n\nParaKonuşur yatırım danışmanlığı hizmeti sunmamaktadır. Platform içerikleri yalnızca bilgilendirme amaçlıdır ve yatırım tavsiyesi niteliği taşımamaktadır.\n\nKullanıcı Yükümlülükleri\nPlatforma yalnızca kişisel ve yasal amaçlarla erişmek, hesap bilgilerinizi gizli tutmak, platformu otomatik araçlarla kullanmamak, sistemlere zarar verecek eylemlerden kaçınmak ve platform içeriklerini izinsiz kopyalamak veya dağıtmamak.\n\nSorumluluk Sınırlaması\nParaKonuşur; platform kullanımından, sunulan analizlere dayanılarak alınan yatırım kararlarından veya veri gecikmelerinden kaynaklanabilecek zararlardan sorumlu tutulamaz.\n\nVeri Doğruluğu\nPlatformda sunulan finansal veriler 15 dakika gecikmeli olabilir. Yatırım kararlarınızda resmi kaynaklara başvurmanızı tavsiye ederiz.\n\nUygulanacak Hukuk\nBu şartlar Türkiye Cumhuriyeti hukukuna tabidir.`;

  const GIZLILIK = `Gizlilik Politikası\n\nTopladığımız Veriler\nKayıt sırasında ad, soyad ve e-posta adresinizi alırız. Portföy ve izleme listesi oluşturduğunuzda ilgili hisse bilgilerini saklarız. IP adresi, tarayıcı türü ve oturum bilgileri teknik altyapımız tarafından otomatik olarak kaydedilebilir.\n\nVerilerin Kullanımı\nVerileriniz hesabınızı yönetmek, yapay zeka destekli analiz hizmetlerini sunmak, güvenliği sağlamak ve yasal yükümlülükleri yerine getirmek amacıyla kullanılır.\n\nVeri Güvenliği\nVerileriniz Supabase altyapısında şifrelenmiş olarak saklanmaktadır. Şifreler hiçbir zaman düz metin olarak tutulmaz.\n\nÜçüncü Taraflar\nSupabase, Vercel, Anthropic ve Resend hizmetleri kullanılmaktadır. Bu sağlayıcıların kendi gizlilik politikaları mevcuttur.\n\nVeri Silme\nHesabınızı sildiğinizde kişisel verileriniz 30 gün içinde kalıcı olarak silinir.\n\nİletişim\nsupport@parakonusur.com`;

  const fieldClass = "h-[52px] w-full min-w-0 rounded-lg border border-slate-600/70 bg-white/[0.025] px-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-blue-400";
  return (
    <AuthShell>
      <section aria-labelledby="register-title" className="order-1 mx-auto w-full max-w-[464px] min-w-0 lg:order-2">
        {success ? (
          <div role="status">
            <Mail size={32} className="mb-6 text-blue-400" aria-hidden="true" />
            <h2 id="register-title" className="font-[family-name:var(--font-geist)] text-3xl font-medium tracking-tight">E-postanı doğrula.</h2>
            <p className="mt-4 break-words text-base leading-7 text-slate-300">{email} adresine doğrulama linki gönderdik. Hesabını etkinleştirmek için e-postanı kontrol et.</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">E-postayı göremiyorsan spam klasörüne de bakabilirsin.</p>
            <Link href="/login" className="mt-8 inline-flex min-h-[52px] items-center gap-3 rounded-lg bg-blue-600 px-6 font-semibold text-white hover:bg-blue-500">Giriş sayfasına dön <ArrowRight size={20} /></Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs tracking-[0.16em] text-slate-300">ÜCRETSİZ HESAP OLUŞTUR</p>
            <h2 id="register-title" className="font-[family-name:var(--font-geist)] text-[30px] font-medium leading-tight tracking-tight sm:text-[34px]">Büyük resmi görmeye başla.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">Kişisel çalışma alanını oluştur. Kart bilgisi gerekmez.</p>
            <form onSubmit={handleRegister} aria-busy={loading} className="mt-8 flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
                <div className="min-w-0"><label htmlFor="register-fullName" className="mb-2 block text-sm text-slate-200">Ad soyad</label><input id="register-fullName" name="name" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Adın soyadın" className={fieldClass} /></div>
                <div className="min-w-0"><label htmlFor="register-username" className="mb-2 block text-sm text-slate-200">Kullanıcı adı</label><input id="register-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} required placeholder="kullanici_adi" className={fieldClass} /></div>
              </div>
              <div><label htmlFor="register-email" className="mb-2 block text-sm text-slate-200">E-posta</label><input id="register-email" name="email" autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ornek@email.com" className={fieldClass} /></div>
              <div>
                <label htmlFor="register-password" className="mb-2 block text-sm text-slate-200">Şifre</label>
                <div className="relative"><input id="register-password" name="password" autoComplete="new-password" aria-describedby="password-help" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••••••" className={`${fieldClass} pr-14`} /><button type="button" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-md text-slate-300 hover:text-white">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
                <p id="password-help" className="mt-2 text-xs leading-5 text-slate-400">En az 6 karakter, 1 büyük harf ve 1 rakam.</p>
              </div>
              {error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/5 px-4 py-3 text-sm leading-6 text-red-300">{error}</p>}
              <div className="flex items-start gap-3">
                <input type="checkbox" id="sozlesme" checked={sozlesmeOnay} onChange={e => setSozlesmeOnay(e.target.checked)} className="mt-1 h-[18px] w-[18px] shrink-0 accent-blue-500" />
                <label htmlFor="sozlesme" className="text-xs leading-6 text-slate-400"><button type="button" onClick={() => setModalIcerik({ baslik: "Kullanım Şartları", icerik: "kullanim" })} className="text-blue-400 hover:text-blue-300">Kullanım Şartları</button> ve <button type="button" onClick={() => setModalIcerik({ baslik: "Gizlilik Politikası", icerik: "gizlilik" })} className="text-blue-400 hover:text-blue-300">Gizlilik Politikası</button>’nı okudum ve kabul ediyorum. Platformun yatırım tavsiyesi niteliği taşımadığını anlıyorum.</label>
              </div>
              <button type="submit" disabled={loading || !sozlesmeOnay} className="relative flex min-h-[54px] items-center justify-center rounded-lg bg-blue-600 px-12 text-base font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">{loading ? "Hesap oluşturuluyor…" : "Ücretsiz hesap oluştur"}<ArrowRight size={22} className="absolute right-5" aria-hidden="true" /></button>
            </form>
            <p className="mt-7 text-center text-sm text-slate-300">Zaten hesabın var mı? <Link href="/login" className="text-blue-400 hover:text-blue-300">Giriş yap</Link></p>
          </>
        )}
      </section>
      {modalIcerik && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setModalIcerik(null)}>
          <div style={{ background: "#0F1829", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 16, maxWidth: 560, width: "100%", maxHeight: "75vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(59,130,246,0.1)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9" }}>{modalIcerik.baslik}</h3>
              <button onClick={() => setModalIcerik(null)} style={{ background: "none", border: "none", color: "#64748B", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ overflowY: "auto", padding: "20px", flex: 1 }}>
              {(modalIcerik.icerik === "kullanim" ? KULLANIM : GIZLILIK).split("\n\n").map((paragraf, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  {paragraf.split("\n").map((satir, j) => (
                    <p key={j} style={{ fontSize: 13, color: j === 0 && i > 0 ? "#E2E8F0" : "#94A3B8", lineHeight: 1.7, fontWeight: j === 0 && i > 0 ? 600 : 400 }}>{satir}</p>
                  ))}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </AuthShell>
  );
}
