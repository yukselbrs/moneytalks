"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/components/lib/supabase";

const PKMark = () => (
  <svg width="36" height="36" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg" aria-label="ParaKonusur mark">
    <defs>
      <linearGradient id="navGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="55%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#1E40AF" />
      </linearGradient>
      <linearGradient id="navGradSoft" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.25" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="256" height="256" rx="48" fill="#0B1220" stroke="rgba(59,130,246,0.18)" strokeWidth="0.5" />
    <rect x="70" y="170" width="18" height="30" rx="3" fill="url(#navGradSoft)" />
    <rect x="70" y="130" width="18" height="70" rx="3" fill="url(#navGrad)" />
    <rect x="94" y="110" width="18" height="90" rx="3" fill="url(#navGrad)" />
    <path d="M112 110 Q 180 110 180 140 Q 180 170 122 170" fill="none" stroke="url(#navGrad)" strokeWidth="18" strokeLinecap="round" />
    <circle cx="180" cy="92" r="7" fill="#60A5FA" />
    <circle cx="180" cy="92" r="14" fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeOpacity="0.5" />
  </svg>
);

const navLinks = [
  { label: "Nasıl Çalışır", href: "/#nasil-calisir" },
  { label: "Özellikler", href: "/#ozellikler" },
  { label: "Kapsam", href: "/#kapsam" },
  { label: "Blog", href: "/blog" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }

  const fullName = user?.user_metadata?.full_name || "";
  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() || "");
  const logoHref = user ? "/dashboard" : "/";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled || user ? "rgba(11,18,32,0.92)" : "transparent",
        backdropFilter: scrolled || user ? "blur(16px)" : "none",
        borderBottom: scrolled || user ? "1px solid rgba(59,130,246,0.1)" : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href={logoHref} className="flex items-center gap-3 group">
          <PKMark />
          <div className="flex flex-col leading-none">
            <span
              className="text-[15px] font-medium tracking-tight"
              style={{ color: "#F8FAFC", fontFamily: "var(--font-manrope)" }}
            >
              parakonusur
              <span style={{ color: "#3B82F6" }}>.com</span>
            </span>
            <span className="text-[9px] tracking-[0.28em] mt-0.5" style={{ color: "#475569" }}>
              AI STOCK INTELLIGENCE
            </span>
          </div>
        </a>

        {/* Desktop center: navLinks sadece logout durumunda */}
        {!user && (
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        {/* Desktop right: kullanıcı durumuna göre */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <a
                href="/profile"
                className="flex items-center gap-2"
                style={{ textDecoration: "none" }}
                aria-label="Profil"
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "rgba(59,130,246,0.15)",
                    border: "1px solid rgba(59,130,246,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#3B82F6",
                    fontFamily: "var(--font-manrope)",
                  }}
                >
                  {initials}
                </div>
                <span className="text-sm" style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}>
                  {user.email}
                </span>
              </a>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-full text-sm font-medium"
                style={{ color: "#94A3B8", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", fontFamily: "var(--font-manrope)", cursor: "pointer" }}
              >
                Çıkış Yap
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="px-4 py-2 text-sm font-medium" style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}>Giriş Yap</a>
              <a href="/register" className="px-4 py-2 text-sm font-medium" style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}>Kayıt Ol</a>
              <a href="/#waitlist" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", fontFamily: "var(--font-manrope)", boxShadow: "0 0 0 1px rgba(59,130,246,0.3)" }}>Erken Erişim</a>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2"
          style={{ color: "#94A3B8" }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menü"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen ? (
        <div
          className="md:hidden px-6 pb-6 pt-2 flex flex-col gap-4"
          style={{ background: "rgba(11,18,32,0.98)", borderBottom: "1px solid rgba(59,130,246,0.1)" }}
        >
          {!user && navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium py-1"
              style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          {user ? (
            <>
              <a
                href="/profile"
                className="flex items-center gap-2 py-1"
                style={{ textDecoration: "none" }}
                onClick={() => setMenuOpen(false)}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "rgba(59,130,246,0.15)",
                    border: "1px solid rgba(59,130,246,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#3B82F6",
                    fontFamily: "var(--font-manrope)",
                  }}
                >
                  {initials}
                </div>
                <span className="text-sm" style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}>
                  {user.email}
                </span>
              </a>
              <a
                href="/dashboard"
                className="text-sm font-medium py-1"
                style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </a>
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="inline-flex justify-center items-center px-4 py-2.5 rounded-full text-sm font-medium"
                style={{ color: "#94A3B8", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", fontFamily: "var(--font-manrope)", cursor: "pointer" }}
              >
                Çıkış Yap
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="text-sm font-medium py-1" style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }} onClick={() => setMenuOpen(false)}>Giriş Yap</a>
              <a href="/register" className="text-sm font-medium py-1" style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }} onClick={() => setMenuOpen(false)}>Kayıt Ol</a>
              <a href="/#waitlist" className="inline-flex justify-center items-center px-4 py-2.5 rounded-full text-sm font-medium" style={{ background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", fontFamily: "var(--font-manrope)" }} onClick={() => setMenuOpen(false)}>Erken Erişim</a>
            </>
          )}
        </div>
      ) : null}
    </header>
  );
}
