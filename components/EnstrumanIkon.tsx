// Doviz ciftleri icin kompozit bayrak ikonu + kiymetli madenler icin kulce ikonu.
// Bayraklar kendi minimal SVG cizimimiz (harici ikon seti/CDN yok — lisans ve CSP riski sifir).
// Tablo, detay, alarm ve portfoy ekranlarinda ayni bilesen kullanilir.

const BAYRAK_VIEWBOX = "0 0 24 18";

function BayrakTR() {
  return (
    <svg viewBox={BAYRAK_VIEWBOX} width="100%" height="100%" aria-hidden="true">
      <rect width="24" height="18" fill="#E30A17" />
      <circle cx="9.2" cy="9" r="4.4" fill="#fff" />
      <circle cx="10.3" cy="9" r="3.5" fill="#E30A17" />
      <polygon fill="#fff" points="15,6.8 15.5,8.31 17.09,8.32 15.81,9.26 16.29,10.78 15,9.85 13.71,10.78 14.19,9.26 12.91,8.32 14.5,8.31" />
    </svg>
  );
}

function BayrakUS() {
  return (
    <svg viewBox={BAYRAK_VIEWBOX} width="100%" height="100%" aria-hidden="true">
      <rect width="24" height="18" fill="#B22234" />
      {[2.57, 7.71, 12.86].map(y => <rect key={y} y={y} width="24" height="2.57" fill="#fff" />)}
      <rect width="10.5" height="7.71" fill="#3C3B6E" />
      {[[2, 2], [5.2, 2], [8.4, 2], [3.6, 4], [6.8, 4], [2, 6], [5.2, 6], [8.4, 6]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.55" fill="#fff" />
      ))}
    </svg>
  );
}

function BayrakEU() {
  const yildizlar: [number, number][] = [
    [12, 4], [14.5, 4.67], [16.33, 6.5], [17, 9], [16.33, 11.5], [14.5, 13.33],
    [12, 14], [9.5, 13.33], [7.67, 11.5], [7, 9], [7.67, 6.5], [9.5, 4.67],
  ];
  return (
    <svg viewBox={BAYRAK_VIEWBOX} width="100%" height="100%" aria-hidden="true">
      <rect width="24" height="18" fill="#003399" />
      {yildizlar.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.72" fill="#FFCC00" />)}
    </svg>
  );
}

function BayrakGB() {
  return (
    <svg viewBox={BAYRAK_VIEWBOX} width="100%" height="100%" aria-hidden="true">
      <rect width="24" height="18" fill="#012169" />
      <path d="M0 0 L24 18 M24 0 L0 18" stroke="#fff" strokeWidth="3.6" />
      <path d="M0 0 L24 18 M24 0 L0 18" stroke="#C8102E" strokeWidth="1.4" />
      <path d="M12 0 V18 M0 9 H24" stroke="#fff" strokeWidth="6" />
      <path d="M12 0 V18 M0 9 H24" stroke="#C8102E" strokeWidth="3.4" />
    </svg>
  );
}

function BayrakJP() {
  return (
    <svg viewBox={BAYRAK_VIEWBOX} width="100%" height="100%" aria-hidden="true">
      <rect width="24" height="18" fill="#F8FAFC" />
      <circle cx="12" cy="9" r="3.8" fill="#BC002D" />
    </svg>
  );
}

const PARA_BAYRAK: Record<string, () => React.ReactNode> = {
  TRY: BayrakTR,
  USD: BayrakUS,
  EUR: BayrakEU,
  GBP: BayrakGB,
  JPY: BayrakJP,
};

function Bayrak({ para, genislik }: { para: string; genislik: number }) {
  const Cizim = PARA_BAYRAK[para];
  return (
    <span
      style={{
        display: "inline-flex", width: genislik, height: genislik * 0.75,
        borderRadius: Math.max(2, genislik * 0.14), overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.18)", boxSizing: "border-box",
        background: "#1E293B", flexShrink: 0,
      }}
    >
      {Cizim ? <Cizim /> : null}
    </span>
  );
}

export function DovizCiftIkon({ taban, karsi, boyut = 36 }: { taban: string; karsi: string; boyut?: number }) {
  const bg = Math.round(boyut * 0.66);
  return (
    <span role="img" aria-label={`${taban}/${karsi}`} style={{ position: "relative", width: boyut, height: boyut, display: "inline-block", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: boyut * 0.06, left: 0 }}><Bayrak para={taban} genislik={bg} /></span>
      <span style={{ position: "absolute", bottom: boyut * 0.06, right: 0, filter: "drop-shadow(-2px -2px 3px rgba(2,6,17,0.55))" }}>
        <Bayrak para={karsi} genislik={bg} />
      </span>
    </span>
  );
}

const MADEN_RENK: Record<string, { koyu: string; acik: string; zemin: string }> = {
  altin: { koyu: "#B45309", acik: "#FBBF24", zemin: "rgba(245,158,11,0.12)" },
  gumus: { koyu: "#64748B", acik: "#E2E8F0", zemin: "rgba(148,163,184,0.12)" },
  platin: { koyu: "#526278", acik: "#B6C6DA", zemin: "rgba(124,141,166,0.14)" },
  paladyum: { koyu: "#6B655B", acik: "#D6CDBD", zemin: "rgba(168,159,145,0.13)" },
};

function madenRenk(kod: string) {
  if (kod.includes("altin")) return MADEN_RENK.altin;
  if (kod.includes("gumus")) return MADEN_RENK.gumus;
  if (kod.includes("platin")) return MADEN_RENK.platin;
  return MADEN_RENK.paladyum;
}

export function MadenIkon({ kod, boyut = 36 }: { kod: string; boyut?: number }) {
  const r = madenRenk(kod);
  return (
    <span
      role="img" aria-label="Külçe"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: boyut, height: boyut, borderRadius: Math.max(6, boyut * 0.25),
        background: r.zemin, flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 24 24" width={boyut * 0.62} height={boyut * 0.62} aria-hidden="true">
        <path d="M8.5 5.5 h7 l1.6 4 H6.9 z" fill={r.acik} stroke={r.koyu} strokeWidth="0.9" strokeLinejoin="round" />
        <path d="M5.5 12.5 h13 l2 5.5 H3.5 z" fill={r.acik} stroke={r.koyu} strokeWidth="0.9" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function EnstrumanIkon({ tur, kod, taban, karsi, boyut = 36 }: {
  tur: "doviz" | "maden";
  kod: string;
  taban?: string | null;
  karsi?: string | null;
  boyut?: number;
}) {
  if (tur === "doviz" && taban && karsi) return <DovizCiftIkon taban={taban} karsi={karsi} boyut={boyut} />;
  return <MadenIkon kod={kod} boyut={boyut} />;
}
