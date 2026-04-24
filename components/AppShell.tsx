"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setEmail(session.user.email || "");
        setFullName(session.user.user_metadata?.full_name || "");
        setEmail(session.user.user_metadata?.username || session.user.email || "");
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
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          <line x1="12" y1="12" x2="12" y2="16"/>
          <line x1="10" y1="14" x2="14" y2="14"/>
        </svg>
      ),
      label: "Portföy",
      href: "/portfoy",
    },
  ];

  const sidebarW = expanded ? 180 : 56;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#060C18", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <style>{`
        .sb-label { opacity: 0; transform: translateX(-8px); transition: opacity 0.2s, transform 0.2s; white-space: nowrap; font-size: 13px; font-weight: 500; }
        .sb-expanded .sb-label { opacity: 1; transform: translateX(0); }
        .sb-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 0 10px; height: 36px; border-radius: 8px; cursor: pointer; text-decoration: none; transition: all 0.15s; }
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
      <div
        className={`sb-desktop${expanded ? " sb-expanded" : ""}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{ width: sidebarW, background: "#050A14", borderRight: "0.5px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "16px 8px", gap: 4, flexShrink: 0, position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 50, transition: "width 0.2s ease", overflow: "hidden" }}
      >
        {/* Logo */}
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 16, padding: "0 2px" }}>
          <svg width="36" height="36" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
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
          <span className="sb-label" style={{ color: "#F8FAFC", fontSize: 14, fontWeight: 600, letterSpacing: "-0.3px" }}>para<span style={{ color: "#3B82F6" }}>konusur</span></span>
        </a>

        {/* Geri butonu - hisse sayfasında */}
        {pathname.startsWith("/hisse/") && (
          <a href="/dashboard" className="sb-item"
            style={{ color: "#3B82F6", background: "rgba(59,130,246,0.1)", marginBottom: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M19 12H5"/><path d="m12 5-7 7 7 7"/>
            </svg>
            <span className="sb-label">Dashboard</span>
          </a>
        )}

        {/* Nav Items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <a key={item.label} href={item.href} className="sb-item"
              style={{ color: isActive ? "#3B82F6" : "#1E3A5F", background: isActive ? "rgba(59,130,246,0.12)" : "transparent" }}>
              <div style={{ flexShrink: 0 }}>{item.icon}</div>
              <span className="sb-label" style={{ color: isActive ? "#3B82F6" : "#64748B" }}>{item.label}</span>
            </a>
          );
        })}

        {/* Bottom */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
          <button className="sb-item" title="Bildirimler"
            style={{ color: "#1E3A5F", background: "none", border: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="sb-label" style={{ color: "#64748B" }}>Bildirimler</span>
          </button>
          <button onClick={handleLogout} className="sb-item" title="Çıkış Yap"
            style={{ color: "#1E3A5F", background: "none", border: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="sb-label" style={{ color: "#64748B" }}>Çıkış Yap</span>
          </button>
          <a href="/profile" className="sb-item" title="Profil" style={{ textDecoration: "none", color: "#1E3A5F" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "0.5px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#3B82F6", flexShrink: 0 }}>
              {initials}
            </div>
            <span className="sb-label" style={{ color: "#64748B" }}>{email.includes("@") ? email.split("@")[0] : email}</span>
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="sb-main" style={{ marginLeft: 56, flex: 1, display: "flex", flexDirection: "column", transition: "margin-left 0.2s ease" }}>
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

      {/* Mobile Bottom Nav */}
      <nav className="sb-bottomnav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(5,10,20,0.97)", borderTop: "0.5px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)", padding: "0 8px",
        alignItems: "center", justifyContent: "space-around", height: 60,
      }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <a key={item.label} href={item.href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              textDecoration: "none", padding: "6px 12px", borderRadius: 8,
              color: isActive ? "#3B82F6" : "#334155",
              background: isActive ? "rgba(59,130,246,0.08)" : "transparent",
              minWidth: 52,
            }}>
              {item.icon}
              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.02em" }}>{item.label}</span>
            </a>
          );
        })}
        <a href="/profile" style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          textDecoration: "none", padding: "6px 12px", borderRadius: 8,
          color: pathname === "/profile" ? "#3B82F6" : "#334155",
          background: pathname === "/profile" ? "rgba(59,130,246,0.08)" : "transparent",
          minWidth: 52,
        }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "0.5px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: "#3B82F6" }}>
            {initials}
          </div>
          <span style={{ fontSize: 9, fontWeight: 500 }}>Profil</span>
        </a>
      </nav>
    </div>
  );
}
