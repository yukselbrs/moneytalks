"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(11,18,32,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(59,130,246,0.1)" : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 group">
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

        <a
          href="/#waitlist"
          className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          style={{
            background: "linear-gradient(135deg, #1E40AF, #3B82F6)",
            color: "#F8FAFC",
            fontFamily: "var(--font-manrope)",
            boxShadow: "0 0 0 1px rgba(59,130,246,0.3)",
          }}
        >
          Erken Erişim
        </a>

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
          {navLinks.map((link) => (
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
          <a
            href="/#waitlist"
            className="inline-flex justify-center items-center px-4 py-2.5 rounded-full text-sm font-medium"
            style={{
              background: "linear-gradient(135deg, #1E40AF, #3B82F6)",
              color: "#F8FAFC",
              fontFamily: "var(--font-manrope)",
            }}
            onClick={() => setMenuOpen(false)}
          >
            Erken Erişim
          </a>
        </div>
      ) : null}
    </header>
  );
}
