"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/components/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import LogoIcon from "@/components/LogoIcon";
import { BLOG_AKTIF } from "@/lib/ozellik-bayraklari";

const navLinks = [
  { label: "Nasıl Çalışır", href: "/#nasil-calisir" },
  { label: "Özellikler", href: "/#ozellikler" },
  { label: "Kapsam", href: "/#kapsam" },
  ...(BLOG_AKTIF ? [{ label: "Blog", href: "/blog" }] : []),   // gizli: lib/ozellik-bayraklari
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); if (pathname === "/") router.push("/dashboard"); }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

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
        <Link href={logoHref} className="flex items-center gap-3 group">
          <LogoIcon size={36} />
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
        </Link>

        {/* Desktop center: navLinks sadece logout durumunda */}
        {!user && (
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Desktop right: kullanıcı durumuna göre */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
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
              </Link>
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
              <Link href="/login" className="px-4 py-2 text-sm font-medium" style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}>Giriş Yap</Link>
              <Link href="/register" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", fontFamily: "var(--font-manrope)", boxShadow: "0 0 0 1px rgba(59,130,246,0.3)" }}>Ücretsiz Kayıt Ol</Link>
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
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium py-1"
              style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
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
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium py-1"
                style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
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
              <Link href="/login" className="text-sm font-medium py-1" style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }} onClick={() => setMenuOpen(false)}>Giriş Yap</Link>
              <Link href="/register" className="inline-flex justify-center items-center px-4 py-2.5 rounded-full text-sm font-medium" style={{ background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#F8FAFC", fontFamily: "var(--font-manrope)" }} onClick={() => setMenuOpen(false)}>Ücretsiz Kayıt Ol</Link>
            </>
          )}
        </div>
      ) : null}
    </header>
  );
}
