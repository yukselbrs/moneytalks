"use client";

const PKMark = () => (
  <svg width="32" height="32" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="footerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="55%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#1E40AF" />
      </linearGradient>
      <linearGradient id="footerGradSoft" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.25" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="256" height="256" rx="48" fill="#0B1220" stroke="rgba(59,130,246,0.18)" strokeWidth="0.5" />
    <rect x="70" y="170" width="18" height="30" rx="3" fill="url(#footerGradSoft)" />
    <rect x="70" y="130" width="18" height="70" rx="3" fill="url(#footerGrad)" />
    <rect x="94" y="110" width="18" height="90" rx="3" fill="url(#footerGrad)" />
    <path d="M112 110 Q 180 110 180 140 Q 180 170 122 170" fill="none" stroke="url(#footerGrad)" strokeWidth="18" strokeLinecap="round" />
    <circle cx="180" cy="92" r="7" fill="#60A5FA" />
  </svg>
);

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
            <PKMark />
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
            sağlanan tüm analiz, sinyal ve içerikler yalnızca bilgilendirme amaçlıdır ve
            yatırım tavsiyesi niteliği taşımaz. Yatırım kararları yatırımcının kendi risk ve
            tercihlerine bağlıdır. Geçmiş performans gelecek getirilerin garantisi değildir.
          </p>
        </div>
      </div>
    </footer>
  );
}
