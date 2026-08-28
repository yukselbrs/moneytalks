"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  canvasKaydet,
  hareketAzaltilmis,
  isaretci,
  kareCiz,
  manyetikKaydet,
  type CanvasTuru,
} from "@/lib/landing-hareket";

/* ── Hareket surucusu ────────────────────────────────
   Sayfada BIR kez mount edilir; uc canvas'i da tek rAF
   dongusunde surer. State'e yazmaz. */

export function LandingHareket() {
  useEffect(() => {
    const durgun = hareketAzaltilmis();

    if (durgun) {
      // Tek kare yeter. Gec mount olan canvas'lari (CTA karti) yakalamak icin
      // birkac kez tekrarlanir, sonra durur.
      const zamanlayicilar = [0, 250, 1000].map((ms) =>
        window.setTimeout(() => kareCiz(0, true), ms)
      );
      const yenidenCiz = () => kareCiz(0, true);
      window.addEventListener("resize", yenidenCiz, { passive: true });
      return () => {
        zamanlayicilar.forEach(window.clearTimeout);
        window.removeEventListener("resize", yenidenCiz);
      };
    }

    const imlecOku = (e: PointerEvent) => {
      isaretci.x = e.clientX / window.innerWidth;
      isaretci.y = e.clientY / window.innerHeight;
      isaretci.px = e.clientX;
      isaretci.py = e.clientY;
    };
    window.addEventListener("pointermove", imlecOku, { passive: true });

    let kare = 0;
    const dongu = (zaman: number) => {
      kareCiz(zaman, false);
      kare = requestAnimationFrame(dongu);
    };
    kare = requestAnimationFrame(dongu);

    return () => {
      cancelAnimationFrame(kare);
      window.removeEventListener("pointermove", imlecOku);
    };
  }, []);

  return null;
}

/** Sayfa geneli ortam isigi — fixed, z-index 0, tiklama gecirmez. */
export function OrtamCanvas() {
  const ref = useHareketCanvas("ambient");
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

/** Canvas'i hareket kaydina baglayan callback ref. */
export function useHareketCanvas(tur: CanvasTuru) {
  const cozRef = useRef<(() => void) | null>(null);
  return useCallback(
    (el: HTMLCanvasElement | null) => {
      cozRef.current?.();
      cozRef.current = el ? canvasKaydet(tur, el) : null;
    },
    [tur]
  );
}

/** Imlece dogru cekilen sarmalayici icin callback ref. */
export function useManyetik() {
  const cozRef = useRef<(() => void) | null>(null);
  return useCallback((el: HTMLDivElement | null) => {
    cozRef.current?.();
    cozRef.current = el && !hareketAzaltilmis() ? manyetikKaydet(el) : null;
  }, []);
}

/* ── Scroll reveal ───────────────────────────────────
   Uc durum: "ilk" (SSR + hidrasyon oncesi) GORUNUR baslar.
   Efekt calistiginda yalniz ekranin ALTINDA kalan ogeler gizlenir,
   sonra kaydirmayla acilir. Boylece JS calismazsa/animasyon donarsa
   sayfa bos kalmaz — prototip de tam olarak bunu yapiyor.

   Gorunurluk IntersectionObserver ile DEGIL, getBoundingClientRect ile
   olculur: gomulu pane'lerde IO callback'leri gelmiyor (bkz. egitim
   modulunde ayni karar — components/egitim/parcalar.tsx). */

type RevealDurum = "ilk" | "gizli" | "acik";

export function useReveal<T extends HTMLElement>(gecikme = 0) {
  const ref = useRef<T | null>(null);
  const [durum, setDurum] = useState<RevealDurum>("ilk");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (hareketAzaltilmis()) {
      setDurum("acik");
      return;
    }

    const esikAltinda = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.92 && r.bottom > -60;
    };

    // Zaten gorunuyorsa hic gizleme — ilk ekranda titreme olmaz.
    if (esikAltinda()) {
      setDurum("acik");
      return;
    }

    setDurum("gizli");
    let bitti = false;
    const kontrol = () => {
      if (bitti || !esikAltinda()) return;
      bitti = true;
      setDurum("acik");
      window.removeEventListener("scroll", kontrol);
      window.removeEventListener("resize", kontrol);
    };
    window.addEventListener("scroll", kontrol, { passive: true });
    window.addEventListener("resize", kontrol, { passive: true });
    return () => {
      window.removeEventListener("scroll", kontrol);
      window.removeEventListener("resize", kontrol);
    };
  }, []);

  const gizli = durum === "gizli";
  const stil: CSSProperties = {
    opacity: gizli ? 0 : 1,
    transform: gizli ? "translateY(26px)" : "none",
    transition: `opacity 700ms var(--ease) ${gecikme}ms, transform 700ms var(--ease) ${gecikme}ms`,
  };

  return { ref, stil, gorunur: durum === "acik" };
}

