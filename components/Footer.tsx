"use client";

import LogoIcon from "@/components/LogoIcon";

export default function Footer() {
  return (
    <footer
      className="relative border-t px-6 lg:px-8 py-16"
      style={{ borderColor: "rgba(59,130,246,0.08)", background: "#0B1220" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <LogoIcon size={32} aria-label="" />
            <div className="flex flex-col leading-none">
              <span
                className="text-[15px] font-medium"
                style={{ color: "#F8FAFC", fontFamily: "var(--font-manrope)" }}
              >
                parakonusur
                <span style={{ color: "#3B82F6" }}>.com</span>
              </span>
              <span
                className="text-[9px] tracking-[0.28em] mt-1"
                style={{ color: "#334155", fontFamily: "var(--font-manrope)" }}
              >
                AI STOCK INTELLIGENCE / BIST
              </span>
            </div>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-6">
            {[
              { label: "Gizlilik Politikası", href: "/gizlilik" },
              { label: "Kullanım Şartları", href: "/kullanim-sartlari" },
              { label: "KVKK", href: "/kvkk" },
              { label: "Risk Uyarısı", href: "/risk-uyarisi" },
              { label: "İletişim", href: "mailto:hello@parakonusur.com" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs transition-colors duration-200"
                style={{ color: "#475569", fontFamily: "var(--font-manrope)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#94A3B8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="h-px mt-10 mb-8" style={{ background: "rgba(59,130,246,0.06)" }} />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p
            className="text-xs shrink-0"
            style={{ color: "#334155", fontFamily: "var(--font-manrope)" }}
          >
            <span suppressHydrationWarning>© {new Date().getFullYear()} ParaKonusur.com — Tüm hakları saklıdır.</span>
          </p>
          <p
            className="text-[10px] max-w-lg"
            style={{ color: "#64748B", fontFamily: "var(--font-manrope)", lineHeight: "1.6" }}
          >
            ParaKonusur bir yatırım danışmanlığı hizmeti sunmamaktadır. Platform üzerinden
            sağlanan tüm analiz, gösterge özeti ve içerikler yalnızca bilgilendirme amaçlıdır ve
            yatırım tavsiyesi niteliği taşımaz. Yatırım kararları yatırımcının kendi risk ve
            tercihlerine bağlıdır. Geçmiş performans gelecek getirilerin garantisi değildir.
          </p>
        </div>
      </div>
    </footer>
  );
}
