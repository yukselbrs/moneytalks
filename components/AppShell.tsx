"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setFullName(session.user.user_metadata?.full_name || "");
        setUsername(session.user.user_metadata?.username || "");
        setEmail(session.user.email || "");
      }
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName = username || (email.includes("@") ? email.split("@")[0] : email);
  const initials = fullName
    ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : displayName.slice(0, 2).toUpperCase();

  const navItems = [
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
      label: "Dashboard", href: "/dashboard",
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
      label: "Analizler", href: "/analizler",
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
      label: "Izleme Listem", href: "/izleme",
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
      label: "Portfoy", href: "/portfoy",
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
      label: "Haberler", href: "/blog",
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#060C18", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <style>{`
        .sb-item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 12px; border-radius: 10px; cursor: pointer; text-decoration: none; transition: all 0.15s; font-size: 14px; font-weight: 500; }
        .sb-item:hover { background: rgba(255,255,255,0.05); }
        @media (max-width: 767px) {
          .sb-desktop { display: none !important; }
          .sb-main { margin-left: 0 !important; padding-bottom: 64px; }
          .sb-bottomnav { display: flex !important; }
        }
        @media (min-width: 768px) {
          .sb-bottomnav { display: none !important; }
        }
      `}</style>

      {/* Desktop Sidebar */}
      <div className="sb-desktop" style={{
        width: 220, background: "#070D1A",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        padding: "20px 12px", gap: 2,
        position: "fixed", top: 0, left: 0, height: "100vh",
        zIndex: 50, overflowY: "auto",
      }}>
        {/* Logo */}
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 20, padding: "0 4px" }}>
          <svg width="32" height="32" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA"/>
                <stop offset="100%" stopColor="#1E40AF"/>
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="256" height="256" rx="48" fill="#0B1220" stroke="rgba(59,130,246,0.3)" strokeWidth="2"/>
            <rect x="70" y="130" width="18" height="70" rx="3" fill="url(#g1)"/>
            <rect x="94" y="110" width="18" height="90" rx="3" fill="url(#g1)"/>
            <path d="M112 110 Q 180 110 180 140 Q 180 170 122 170" fill="none" stroke="url(#g1)" strokeWidth="18" strokeLinecap="round"/>
            <circle cx="180" cy="92" r="7" fill="#60A5FA"/>
          </svg>
          <span style={{ color: "#F8FAFC", fontSize: 16, fontWeight: 700, letterSpacing: "-0.4px" }}>
            para<span style={{ color: "#3B82F6" }}>konusur</span>
          </span>
        </a>

        {/* Nav Items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <a key={item.label} href={item.href} className="sb-item" style={{
              color: isActive ? "#fff" : "#64748B",
              background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
              border: isActive ? "1px solid rgba(59,130,246,0.2)" : "1px solid transparent",
            }}>
              <span style={{ color: isActive ? "#3B82F6" : "#475569", flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </a>
          );
        })}

        {/* AI Promo Kutusu */}
        <div style={{
          margin: "16px 0", borderRadius: 14,
          background: "linear-gradient(135deg, #0f1e3a 0%, #0a1628 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
          padding: "16px 14px", textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
          <p style={{ color: "#F8FAFC", fontSize: 13, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>
            Yapay Zeka Gucu Yatiriminizin Yaninda!
          </p>
          <p style={{ color: "#64748B", fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>
            AI destekli analizlerle akilli yatirim kararlari alin.
          </p>
          <a href="/hisse/THYAO" style={{
            display: "block", background: "linear-gradient(90deg, #2563EB, #3B82F6)",
            color: "#fff", fontSize: 12, fontWeight: 600,
            padding: "8px 12px", borderRadius: 8, textDecoration: "none",
          }}>
            Analiz Yap &gt;
          </a>
        </div>

        {/* Bottom */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
          <button className="sb-item" style={{ color: "#64748B", background: "none", border: "none", position: "relative" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Bildirimler
            <span style={{ marginLeft: "auto", background: "#3B82F6", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 6px" }}>3</span>
          </button>
          <button onClick={handleLogout} className="sb-item" style={{ color: "#64748B", background: "none", border: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Cikis Yap
          </button>
          <a href="/profile" className="sb-item" style={{ textDecoration: "none", color: "#64748B", marginTop: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#3B82F6", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>{displayName}</span>
              <span style={{ color: "#F97316", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em" }}>DEMO</span>
            </div>
            <svg style={{ marginLeft: "auto" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="sb-main" style={{ marginLeft: 220, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Topbar - sadece mobilde */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080F1E", position: "sticky", top: 0, zIndex: 40 }}>
          <a href="/" style={{ fontSize: 14, fontWeight: 600, color: "#F8FAFC", textDecoration: "none" }}>
            para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#1E293B" }}>.com</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#475569" }}>
              {new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "short", weekday: "short" })} · {new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span style={{ fontSize: 12, color: "#475569" }}>{displayName}</span>
          </div>
        </div>
        {children}
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="sb-bottomnav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(5,10,20,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)", padding: "0 8px",
        alignItems: "center", justifyContent: "space-around", height: 60,
      }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <a key={item.label} href={item.href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              textDecoration: "none", padding: "6px 10px", borderRadius: 8,
              color: isActive ? "#3B82F6" : "#334155",
              background: isActive ? "rgba(59,130,246,0.08)" : "transparent",
            }}>
              {item.icon}
              <span style={{ fontSize: 9, fontWeight: 500 }}>{item.label}</span>
            </a>
          );
        })}
        <a href="/profile" style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          textDecoration: "none", padding: "6px 10px", borderRadius: 8,
          color: pathname === "/profile" ? "#3B82F6" : "#334155",
        }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#3B82F6" }}>
            {initials}
          </div>
          <span style={{ fontSize: 9, fontWeight: 500 }}>Profil</span>
        </a>
      </nav>
    </div>
  );
}
