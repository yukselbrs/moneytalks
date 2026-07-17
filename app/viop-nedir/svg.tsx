"use client";

// "VIOP Nedir?" metafor SVG'leri — saf SVG + CSS, Lottie yok (plan: viop-nedir-ux-plani.md).
// Asama 1-2: Halka (kapora) + Direksiyon (kaldirac). Asama 3-4: SuBardagi, Asansor, Bugday.

// Kapora halkasi: %10 dolan cember (risk-skoru halkasi teknigiyle).
export function KaporaHalkaSVG({ aktif, yuzde = 10 }: { aktif: boolean; yuzde?: number }) {
  const cevre = 2 * Math.PI * 44;
  return (
    <svg viewBox="0 0 120 120" width="150" height="150" role="img" aria-label={`Kapora: toplamın yüzde ${yuzde}'u`}>
      <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
      <circle cx="60" cy="60" r="44" fill="none" stroke="#3B82F6" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={cevre}
        strokeDashoffset={aktif ? cevre * (1 - yuzde / 100) : cevre}
        transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dashoffset 1.1s ease 0.4s", filter: "drop-shadow(0 0 5px rgba(59,130,246,0.5))" }} />
      <text x="60" y="57" textAnchor="middle" fill="#F1F5F9" fontSize="17" fontWeight="800">%{yuzde}</text>
      <text x="60" y="74" textAnchor="middle" fill="#64748B" fontSize="9">kapora</text>
    </svg>
  );
}

// Direksiyon → tekerlek: kucuk aci, buyuk donus.
export function DireksiyonSVG({ aktif }: { aktif: boolean }) {
  return (
    <svg viewBox="0 0 300 130" width="100%" style={{ maxWidth: 420 }} role="img" aria-label="Direksiyonda küçük dönüş, tekerlekte büyük dönüş">
      {/* direksiyon */}
      <g transform="translate(70,65)">
        <g style={{ transform: aktif ? "rotate(8deg)" : "rotate(0deg)", transition: "transform 1s ease 0.4s", transformOrigin: "0 0" }}>
          <circle r="44" fill="none" stroke="#94A3B8" strokeWidth="7" />
          <circle r="7" fill="#94A3B8" />
          <line x1="0" y1="-7" x2="0" y2="-44" stroke="#94A3B8" strokeWidth="6" />
          <line x1="-6" y1="4" x2="-38" y2="22" stroke="#94A3B8" strokeWidth="6" />
          <line x1="6" y1="4" x2="38" y2="22" stroke="#94A3B8" strokeWidth="6" />
        </g>
        <text y="66" textAnchor="middle" fill="#64748B" fontSize="11">5° çevirdin</text>
      </g>
      {/* ok */}
      <path d="M130 65 h34 m0 0 l-8 -6 m8 6 l-8 6" stroke="#475569" strokeWidth="2.5" fill="none" />
      {/* tekerlek */}
      <g transform="translate(228,65)">
        <g style={{ transform: aktif ? "rotate(80deg)" : "rotate(0deg)", transition: "transform 1s ease 0.5s", transformOrigin: "0 0" }}>
          <circle r="40" fill="none" stroke="#3B82F6" strokeWidth="10" style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.45))" }} />
          <line x1="0" y1="-40" x2="0" y2="40" stroke="#3B82F6" strokeWidth="5" />
          <line x1="-40" y1="0" x2="40" y2="0" stroke="#3B82F6" strokeWidth="5" />
        </g>
        <text y="64" textAnchor="middle" fill="#60A5FA" fontSize="11" fontWeight="700">sonuç ×10</text>
      </g>
    </svg>
  );
}

// Teminat karti kuculme animasyonu (B3): tam tutar karti → teminat karti + hayalet pozisyon.
export function TeminatKartSVG({ aktif }: { aktif: boolean }) {
  return (
    <svg viewBox="0 0 340 150" width="100%" style={{ maxWidth: 460 }} role="img" aria-label="33.000 liralık pozisyon için 3.300 lira teminat">
      {/* hayalet pozisyon */}
      <rect x="10" y="15" width="320" height="120" rx="14" fill="none" stroke="#3B82F6" strokeOpacity={aktif ? 0.35 : 0} strokeWidth="1.5" strokeDasharray="7 6" style={{ transition: "stroke-opacity 0.8s ease 0.9s" }} />
      <text x="170" y="40" textAnchor="middle" fill="#475569" fontSize="12" opacity={aktif ? 1 : 0} style={{ transition: "opacity 0.8s ease 1s" }}>pozisyon büyüklüğü: 33.000 ₺</text>
      {/* teminat karti */}
      <g style={{ transform: aktif ? "translate(20px, 55px) scale(1)" : "translate(10px, 15px) scale(2.2)", transformOrigin: "0 0", transition: "transform 1s cubic-bezier(.3,.7,.3,1) 0.3s" }}>
        <rect width="130" height="64" rx="10" fill="rgba(59,130,246,0.12)" stroke="#3B82F6" strokeWidth="1.5" />
        <text x="65" y="28" textAnchor="middle" fill="#93C5FD" fontSize="12" fontWeight="700">teminat</text>
        <text x="65" y="48" textAnchor="middle" fill="#F1F5F9" fontSize="16" fontWeight="800">3.300 ₺</text>
      </g>
    </svg>
  );
}
