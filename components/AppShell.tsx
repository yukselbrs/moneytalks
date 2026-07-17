"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/components/lib/supabase";
import LogoIcon from "@/components/LogoIcon";
import { LS } from "@/lib/storage-keys";

const NAV_ITEMS = [
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label: "Dashboard", href: "/dashboard" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>, label: "Portföy", href: "/portfoy" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>, label: "Analizler", href: "/analizler" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>, label: "Hisseler", href: "/hisseler" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v5c0 1.66 3.13 3 7 3s7-1.34 7-3V5"/><path d="M5 10v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5"/><path d="M5 15v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4"/></svg>, label: "Fonlar", href: "/hisseler?varlik=fon" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.4"/><path d="M5.5 9.5v.01M18.5 14.5v.01"/></svg>, label: "Döviz ve Kıymetli Maden", href: "/doviz-maden" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, label: "İzleme Listem", href: "/izleme" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, label: "Haberler", href: "/haberler" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>, label: "Blog", href: "/blog" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label: "Takvim", href: "/takvim" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/><line x1="7" y1="3.34" x2="4.22" y2="1.1"/><line x1="17" y1="3.34" x2="19.78" y2="1.1"/></svg>, label: "Alarmlar", href: "/alarmlar" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, label: "Bildirimler", href: "/bildirimler" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: "Pako AI", href: "/yapay-zeka" },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>, label: "VİOP Nedir?", href: "/viop-nedir" },
];

// 0:Dashboard 1:Portföy 2:Analizler 3:Hisseler 4:Fonlar 5:İzleme 6:Haberler 7:Blog 8:Takvim 9:Alarmlar 10:Bildirimler 11:PakoAI
const NAV_GROUPS: { label?: string; indices: number[] }[] = [
  { indices: [0] },
  { label: "PİYASA", indices: [3, 4, 5, 6] },
  { label: "KİŞİSEL", indices: [1, 2, 9] },
  { label: "KEŞFET", indices: [8, 7, 13, 10] },
];

