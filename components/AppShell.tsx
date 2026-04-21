"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setEmail(session.user.email || "");
        setFullName(session.user.user_metadata?.full_name || "");
      }
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = fullName
    ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  const navItems = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
        </svg>
      ),
      label: "Analizler",
      href: "/analizler",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ),
      label: "İzleme",
      href: "/izleme",
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#060C18", fontFamily: "var(--font-manrope, sans-serif)" }}>
      {/* Sidebar */}
      <div style={{ width: 56, background: "#050A14", borderRight: "0.5px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 6, flexShrink: 0, position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 50 }}>
        {/* Logo */}
        <a href="/dashboard" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", marginBottom: 12, flexShrink: 0 }}>
          <svg width="40" height="40" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA"/>
                <stop offset="55%" stopColor="#3B82F6"/>
                <stop offset="100%" stopColor="#1E40AF"/>
              </linearGradient>
              <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35"/>
                <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.25"/>
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="256" height="256" rx="48" fill="#0B1220" stroke="rgba(59,130,246,0.3)" strokeWidth="2"/>
            <rect x="70" y="170" width="18" height="30" rx="3" fill="url(#g2)"/>
            <rect x="70" y="130" width="18" height="70" rx="3" fill="url(#g1)"/>
            <rect x="94" y="110" width="18" height="90" rx="3" fill="url(#g1)"/>
            <path d="M112 110 Q 180 110 180 140 Q 180 170 122 170" fill="none" stroke="url(#g1)" strokeWidth="18" strokeLinecap="round"/>
            <circle cx="180" cy="92" r="7" fill="#60A5FA"/>
          </svg>
        </a>

        {/* Geri butonu - hisse sayfasında göster */}
        {pathname.startsWith("/hisse/") && (
          <a href="/dashboard" title="Dashboard'a Dön"
            style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", textDecoration: "none", color: "#3B82F6", background: "rgba(59,130,246,0.1)", marginBottom: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="m12 5-7 7 7 7"/>
            </svg>
          </a>
        )}
        {/* Nav Items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <a key={item.label} href={item.href} title={item.label}
              style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", textDecoration: "none", color: isActive ? "#3B82F6" : "#1E3A5F", background: isActive ? "rgba(59,130,246,0.15)" : "transparent", transition: "all 0.15s" }}>
              {item.icon}
            </a>
          );
        })}

        {/* Bottom */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <button title="Bildirimler" style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#334155" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          <button onClick={handleLogout} title="Çıkış Yap" style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#334155" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
          <a href="/profile" title="Profil" style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "0.5px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#3B82F6", textDecoration: "none" }}>
            {initials}
          </a>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 56, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
        <div style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080F1E", position: "sticky", top: 0, zIndex: 40 }}>
          <a href="/" style={{ fontSize: 14, fontWeight: 500, color: "#F8FAFC", textDecoration: "none", letterSpacing: "-0.3px" }}>
            para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#1E293B" }}>.com</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#F97316", letterSpacing: "0.06em" }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#F97316" }} />
              DEMO
            </div>
            <span style={{ fontSize: 11, color: "#1E293B" }}>
              {new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "short", weekday: "short" })} · {new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span style={{ fontSize: 12, color: "#475569" }}>{email}</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
