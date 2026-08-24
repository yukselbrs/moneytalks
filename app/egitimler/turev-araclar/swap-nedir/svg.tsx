"use client";

// "Swap Nedir?" metafor SVG'leri — VIOP/Forward ile ayni dil: saf SVG + CSS transition,
// yeni bagimlilik YOK, her animasyon `aktif` prop'uyla sahne girisinde tetiklenir.
// Asansor, DalgaliSabit ve KarsiTarafRiski ORTAK kitten gelir (components/egitim/ortak-svg.tsx).
// Burada yalniz swap'a OZGU uc metafor var: ev takasi (B2), forward dizisi (B3), faiz swap'i (B4).

function Ev({ x, etiket, renk }: { x: number; etiket: string; renk: string }) {
  return (
    <g transform={`translate(${x},70)`}>
      <path d="M-22 4 L0 -16 L22 4 z" fill="none" stroke={renk} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="-16" y="4" width="32" height="24" rx="2" fill="none" stroke={renk} strokeWidth="2.5" />
      <rect x="-5" y="14" width="10" height="14" fill={renk} opacity="0.5" />
      <text y="48" textAnchor="middle" fill="#64748B" fontSize="11">{etiket}</text>
    </g>
  );
}

// B2 — Ev takasi: iki ev, sure boyunca karsilikli yer degistirir.
export function EvTakasiSVG({ aktif }: { aktif: boolean }) {
  return (
    <svg viewBox="0 0 320 140" width="100%" style={{ maxWidth: 440 }} role="img"
      aria-label="İki ev altı aylığına karşılıklı takas ediliyor, süre bitince geri dönüyor">
      <Ev x={56} etiket="İstanbul" renk="#60A5FA" />
      <Ev x={264} etiket="İzmir" renk="#34D399" />
      {/* cift yonlu takas oklari */}
      <g style={{ opacity: aktif ? 1 : 0, transition: "opacity 0.5s ease 0.4s" }}>
        <path d="M96 58 h128 m0 0 l-9 -6 m9 6 l-9 6" stroke="#60A5FA" strokeWidth="2.5" fill="none"
          strokeDasharray="140" strokeDashoffset={aktif ? 0 : 140}
          style={{ transition: "stroke-dashoffset 0.9s ease 0.5s" }} />
        <path d="M224 84 h-128 m0 0 l9 -6 m-9 6 l9 6" stroke="#34D399" strokeWidth="2.5" fill="none"
          strokeDasharray="140" strokeDashoffset={aktif ? 0 : 140}
          style={{ transition: "stroke-dashoffset 0.9s ease 0.8s" }} />
      </g>
      <rect x="136" y="60" width="48" height="22" rx="11" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.45)"
        style={{ opacity: aktif ? 1 : 0, transition: "opacity 0.4s ease 1.4s" }} />
      <text x="160" y="75" textAnchor="middle" fill="#93C5FD" fontSize="11" fontWeight="700"
        style={{ opacity: aktif ? 1 : 0, transition: "opacity 0.4s ease 1.4s" }}>6 ay</text>
      <text x="160" y="126" textAnchor="middle" fill="#64748B" fontSize="10.5">mülkiyet değişmez, kullanım değişir</text>
    </svg>
  );
}

