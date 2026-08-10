"use client";

// "Forward Nedir?" metafor SVG'leri — VIOP Nedir ile ayni dil: saf SVG + CSS transition,
// Lottie/yeni bagimlilik YOK, her animasyon `aktif` prop'uyla sahne girisinde tetiklenir.
// Asansor (long/short), Bugday (neden var) ve KarsiTarafRiski (B4) ORTAK kitten gelir
// (components/egitim/ortak-svg.tsx) — Swap Nedir de ayni metaforlari kullaniyor.
// Burada yalniz forward'a OZGU iki metafor var: fiyat kilidi (B2), borsa-vs-OTC (B3).

function Kisi({ x, renk = "#94A3B8" }: { x: number; renk?: string }) {
  return (
    <g transform={`translate(${x},58)`}>
      <circle cy="-10" r="9" fill={renk} />
      <path d="M-13 14 a13 13 0 0 1 26 0 z" fill={renk} />
    </g>
  );
}

// B2 — Fiyat kilidi: bugun ile vade arasinda, uzerinde sabit fiyat etiketi tasiyan cizgi.
export function FiyatKilidiSVG({ aktif }: { aktif: boolean }) {
  return (
    <svg viewBox="0 0 320 120" width="100%" style={{ maxWidth: 440 }} role="img"
      aria-label="Bugün ve üç ay sonra arasında sabitlenen fiyat">
      <line x1="40" y1="78" x2="280" y2="78" stroke="rgba(148,163,184,0.25)" strokeWidth="2" strokeDasharray="5 5" />
      {[{ x: 40, e: "bugün" }, { x: 280, e: "3 ay sonra" }].map((n) => (
        <g key={n.e}>
          <circle cx={n.x} cy="78" r="6" fill="#3B82F6" />
          <text x={n.x} y="100" textAnchor="middle" fill="#64748B" fontSize="11">{n.e}</text>
        </g>
      ))}
      {/* kilitli fiyat etiketi: bugunden vadeye kayar */}
      <g style={{ transform: aktif ? "translateX(240px)" : "translateX(0px)", transition: "transform 1.2s ease 0.4s" }}>
        <g transform="translate(40,0)">
          <rect x="-34" y="26" width="68" height="30" rx="8" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.5)" />
          <text x="0" y="46" textAnchor="middle" fill="#93C5FD" fontSize="14" fontWeight="800">100 ₺</text>
          <path d="M-6 20 v-5 a6 6 0 0 1 12 0 v5" fill="none" stroke="#93C5FD" strokeWidth="2" />
          <rect x="-8" y="20" width="16" height="9" rx="2" fill="#93C5FD" />
        </g>
      </g>
      <text x="160" y="18" textAnchor="middle" fill="#64748B" fontSize="11">fiyat bugünden kilitlendi</text>
    </svg>
  );
}

// B3 — Borsa vs OTC: solda araya borsa giren yapi, sagda iki taraf arasinda dogrudan cizgi.
export function BorsaOtcSVG({ aktif }: { aktif: boolean }) {
  return (
    <svg viewBox="0 0 340 150" width="100%" style={{ maxWidth: 460 }} role="img"
      aria-label="VİOP'ta araya borsa girer, forward'da iki taraf doğrudan anlaşır">
      {/* SOL: VIOP — araya borsa girer */}
      <text x="80" y="16" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="700">VİOP</text>
      <Kisi x={26} /><Kisi x={134} />
      <g style={{ opacity: aktif ? 1 : 0, transition: "opacity 0.6s ease 0.5s" }}>
        <rect x="58" y="36" width="44" height="34" rx="6" fill="rgba(59,130,246,0.14)" stroke="rgba(59,130,246,0.5)" />
        <path d="M64 46 h32 M64 54 h32 M64 62 h32" stroke="#60A5FA" strokeWidth="2" />
        <text x="80" y="88" textAnchor="middle" fill="#60A5FA" fontSize="9.5">borsa</text>
      </g>
      <line x1="40" y1="53" x2="58" y2="53" stroke="#60A5FA" strokeWidth="2.5" />
      <line x1="102" y1="53" x2="120" y2="53" stroke="#60A5FA" strokeWidth="2.5" />
      <text x="80" y="118" textAnchor="middle" fill="#64748B" fontSize="10.5">standart kontrat</text>

      <line x1="170" y1="24" x2="170" y2="126" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />

      {/* SAG: FORWARD — dogrudan */}
      <text x="260" y="16" textAnchor="middle" fill="#FCD34D" fontSize="11" fontWeight="700">Forward</text>
      <Kisi x={206} renk="#CBD5E1" /><Kisi x={314} renk="#CBD5E1" />
      <line x1="220" y1="53" x2="300" y2="53" stroke="#F59E0B" strokeWidth="2.5"
        strokeDasharray="200" strokeDashoffset={aktif ? 0 : 200}
        style={{ transition: "stroke-dashoffset 1s ease 0.6s" }} />
      <text x="260" y="88" textAnchor="middle" fill="#FCD34D" fontSize="9.5">aracı yok</text>
      <text x="260" y="118" textAnchor="middle" fill="#64748B" fontSize="10.5">şartları siz belirlersiniz</text>
    </svg>
  );
}

