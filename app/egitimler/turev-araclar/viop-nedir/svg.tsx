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

// Su bardagi (B7 set-piece): su = teminat; surdurme cizgisi altina inince titreme + amber uyari.
// asama: "dolu" -> "kritik" (su azalir, bardak titrer) -> "eklendi" (su tekrar dolar)
export function SuBardagiSVG({ aktif }: { aktif: boolean }) {
  return (
    <svg viewBox="0 0 200 190" width="200" role="img" aria-label="Teminat seviyesi su bardağı gibi azalıyor; sürdürme çizgisinin altına inince uyarı">
      <style>{`
        @keyframes vn-bardak-titre { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-2.5px); } 75% { transform: translateX(2.5px); } }
        @keyframes vn-su-azal { 0% { height: 90px; y: 40px; } 100% { height: 34px; y: 96px; } }
        .vn-bardak-kritik { animation: vn-bardak-titre 0.35s ease-in-out 1.8s 3; }
        .vn-su { transition: none; }
        [data-aktif="true"] .vn-su { animation: vn-su-azal 1.6s ease-in-out 0.6s forwards; }
        @media (prefers-reduced-motion: reduce) {
          .vn-bardak-kritik { animation: none !important; }
          [data-aktif="true"] .vn-su { animation: none !important; height: 34px; y: 96px; }
        }
      `}</style>
      <g className={aktif ? "vn-bardak-kritik" : ""} style={{ transformOrigin: "100px 100px" }}>
        {/* bardak */}
        <path d="M55 30 L65 150 Q66 160 76 160 L124 160 Q134 160 135 150 L145 30" fill="none" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
        {/* su (teminat) */}
        <rect className="vn-su" x="63" y="40" width="74" height="90" rx="4" fill="rgba(59,130,246,0.35)" stroke="#3B82F6" strokeWidth="1.5" />
        {/* surdurme cizgisi */}
        <line x1="50" y1="96" x2="150" y2="96" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="6 5" />
        <text x="155" y="100" fill="#FCD34D" fontSize="10" fontWeight="700">sürdürme</text>
      </g>
      <text x="100" y="182" textAnchor="middle" fill="#64748B" fontSize="11">su = teminatın · çizgi = alt sınır</text>
    </svg>
  );
}

// Asansor cifti (B8-B9): long yukari cikarken yesil, short asagi inerken yesil (ters-sezgi ani).
export function AsansorSVG({ aktif, yon }: { aktif: boolean; yon: "long" | "short" }) {
  const yukari = yon === "long";
  return (
    <svg viewBox="0 0 150 200" width="140" role="img" aria-label={yukari ? "Long: fiyat yükselirken pozisyon değer kazanır" : "Short: fiyat düşerken pozisyon değer kazanır"}>
      {/* saft */}
      <rect x="45" y="14" width="60" height="150" rx="8" fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="2.5" />
      {/* kabin */}
      <g style={{ transform: aktif ? `translateY(${yukari ? -52 : 52}px)` : "translateY(0)", transition: "transform 1.4s cubic-bezier(.4,.7,.3,1) 0.5s" }}>
        <rect x="53" y={yukari ? 104 : 30} width="44" height="46" rx="6" fill="rgba(59,130,246,0.14)" stroke="#3B82F6" strokeWidth="2" />
        <text x="75" y={yukari ? 131 : 57} textAnchor="middle" fill="#93C5FD" fontSize="12" fontWeight="800">{yukari ? "L" : "S"}</text>
      </g>
      {/* fiyat oku */}
      <path d={yukari ? "M124 130 v-56 m0 0 l-7 9 m7 -9 l7 9" : "M124 74 v56 m0 0 l-7 -9 m7 9 l7 -9"} stroke={yukari ? "#10B981" : "#EF4444"} strokeWidth="3" fill="none" strokeLinecap="round"
        style={{ opacity: aktif ? 1 : 0, transition: "opacity 0.5s ease 1s" }} />
      <text x="124" y={yukari ? 62 : 148} textAnchor="middle" fill={yukari ? "#10B981" : "#EF4444"} fontSize="10" fontWeight="700"
        style={{ opacity: aktif ? 1 : 0, transition: "opacity 0.5s ease 1.1s" }}>fiyat</text>
      {/* pozisyon rozeti — iki yonde de YESIL (kritik mesaj) */}
      <g style={{ opacity: aktif ? 1 : 0, transition: "opacity 0.5s ease 1.5s" }}>
        <rect x="30" y="172" width="90" height="20" rx="10" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
        <text x="75" y="186" textAnchor="middle" fill="#6EE7B7" fontSize="10.5" fontWeight="700">pozisyon +%</text>
      </g>
    </svg>
  );
}

// Bugday ciftcisi (B10): dalgali piyasa cizgisi vs sabitlenmis sozlesme cizgisi.
export function BugdaySVG({ aktif }: { aktif: boolean }) {
  return (
    <svg viewBox="0 0 320 150" width="100%" style={{ maxWidth: 440 }} role="img" aria-label="Dalgalı piyasa fiyatına karşı sözleşmeyle sabitlenen fiyat">
      {/* basak */}
      <g transform="translate(30,96)" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <line x1="0" y1="40" x2="0" y2="-26" />
        {[-18, -8, 2, 12].map(y => (
          <g key={y}>
            <path d={`M0 ${y} q -12 -4 -15 -15`} />
            <path d={`M0 ${y} q 12 -4 15 -15`} />
          </g>
        ))}
      </g>
      {/* dalgali piyasa fiyati */}
      <path d="M80 75 q 25 -34 50 -6 t 50 12 t 50 -30 t 60 16" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeDasharray="340"
        strokeDashoffset={aktif ? 0 : 340} style={{ transition: "stroke-dashoffset 1.6s ease 0.5s" }} />
      <text x="298" y="60" fill="#F87171" fontSize="10" textAnchor="end">piyasa: sürpriz</text>
      {/* sabitlenmis sozlesme cizgisi */}
      <line x1="80" y1="106" x2="292" y2="106" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeDasharray="212"
        strokeDashoffset={aktif ? 0 : 212} style={{ transition: "stroke-dashoffset 1.2s ease 1.4s" }} />
      <text x="298" y="110" fill="#6EE7B7" fontSize="10" textAnchor="end">sözleşme: sabit</text>
    </svg>
  );
}
