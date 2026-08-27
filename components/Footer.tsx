"use client";

import Link from "next/link";
import LogoIcon from "@/components/LogoIcon";

const LINKLER = [
  { etiket: "Gizlilik Politikası", href: "/gizlilik" },
  { etiket: "Kullanım Şartları", href: "/kullanim-sartlari" },
  { etiket: "KVKK", href: "/kvkk" },
  { etiket: "Risk Uyarısı", href: "/risk-uyarisi" },
  { etiket: "İletişim", href: "mailto:hello@parakonusur.com" },
];

export default function Footer() {
  return (
    <footer
      style={{
        position: "relative",
        zIndex: 1,
        borderTop: "1px solid rgba(59,130,246,0.08)",
        padding: "clamp(44px,7vh,72px) clamp(20px,3vw,36px) clamp(32px,5vh,48px)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 32,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LogoIcon size={44} aria-label="" />
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontFamily: "var(--font-geist)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#F8FAFC",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                parakonusur<span style={{ color: "#3B82F6" }}>.com</span>
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.30em",
                  color: "#334155",
                  marginTop: 6,
                }}
              >
                AI STOCK INTELLIGENCE / BIST
              </span>
            </span>
          </Link>

          <nav style={{ display: "flex", flexWrap: "wrap", gap: "clamp(18px,2.4vw,34px)" }}>
            {LINKLER.map((l) => (
              <a key={l.etiket} href={l.href} className="lp-link" style={{ fontSize: 13, color: "#64748B" }}>
                {l.etiket}
              </a>
            ))}
          </nav>
        </div>

        <div style={{ height: 1, background: "rgba(59,130,246,0.08)", margin: "clamp(28px,4vh,44px) 0" }} />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 32,
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontSize: 12, color: "#334155", margin: 0 }}>
            <span suppressHydrationWarning>
              © {new Date().getFullYear()} parakonusur.com — Tüm hakları saklıdır.
            </span>
          </p>
          <p style={{ fontSize: 12, lineHeight: 1.65, color: "#475569", margin: 0, maxWidth: "64ch" }}>
            ParaKonuşur bir yatırım danışmanlığı hizmeti sunmamaktadır. Platform üzerinden sağlanan tüm
            analiz, gösterge özeti ve içerikler yalnızca bilgilendirme amaçlıdır ve yatırım tavsiyesi
            niteliği taşımaz. Yatırım kararları yatırımcının kendi risk ve tercihlerine bağlıdır. Geçmiş
            performans gelecek getirilerin garantisi değildir.
          </p>
        </div>
      </div>
    </footer>
  );
}
