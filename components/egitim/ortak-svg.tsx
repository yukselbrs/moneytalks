"use client";

// Iki (ve sonraki) egitimin PAYLASTIGI metafor SVG'leri.
// Once app/viop-nedir/svg.tsx icindeydi; Forward Nedir de ayni metaforlari kullandigi icin
// buraya tasindi — cizim/animasyon birebir ayni, yalniz konum degisti.
// Ayni dil: saf SVG + CSS transition, yeni bagimlilik yok, `aktif` prop'uyla tetiklenir.

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