/* ── Rozet ───────────────────────────────────────────── */

export function Rozet({ metin, nabiz = false }: { metin: string; nabiz?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: nabiz ? "7px 14px 7px 11px" : "6px 14px 6px 11px",
        border: "1px solid rgba(59,130,246,0.18)",
        borderRadius: 999,
        background: "var(--surface-overlay)",
      }}
    >
      <span
        className={nabiz ? "lp-dot" : undefined}
        style={{
          width: nabiz ? 6 : 5,
          height: nabiz ? 6 : 5,
          borderRadius: "50%",
          background: "#60A5FA",
          flex: "none",
        }}
      />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: "#93C5FD" }}>
        {metin}
      </span>
    </div>
  );
}

/* ── Ikon plakasi ────────────────────────────────────── */

export function IkonPlaka({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        flex: "none",
        borderRadius: 16,
        background: "rgba(59,130,246,0.06)",
        border: "1px solid var(--border-input)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#60A5FA",
      }}
    >
      {children}
    </div>
  );
}

/* ── Ozellik karti (FeatureCard, yatay) ──────────────── */

export function OzellikKarti({
  ikon,
  baslik,
  aciklama,
}: {
  ikon: ReactNode;
  baslik: string;
  aciklama: string;
}) {
  return (
    <div
      className="card-glass lp-card"
      style={{
        height: "100%",
        borderRadius: 16,
        padding: 24,
        display: "flex",
        alignItems: "flex-start",
        gap: 24,
      }}
    >
      <IkonPlaka>{ikon}</IkonPlaka>
      <div style={{ minWidth: 0 }}>
        <h3
          style={{
            fontFamily: "var(--font-geist)",
            fontSize: 16,
            fontWeight: 700,
            color: "#FFFFFF",
            margin: "0 0 8px",
          }}
        >
          {baslik}
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#94A3B8", margin: 0 }}>{aciklama}</p>
      </div>
    </div>
  );
}

/* ── Cam kart ────────────────────────────────────────── */

export function CamKart({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="card-glass lp-card"
      style={{ height: "100%", borderRadius: 16, padding: 24, ...style }}
    >
      {children}
    </div>
  );
}

/* ── Skor halkasi ────────────────────────────────────
   animate=false varsayilan: handoff notu, animasyonlu mount
   prop referansi degisince sayac useEffect'i surekli iptal
   olup halkayi 0'da donduruyordu. */

/** DashboardAiPanel ile ayni skala — yuksek skor = dusuk risk. 46 -> #F97316. */
export function skorRenk(skor: number) {
  if (skor >= 80) return "#10B981";
  if (skor >= 65) return "#22C55E";
  if (skor >= 50) return "#F59E0B";
  if (skor >= 35) return "#F97316";
  return "#EF4444";
}

const CEVRE = 2 * Math.PI * 42;