function isNavActive(pathname: string, currentVarlik: string | null, href: string) {
  if (href === "/hisseler?varlik=fon") return pathname === "/hisseler" && currentVarlik === "fon";
  if (href === "/hisseler") return pathname === "/hisseler" && currentVarlik !== "fon";
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

function navVarlikForHref(href: string) {
  if (href === "/hisseler?varlik=fon") return "fon";
  if (href === "/hisseler") return null;
  return undefined;
}

function MoreMenu({ navItems, pathname, currentVarlik, setCurrentVarlik, handleLogout }: {
  navItems: { icon: React.ReactNode; label: string; href: string }[];
  pathname: string;
  currentVarlik: string | null;
  setCurrentVarlik: React.Dispatch<React.SetStateAction<string | null>>;
  handleLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const extraItems = navItems.filter(i => !["/dashboard","/hisseler","/izleme","/portfoy"].includes(i.href));
  return (
    <>
      <button onClick={() => setOpen(v => !v)} style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "6px 12px", borderRadius: 8, flex: 1, background: "none", border: "none", cursor: "pointer",
        color: open ? "#3B82F6" : "#475569",
        borderBottom: open ? "2px solid #3B82F6" : "2px solid transparent",
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
        <span style={{ fontSize: 9, fontWeight: open ? 700 : 500 }}>Daha Fazla</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 48 }} />
          <div style={{
            position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 49,
            background: "rgba(7,13,26,0.98)", borderTop: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(16px)", padding: "12px 16px 16px",
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            <p style={{ fontSize: 10, color: "#334155", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Diğer</p>
            {extraItems.map(item => {
              const isActive = isNavActive(pathname, currentVarlik, item.href);
              return (
                <Link key={item.label} href={item.href} onClick={() => {
                  const nextVarlik = navVarlikForHref(item.href);
                  if (nextVarlik !== undefined) setCurrentVarlik(nextVarlik);
                  setOpen(false);
                }} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10,
                  textDecoration: "none", color: isActive ? "#fff" : "#64748B",
                  background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
                }}>
                  <span style={{ color: isActive ? "#3B82F6" : "#475569" }}>{item.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                </Link>
              );
            })}
            <button onClick={() => { setOpen(false); handleLogout(); }} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10,
              background: "none", border: "none", cursor: "pointer", color: "#64748B", width: "100%",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Çıkış Yap</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}

function AvatarImage({ src, alt = "avatar" }: { src: string; alt?: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={32}
      height={32}
      unoptimized
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [fullName, setFullName] = useState("");
  const [tarihSaat, setTarihSaat] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS.SB_COLLAPSED) === "1" : false
  );
  const [currentVarlik, setCurrentVarlik] = useState<string | null>(null);
  const [tip, setTip] = useState<{ text: string; y: number } | null>(null);
  const [xu100, setXu100] = useState<{ value: string; change: string } | null>(null);

  const tipFromEl = (el: Element, text: string) => {
    const r = el.getBoundingClientRect();
    setTip({ text, y: r.top + r.height / 2 });
  };
  const showTip = (e: React.MouseEvent, text: string) => tipFromEl(e.currentTarget, text);
  const focusTip = (e: React.FocusEvent, text: string) => tipFromEl(e.currentTarget, text);

  function toggleCollapsed() {
    setCollapsed(v => {
      localStorage.setItem(LS.SB_COLLAPSED, v ? "0" : "1");
      return !v;
    });
  }

  const SB_W = collapsed ? 56 : 220;

  useEffect(() => {
    const guncelle = () => {
      const d = new Date();
      const tarih = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", weekday: "short" });
      const saat = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
      setTarihSaat(`${tarih} · ${saat}`);
    };
    guncelle();
    const interval = setInterval(guncelle, 60000);
    fetch("/api/xu").then(r => r.json()).then(d => { if (d.xu100) setXu100(d.xu100); }).catch(() => {});
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      setCurrentVarlik(new URLSearchParams(window.location.search).get("varlik"));
    });
  }, [pathname]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setFullName(session.user.user_metadata?.full_name || "");
        setUsername(session.user.user_metadata?.username || "");
        setEmail(session.user.email || "");
        setAvatarUrl(session.user.user_metadata?.avatar_url || "");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setFullName(session.user.user_metadata?.full_name || "");
        setUsername(session.user.user_metadata?.username || "");
        setEmail(session.user.email || "");
        setAvatarUrl(session.user.user_metadata?.avatar_url || "");
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

  const navItems = NAV_ITEMS;
  const navGroups = NAV_GROUPS;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#060C18", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <style>{`
        .sb-item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 12px; border-radius: 10px; cursor: pointer; text-decoration: none; transition: background 0.15s; font-size: 14px; font-weight: 500; }
        .sb-item:hover { background: rgba(255,255,255,0.05); }
        .sb-nav-item { display: flex; align-items: center; border-radius: 8px; text-decoration: none; cursor: pointer; font-size: 13.5px; transition: background 0.12s; width: 100%; border: none; background: transparent; text-align: left; }
        .sb-nav-item:hover { background: rgba(255,255,255,0.045) !important; }
        .sb-nav-sep { height: 1px; background: rgba(255,255,255,0.045); margin: 6px 4px; }
        .sb-sidebar { transition: width 0.22s cubic-bezier(0.4,0,0.2,1); overflow: hidden; }
        @keyframes ai-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); } 50% { box-shadow: 0 0 10px 2px rgba(99,102,241,0.25); } }
        @keyframes ai-dot { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        .sb-ai-btn { display:flex; align-items:center; border-radius:10px; text-decoration:none; cursor:pointer; width:100%; border:none; text-align:left; transition:all 0.18s; position:relative; overflow:hidden; }
        .sb-ai-btn:hover { background:rgba(99,102,241,0.12) !important; animation:ai-pulse 1.5s ease-in-out infinite; }
        .sb-topbar { min-height: 44px; }
        .sb-topbar-logo { font-size: 14px; font-weight: 600; color: #F8FAFC; text-decoration: none; white-space: nowrap; }
        .sb-market-pill { display: flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 6px; min-width: 0; }
        .sb-market-value { font-size: 12px; font-weight: 700; color: #F1F5F9; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .sb-market-change { font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .sb-profile-avatar { width: 30px; height: 30px; border-radius: 50%; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); display: none; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #3B82F6; overflow: hidden; text-decoration: none; flex-shrink: 0; }
        @media (max-width: 767px) {
          .sb-desktop { display: none !important; }
          .sb-main { margin-left: 0 !important; width: 100vw !important; max-width: 100vw !important; padding-bottom: calc(72px + env(safe-area-inset-bottom)); overflow-x: hidden; }
          .sb-bottomnav { display: flex !important; }
          .sb-topbar { padding: 8px 14px !important; gap: 10px; }
          .sb-topbar-date { display: none !important; }
          .sb-topbar-logo { font-size: 13px !important; overflow: hidden; text-overflow: ellipsis; }
          .sb-topbar-actions { gap: 8px !important; min-width: 0; }
          .sb-market-pill { padding: 3px 7px !important; gap: 5px !important; max-width: 168px; }
          .sb-market-pill-label { font-size: 9px !important; }
          .sb-market-value { font-size: 11px !important; }
          .sb-market-change { font-size: 10px !important; }
          .sb-topbar-username { display: none !important; }
          .sb-profile-avatar { display: flex !important; }
          .sb-bottomnav { height: calc(64px + env(safe-area-inset-bottom)) !important; padding: 0 6px env(safe-area-inset-bottom) !important; }
          .sb-bottomnav a,
          .sb-bottomnav button { min-width: 0; padding-left: 6px !important; padding-right: 6px !important; }
        }
        @media (min-width: 768px) {
          .sb-bottomnav { display: none !important; }
        }
      `}</style>

      {/* Desktop Sidebar */}
      <div className="sb-desktop sb-sidebar" style={{
        width: SB_W, background: "#070D1A",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        padding: "20px 8px", gap: 2,
        position: "fixed", top: 0, left: 0, height: "100vh",
        zIndex: 50, overflowY: "auto", overflowX: "hidden",
      }}>
        <div style={{ position: "fixed", top: 0, left: 0, width: SB_W, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 50%, transparent 100%)", zIndex: 51 }} />
        {/* Logo + Toggle */}
        {collapsed ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Link href="/dashboard" style={{ display: "flex", textDecoration: "none" }}>
              <LogoIcon size={32} />
            </Link>
            <button onClick={toggleCollapsed} aria-label="Menüyü genişlet" onMouseEnter={e => showTip(e, "Genişlet")} onMouseLeave={() => setTip(null)} onFocus={e => focusTip(e, "Genişlet")} onBlur={() => setTip(null)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#475569", padding: "6px 0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", width: "100%",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <LogoIcon size={32} style={{ flexShrink: 0 }} />
              <span style={{ color: "#F8FAFC", fontSize: 16, fontWeight: 700, letterSpacing: "-0.4px", whiteSpace: "nowrap" }}>
                para<span style={{ color: "#3B82F6" }}>konusur</span>
              </span>
            </Link>
            <button onClick={toggleCollapsed} aria-label="Menüyü küçült" onMouseEnter={e => showTip(e, "Küçült")} onMouseLeave={() => setTip(null)} onFocus={e => focusTip(e, "Küçült")} onBlur={() => setTip(null)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#475569", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
          </div>
        )}

        {/* Nav Groups */}
        <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1 }}>
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <div className="sb-nav-sep" />}
              {!collapsed && group.label && (
                <div style={{ fontSize: 10, fontWeight: 700, color: "#2D3F55", letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px 12px 4px" }}>
                  {group.label}
                </div>
              )}
              {group.indices.map(idx => {
                const item = navItems[idx];
                const isActive = isNavActive(pathname, currentVarlik, item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      const nextVarlik = navVarlikForHref(item.href);
                      if (nextVarlik !== undefined) setCurrentVarlik(nextVarlik);
                    }}
                    className="sb-nav-item"
                    aria-label={item.label}
                    onMouseEnter={collapsed ? e => showTip(e, item.label) : undefined}
                    onMouseLeave={collapsed ? () => setTip(null) : undefined}
                    onFocus={collapsed ? e => focusTip(e, item.label) : undefined}
                    onBlur={collapsed ? () => setTip(null) : undefined}
                    style={{
                      gap: collapsed ? 0 : 10,
                      justifyContent: collapsed ? "center" : undefined,
                      padding: collapsed ? "9px 0" : `9px 10px 9px ${isActive ? "9px" : "12px"}`,
                      borderLeft: collapsed ? "none" : isActive ? "3px solid #3B82F6" : "3px solid transparent",
                      background: isActive ? "rgba(59,130,246,0.1)" : undefined,
                      color: isActive ? "#E2E8F0" : "#64748B",
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    <span style={{ color: isActive ? "#60A5FA" : "#3D5066", flexShrink: 0, display: "flex" }}>{item.icon}</span>
                    {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
                  </Link>
                );
              })}
              {/* AI Asistan — Dashboard'dan hemen sonra */}
              {gi === 0 && (() => {
                const isActive = pathname === "/yapay-zeka";
                return (
                  <Link
                    href="/yapay-zeka"
                    className="sb-ai-btn"
                    aria-label="Pako AI"
                    onMouseEnter={collapsed ? e => showTip(e, "Pako AI") : undefined}
                    onMouseLeave={collapsed ? () => setTip(null) : undefined}
                    onFocus={collapsed ? e => focusTip(e, "Pako AI") : undefined}
                    onBlur={collapsed ? () => setTip(null) : undefined}
                    style={{
                      marginTop: 6,
                      gap: collapsed ? 0 : 10,
                      justifyContent: collapsed ? "center" : undefined,
                      padding: collapsed ? "9px 0" : "9px 12px",
                      background: isActive
                        ? "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.15))"
                        : "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(59,130,246,0.05))",
                      animation: isActive ? "ai-pulse 2s ease-in-out infinite" : undefined,
                    }}
                  >
                    {/* İkon + canlı nokta */}
                    <span style={{ position: "relative", flexShrink: 0, display: "flex" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#A78BFA" : "#6366F1"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                      </svg>
                      <span style={{
                        position: "absolute", top: -2, right: -2,
                        width: 6, height: 6, borderRadius: "50%",
                        background: "#818CF8",
                        boxShadow: "0 0 6px 2px rgba(129,140,248,0.6)",
                        animation: "ai-dot 2s ease-in-out infinite",
                      }} />
                    </span>
                    {!collapsed && (
                      <span style={{
                        whiteSpace: "nowrap", fontWeight: 600, fontSize: 13.5,
                        background: "linear-gradient(90deg, #A78BFA, #60A5FA)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                      }}>
                        Pako AI
                      </span>
                    )}
                  </Link>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Pro Banner */}
        <div style={{ paddingBottom: 4 }}>
          {collapsed ? (
            <Link href="/pro" aria-label="Pro'ya Yükselt" onMouseEnter={e => showTip(e, "Pro'ya Yükselt")} onMouseLeave={() => setTip(null)} onFocus={e => focusTip(e, "Pro'ya Yükselt")} onBlur={() => setTip(null)}
              style={{ display: "flex", justifyContent: "center", padding: "10px 0", textDecoration: "none" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </Link>
          ) : (
            <div style={{ position: "relative", overflow: "hidden", borderRadius: 10, background: "linear-gradient(135deg, rgba(146,64,14,0.22) 0%, rgba(180,83,9,0.14) 50%, rgba(120,53,15,0.20) 100%)", border: "1px solid rgba(245,158,11,0.28)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, marginBottom: 4, boxShadow: "0 0 18px rgba(245,158,11,0.08)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.6), rgba(251,191,36,0.6), transparent)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.6), rgba(251,191,36,0.6), transparent)" }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, filter: "drop-shadow(0 0 4px rgba(245,158,11,0.5))" }}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "#FEF3C7", fontSize: 12, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>Pro'ya Yükselt</p>
                <p style={{ color: "#92400E", fontSize: 10, margin: 0, lineHeight: 1.4, marginTop: 1 }}>Gelişmiş analiz & daha geniş limit</p>
              </div>
              <Link href="/pro" style={{ flexShrink: 0, background: "linear-gradient(135deg, #D97706, #F59E0B)", color: "#1C0A00", fontSize: 10, fontWeight: 800, padding: "5px 8px", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(245,158,11,0.35)" }}>
                Yükselt →
              </Link>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Link href="/profile" className="sb-item"
            onMouseEnter={collapsed ? e => showTip(e, "Profil") : undefined}
            onMouseLeave={collapsed ? () => setTip(null) : undefined}
            style={{
            textDecoration: "none", color: "#64748B",
            justifyContent: collapsed ? "center" : undefined,
            padding: collapsed ? "10px 0" : undefined,
            gap: collapsed ? 0 : undefined,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#3B82F6", flexShrink: 0, overflow: "hidden" }}>
              {avatarUrl ? <AvatarImage src={avatarUrl} /> : initials}
            </div>
            {!collapsed && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>Profil</span>
                  <span style={{ color: "#64748B", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em" }}>Beta</span>
                </div>
              </>
            )}
          </Link>
          <button onClick={handleLogout} className="sb-item"
            onMouseEnter={collapsed ? e => showTip(e, "Çıkış Yap") : undefined}
            onMouseLeave={collapsed ? () => setTip(null) : undefined}
            style={{
            color: "#64748B", background: "none", border: "none",
            justifyContent: collapsed ? "center" : undefined,
            padding: collapsed ? "10px 0" : undefined,
            gap: collapsed ? 0 : undefined,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {!collapsed && "Çıkış Yap"}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="sb-main dot-grid" style={{ marginLeft: SB_W, width: `calc(100vw - ${SB_W}px)`, maxWidth: `calc(100vw - ${SB_W}px)`, flex: "0 0 auto", display: "flex", flexDirection: "column", transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1), width 0.22s cubic-bezier(0.4,0,0.2,1)", overflowX: "hidden" }}>
        {/* Topbar */}
        <div className="sb-topbar" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(8,15,30,0.85)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 40 }}>
          <Link href="/" className="sb-topbar-logo">
            para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#1E293B" }}>.com</span>
          </Link>
          <div className="sb-topbar-actions" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {xu100 && (() => {
              const isUp = !xu100.change.startsWith("%-") && xu100.change !== "-";
              return (
                <div className="sb-market-pill" style={{ background: isUp ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${isUp ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"}` }}>
                  <span className="sb-market-pill-label" style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: "0.04em" }}>XU100</span>
                  <span className="sb-market-value">{xu100.value}</span>
                  <span className="sb-market-change" style={{ color: isUp ? "#10B981" : "#EF4444" }}>{xu100.change}</span>
                </div>
              );
            })()}
            <span className="sb-topbar-date" style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{tarihSaat}</span>
            <span className="sb-topbar-username" style={{ fontSize: 13, color: "#CBD5E1", fontWeight: 600 }}>{displayName}</span>
            <Link href="/profile" className="sb-profile-avatar" aria-label="Profil">
              {avatarUrl ? <AvatarImage src={avatarUrl} /> : initials}
            </Link>
          </div>
        </div>
        {children}
      </div>

      {/* Sidebar tooltip */}
      {tip && (
        <div role="tooltip" style={{
          position: "fixed", left: SB_W + 10, top: tip.y, transform: "translateY(-50%)",
          background: "#1E293B", color: "#F1F5F9", fontSize: 12, fontWeight: 500,
          padding: "5px 10px", borderRadius: 6, whiteSpace: "nowrap",
          pointerEvents: "none", zIndex: 300, border: "1px solid rgba(255,255,255,0.08)",
        }}>
          {tip.text}
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="sb-bottomnav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(5,10,20,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)", padding: "0 8px",
        alignItems: "center", justifyContent: "space-around", height: 60, gap: 0,
      }}>
        {[
          { href: "/dashboard", label: "Dashboard", icon: navItems[0].icon },
          { href: "/hisseler", label: "Hisseler", icon: navItems[3].icon },
          { href: "/izleme", label: "İzleme", icon: navItems[5].icon },
          { href: "/portfoy", label: "Portföy", icon: navItems[1].icon },
        ].map((item) => {
          const isActive = isNavActive(pathname, currentVarlik, item.href);
          return (
            <Link key={item.label} href={item.href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              textDecoration: "none", padding: "6px 12px", borderRadius: 8, flex: 1,
              color: isActive ? "#3B82F6" : "#475569",
              borderBottom: isActive ? "2px solid #3B82F6" : "2px solid transparent",
            }} onClick={() => {
              const nextVarlik = navVarlikForHref(item.href);
              if (nextVarlik !== undefined) setCurrentVarlik(nextVarlik);
            }}>
              <span style={{ color: isActive ? "#3B82F6" : "#475569" }}>{item.icon}</span>
              <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
            </Link>
          );
        })}
        {/* Profil */}
        <Link href="/profile" style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          textDecoration: "none", padding: "6px 12px", borderRadius: 8, flex: 1,
          color: pathname === "/profile" ? "#3B82F6" : "#475569",
          borderBottom: pathname === "/profile" ? "2px solid #3B82F6" : "2px solid transparent",
        }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: `1px solid ${pathname === "/profile" ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#3B82F6", overflow: "hidden" }}>
            {avatarUrl ? <AvatarImage src={avatarUrl} /> : initials}
          </div>
          <span style={{ fontSize: 9, fontWeight: pathname === "/profile" ? 700 : 500 }}>Profil</span>
        </Link>
        {/* Daha Fazla */}
        <MoreMenu navItems={navItems} pathname={pathname} currentVarlik={currentVarlik} setCurrentVarlik={setCurrentVarlik} handleLogout={handleLogout} />
      </nav>
    </div>
  );
}
