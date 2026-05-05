"use client";

const FOOTER_LINKS = [
  { label: "Gizlilik Politikası", href: "/gizlilik" },
  { label: "Kullanım Şartları", href: "/kullanim-sartlari" },
  { label: "KVKK", href: "/kvkk" },
  { label: "Risk Uyarısı", href: "/risk-uyarisi" },
];

export default function DashboardFooter() {
  return (
    <div style={{ textAlign: "center", padding: "24px 0 8px", borderTop: "1px solid rgba(59,130,246,0.06)", marginTop: 32 }}>
      {FOOTER_LINKS.map(({ label, href }, i) => (
        <span key={label}>
          <a
            href={href}
            style={{ fontSize: 11, color: "#475569", textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#94A3B8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
          >
            {label}
          </a>
          {i < FOOTER_LINKS.length - 1 && <span style={{ color: "#334155", margin: "0 8px" }}>·</span>}
        </span>
      ))}
      <p style={{ fontSize: 10, color: "#334155", marginTop: 8, lineHeight: 1.6 }}>
        ParaKonuşur yatırım danışmanlığı hizmeti sunmamaktadır. İçerikler yalnızca bilgilendirme amaçlıdır.
      </p>
      <p style={{ fontSize: 10, color: "#334155", marginTop: 4, lineHeight: 1.6 }}>
        Veriler 15 dakika gecikmeli olarak sunulmaktadır.
      </p>
    </div>
  );
}