// B3 — Forward dizisi: tek vade oku cogalip dort ardisik odeme tarihine donusur.
export function ForwardDizisiSVG({ aktif }: { aktif: boolean }) {
  const vadeler = [0, 1, 2, 3];
  return (
    <svg viewBox="0 0 320 130" width="100%" style={{ maxWidth: 440 }} role="img"
      aria-label="Tek vadeli forward çoğalarak dört ödeme tarihli swap'a dönüşüyor">
      <text x="20" y="20" fill="#64748B" fontSize="11">forward: tek vade</text>
      {/* tek forward */}
      <g style={{ opacity: aktif ? 0.3 : 1, transition: "opacity 0.6s ease 0.9s" }}>
        <line x1="24" y1="42" x2="290" y2="42" stroke="rgba(148,163,184,0.3)" strokeWidth="2" strokeDasharray="4 4" />
        <circle cx="24" cy="42" r="5" fill="#64748B" />
        <circle cx="290" cy="42" r="5" fill="#F59E0B" />
      </g>

      <text x="20" y="80" fill="#FCD34D" fontSize="11" fontWeight="700"
        style={{ opacity: aktif ? 1 : 0, transition: "opacity 0.5s ease 1s" }}>swap: tekrar eden vadeler</text>
      {/* dort ardisik vade */}
      <line x1="24" y1="102" x2="290" y2="102" stroke="rgba(148,163,184,0.3)" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx="24" cy="102" r="5" fill="#64748B" />
      {vadeler.map((i) => (
        <g key={i} style={{ opacity: aktif ? 1 : 0, transform: aktif ? "none" : "translateY(-8px)", transition: `all 0.4s ease ${1.1 + i * 0.18}s` }}>
          <circle cx={90 + i * 67} cy="102" r="6" fill="#F59E0B" />
          <text x={90 + i * 67} y="122" textAnchor="middle" fill="#64748B" fontSize="9.5">{i + 1}. çeyrek</text>
        </g>
      ))}
    </svg>
  );
}

// B4 — Faiz swap'i: sabit (duz cizgi) ve degisken (dalgali cizgi) taraflar yer degistirir.
export function FaizSwapSVG({ aktif }: { aktif: boolean }) {
  return (
    <svg viewBox="0 0 320 160" width="100%" style={{ maxWidth: 460 }} role="img"
      aria-label="Sabit ödeyen ile değişken ödeyen taraflar ödeme akışlarını takas ediyor">
      {/* taraf kartlari */}
      {[{ x: 12, ad: "Ayşe", alt: "değişken kredisi var", renk: "#F59E0B" },
        { x: 208, ad: "Mehmet", alt: "sabit kredisi var", renk: "#60A5FA" }].map((t) => (
        <g key={t.ad}>
          <rect x={t.x} y="18" width="100" height="46" rx="10" fill="rgba(255,255,255,0.03)" stroke={`${t.renk}55`} />
          <text x={t.x + 50} y="38" textAnchor="middle" fill="#E2E8F0" fontSize="13" fontWeight="800">{t.ad}</text>
          <text x={t.x + 50} y="54" textAnchor="middle" fill="#64748B" fontSize="9.5">{t.alt}</text>
        </g>
      ))}

      {/* takas oklari: sabit saga, degisken sola */}
      <g style={{ opacity: aktif ? 1 : 0, transition: "opacity 0.5s ease 0.5s" }}>
        <path d="M116 84 h88 m0 0 l-9 -6 m9 6 l-9 6" stroke="#60A5FA" strokeWidth="2.5" fill="none" />
        <text x="160" y="78" textAnchor="middle" fill="#93C5FD" fontSize="10">sabit %40</text>
        <path d="M204 112 h-88 m0 0 l9 -6 m-9 6 l9 6" stroke="#F59E0B" strokeWidth="2.5" fill="none" />
        <text x="160" y="106" textAnchor="middle" fill="#FCD34D" fontSize="10">değişken faiz</text>
      </g>

      {/* alt: iki odeme profili */}
      <g transform="translate(0,132)">
        <text x="12" y="4" fill="#64748B" fontSize="9.5">sabit:</text>
        <line x1="48" y1="0" x2="140" y2="0" stroke="#60A5FA" strokeWidth="2.5" strokeDasharray="92"
          strokeDashoffset={aktif ? 0 : 92} style={{ transition: "stroke-dashoffset 0.9s ease 1.1s" }} />
        <text x="176" y="4" fill="#64748B" fontSize="9.5">değişken:</text>
        <path d="M228 0 q 12 -12 24 0 t 24 0 t 24 0" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="100"
          strokeDashoffset={aktif ? 0 : 100} style={{ transition: "stroke-dashoffset 0.9s ease 1.3s" }} />
      </g>
    </svg>
  );
}

// B6 — Faiz belirsizligi vs sabitlenmis odeme (DalgaliSabitSVG'nin sol ikonu).
export const FaizIkonu = (
  <g transform="translate(34,96)" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round">
    <circle cx="-8" cy="-14" r="6" />
    <circle cx="10" cy="8" r="6" />
    <line x1="14" y1="-20" x2="-12" y2="14" />
  </g>
);
