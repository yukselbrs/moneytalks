"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import LogoIcon from "@/components/LogoIcon";
import { KayitButonu } from "@/components/landing/parcalar";

const BOLUM_LINKLERI = [
  { etiket: "Nedir", href: "#nedir", renk: "#CBD5E1" },
  { etiket: "Nasıl çalışır", href: "#nasil", renk: "#94A3B8" },
  { etiket: "Kapsam", href: "#kapsam", renk: "#94A3B8" },
] as const;

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [kaydi, setKaydi] = useState(false);
  const [girisli, setGirisli] = useState(false);

  useEffect(() => {
    let kare = 0;
    const kaydirmayiOku = () => {
      if (kare) return;
      kare = requestAnimationFrame(() => {
        kare = 0;
        // Ayni degerde React render'i atlar — her scroll olayinda yeniden render yok.
        setKaydi(window.scrollY > 30);
      });
    };
    window.addEventListener("scroll", kaydirmayiOku, { passive: true });
    kaydirmayiOku();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setGirisli(true);
      if (pathname === "/") router.push("/dashboard");
    });
    const { data: dinleyici } = supabase.auth.onAuthStateChange((_olay, session) => {
      setGirisli(Boolean(session));
    });

    return () => {
      cancelAnimationFrame(kare);
      window.removeEventListener("scroll", kaydirmayiOku);
      dinleyici.subscription.unsubscribe();
    };
  }, [pathname, router]);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        background: kaydi ? "rgba(11,18,32,0.92)" : "transparent",
        backdropFilter: kaydi ? "blur(16px)" : "none",
        borderBottom: `1px solid ${kaydi ? "rgba(59,130,246,0.12)" : "transparent"}`,
        transition: "background 260ms var(--ease), border-color 260ms var(--ease)",
      }}
    >
      <div
        className="lp-nav-pad"
        style={{
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 clamp(24px,3vw,32px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <LogoIcon size={34} aria-label="" />
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span
              className="lp-nav-wordmark"
              style={{
                fontFamily: "var(--font-geist)",
                fontSize: 17,
                fontWeight: 600,
                color: "#F8FAFC",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              }}
            >
              parakonusur<span style={{ color: "#3B82F6" }}>.com</span>
            </span>
            <span
              className="lp-nav-tag"
              style={{
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: "0.22em",
                color: "#475569",
                marginTop: 4,
              }}
            >
              AI STOCK INTELLIGENCE / BIST
            </span>
          </span>
        </Link>

        <div className="lp-navlinks" style={{ display: "flex", alignItems: "center", gap: 26 }}>
          {BOLUM_LINKLERI.map((l) => (
            <a key={l.href} href={l.href} className="lp-link" style={{ fontSize: 13, color: l.renk }}>
              {l.etiket}
            </a>
          ))}
        </div>

        <div className="lp-nav-sag" style={{ display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
          {girisli ? (
            <Link href="/dashboard" className="lp-link" style={{ fontSize: 13, color: "#94A3B8", whiteSpace: "nowrap" }}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="lp-link" style={{ fontSize: 13, color: "#94A3B8", whiteSpace: "nowrap" }}>
                Giriş Yap
              </Link>
              <KayitButonu boyut="sm" mobilMetin="Kayıt Ol" />
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