export function SkorHalkasi({
  skor,
  boyut = 132,
  baslik,
  altBaslik,
}: {
  skor: number;
  boyut?: number;
  baslik: string;
  altBaslik: string;
}) {
  const renk = skorRenk(skor);
  return (
    <div style={{ width: boyut, height: boyut, position: "relative", flex: "none" }}>
      <svg width={boyut} height={boyut} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={renk}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(skor / 100) * CEVRE} ${CEVRE}`}
          style={{ filter: `drop-shadow(0 0 5px ${renk}88)` }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#F1F5F9",
            letterSpacing: "-1.2px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {skor}
        </span>
        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{baslik}</span>
        <span style={{ fontSize: 10, color: "#64748B" }}>{altBaslik}</span>
      </div>
    </div>
  );
}

/* ── Birincil CTA ────────────────────────────────────── */

const BOYUT = {
  sm: { h: 32, px: 16, fs: 13 },
  md: { h: 40, px: 22, fs: 14 },
  lg: { h: 48, px: 26, fs: 15 },
} as const;

export function KayitButonu({
  boyut = "md",
  okIsareti = false,
  metin = "Ücretsiz Kayıt Ol",
  mobilMetin,
}: {
  boyut?: keyof typeof BOYUT;
  okIsareti?: boolean;
  metin?: string;
  /** Verilirse 560px altinda bunun yerine bu metin gosterilir (CSS ile). */
  mobilMetin?: string;
}) {
  const manyetikRef = useManyetik();
  const o = BOYUT[boyut];
  return (
    <div ref={manyetikRef} style={{ display: "inline-block", transition: "transform 240ms var(--ease)" }}>
      <Link
        href="/register"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: o.h,
          padding: `0 ${o.px}px`,
          borderRadius: 999,
          background: "linear-gradient(135deg,#3B82F6,#1E40AF)",
          color: "#F8FAFC",
          fontSize: o.fs,
          fontWeight: 600,
          whiteSpace: "nowrap",
          boxShadow: "0 0 0 1px rgba(59,130,246,0.4), 0 8px 32px rgba(30,64,175,0.3)",
        }}
      >
        {mobilMetin ? (
          <>
            <span className="lp-cta-uzun">{metin}</span>
            <span className="lp-cta-kisa">{mobilMetin}</span>
          </>
        ) : (
          metin
        )}
        {okIsareti && <span aria-hidden="true">→</span>}
      </Link>
    </div>
  );
}

/* ── Bolum basligi (rozet + H2 + lede) ───────────────── */

export function BolumBasligi({
  rozet,
  baslik,
  lede,
  ledeGenislik = "62ch",
}: {
  rozet: string;
  baslik: string;
  lede: string;
  ledeGenislik?: string;
}) {
  const r = useReveal<HTMLDivElement>(0);
  const b = useReveal<HTMLHeadingElement>(60);
  const l = useReveal<HTMLParagraphElement>(120);

  return (
    <>
      <div ref={r.ref} data-reveal style={{ ...r.stil, marginBottom: 26 }}>
        <Rozet metin={rozet} />
      </div>
      <h2
        ref={b.ref}
        data-reveal
        style={{
          ...b.stil,
          textAlign: "center",
          fontFamily: "var(--font-geist)",
          fontSize: "clamp(30px,4.4vw,60px)",
          fontWeight: 800,
          letterSpacing: "-0.035em",
          lineHeight: 1.12,
          paddingBottom: "0.04em",
          color: "#F8FAFC",
          margin: "0 0 18px",
        }}
      >
        {baslik}
      </h2>
      <p
        ref={l.ref}
        data-reveal
        style={{
          ...l.stil,
          textAlign: "center",
          fontSize: 15,
          lineHeight: 1.65,
          color: "#94A3B8",
          maxWidth: ledeGenislik,
          margin: "0 0 clamp(40px,6vh,64px)",
        }}
      >
        {lede}
      </p>
    </>
  );
}

/** Bolum kabugu — ortak dolgu + 1280px kolon. */
export function Bolum({
  id,
  children,
  dolgu = "clamp(60px,10vh,120px)",
  ortala = true,
}: {
  id?: string;
  children: ReactNode;
  dolgu?: string;
  ortala?: boolean;
}) {
  return (
    <section
      id={id}
      style={{
        position: "relative",
        zIndex: 1,
        padding: `${dolgu} clamp(20px,3vw,36px)`,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          ...(ortala
            ? { display: "flex", flexDirection: "column", alignItems: "center" }
            : {}),
        }}
      >
        {children}
      </div>
    </section>
  );
}
