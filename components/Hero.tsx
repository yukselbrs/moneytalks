"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import LogoIcon from "@/components/LogoIcon";
import { KayitButonu, useHareketCanvas } from "@/components/landing/parcalar";

const KODLAR = [
  "THYAO", "GARAN", "ASELS", "EREGL", "SISE", "AKBNK", "KCHOL", "TUPRS",
  "BIMAS", "SASA", "ISCTR", "XU100", "USD/TRY", "EUR/TRY", "GRAM ALTIN",
];

/** Giris animasyonu: 160ms taban + ogenin kendi ofseti. */
function girisStili(acik: boolean, gecikme: number): CSSProperties {
  return {
    opacity: acik ? 1 : 0,
    transform: acik ? "none" : "translateY(24px)",
    filter: acik ? "none" : "blur(7px)",
    transition:
      `opacity 850ms var(--ease) ${160 + gecikme}ms,` +
      `transform 950ms var(--ease) ${160 + gecikme}ms,` +
      `filter 850ms var(--ease) ${160 + gecikme}ms`,
  };
}

function KodSeridi({ gizli }: { gizli?: boolean }) {
  return (
    <div
      aria-hidden={gizli || undefined}
      style={{ display: "flex", alignItems: "center", gap: 30, padding: "12px 15px" }}
    >
      {KODLAR.map((kod, i) => (
        <span
          key={`${kod}-${i}`}
          style={{ fontSize: 11, fontWeight: 700, color: "#E2E8F0", letterSpacing: "0.05em", whiteSpace: "nowrap" }}
        >
          {kod}
        </span>
      ))}
    </div>
  );
}

export default function Hero() {
  const araziRef = useHareketCanvas("terrain");
  const [acik, setAcik] = useState(false);
  const [tekrar, setTekrar] = useState(1);
  const yariRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // rAF DEGIL: gizli sekmede rAF hic calismaz ve hero kalici gorunmez kalirdi.
    // Zamanlayici kisitli da olsa calisir, stil opacity:1'e yerlesir.
    const z = window.setTimeout(() => setAcik(true), 0);
    return () => window.clearTimeout(z);
  }, []);

  // Kesintisiz dongu icin her yari viewport'tan genis olmali; aksi halde
  // -%50 kaydirmada bosluk gorunur. Birim genisligi mevcut tekrardan turetilir,
  // boylece font yuklendikten sonra da kendini duzeltir.
  useEffect(() => {
    const hesapla = () => {
      const el = yariRef.current;
      if (!el) return;
      const birim = el.scrollWidth / tekrar;
      if (!birim) return;
      const gerekli = Math.max(1, Math.ceil((window.innerWidth * 1.15) / birim));
      if (gerekli !== tekrar) setTekrar(gerekli);
    };
    hesapla();
    window.addEventListener("resize", hesapla, { passive: true });
    return () => window.removeEventListener("resize", hesapla);
  }, [tekrar]);

  const yari = Array.from({ length: tekrar });

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "132px clamp(20px,3vw,36px) 0",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={araziRef}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 55% 40% at 50% 12%,rgba(30,64,175,0.20) 0%,transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "38%",
          pointerEvents: "none",
          background: "linear-gradient(180deg,transparent,rgba(15,23,42,0.75) 62%,var(--bg-primary) 100%)",
        }}
      />

      <div
        style={{
          ...girisStili(acik, 0),
          position: "relative",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "7px 14px 7px 11px",
          border: "1px solid rgba(59,130,246,0.18)",
          borderRadius: 999,
          background: "var(--surface-overlay)",
          marginBottom: "clamp(22px,4vh,38px)",
        }}
      >
        <span className="lp-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#60A5FA", flex: "none" }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: "#93C5FD", textAlign: "center" }}>
          BIST, FONLAR, DÖVİZ VE KIYMETLİ MADEN VERİLERİ
        </span>
      </div>

      <h1
        style={{
          position: "relative",
          zIndex: 3,
          textAlign: "center",
          fontFamily: "var(--font-geist)",
          fontSize: "clamp(36px,6.6vw,92px)",
          fontWeight: 800,
          // 1.08'in altina inilmez — Turkce alt uzantilar (s, c, g) kirpilir.
          lineHeight: 1.08,
          letterSpacing: "-0.045em",
          margin: "0 0 clamp(16px,2.6vh,26px)",
          maxWidth: "20ch",
          paddingBottom: "0.06em",
        }}
      >
        <span style={{ ...girisStili(acik, 90), display: "block", color: "#F8FAFC" }}>Borsa artık</span>
        <span className="gradient-text" style={{ ...girisStili(acik, 180), display: "block" }}>
          seninle konuşuyor
        </span>
      </h1>

      <p
        style={{
          ...girisStili(acik, 270),
          position: "relative",
          zIndex: 3,
          textAlign: "center",
          fontSize: "clamp(14px,1.2vw,18px)",
          lineHeight: 1.6,
          color: "#94A3B8",
          maxWidth: "56ch",
          margin: "0 0 clamp(24px,4vh,38px)",
        }}
      >
        Bilanço satırı, haber başlığı, teknik gösterge. Pako AI hepsini tek geçişte okur; çıktısı bir
        özet ve yönsüz bir risk notudur. Yön tarifi vermez.
      </p>

      <div style={{ ...girisStili(acik, 360), position: "relative", zIndex: 3 }}>
        <KayitButonu boyut="lg" okIsareti />
      </div>

      <div
        aria-hidden="true"
        style={{
          ...girisStili(acik, 480),
          position: "relative",
          zIndex: 3,
          marginTop: "clamp(28px,5vh,58px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          className="lp-beam"
          style={{
            width: 2,
            height: "clamp(40px,7vh,96px)",
            background: "linear-gradient(180deg,transparent,rgba(147,197,253,0.55))",
          }}
        />
        <div style={{ position: "relative", width: "clamp(58px,7vw,84px)", height: "clamp(58px,7vw,84px)" }}>
          <div
            className="lp-halo"
            style={{
              position: "absolute",
              inset: -30,
              borderRadius: "50%",
              background: "radial-gradient(circle,rgba(59,130,246,0.30) 0%,transparent 70%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 20,
              boxShadow: "0 0 28px rgba(59,130,246,0.35), 0 0 64px rgba(59,130,246,0.12)",
            }}
          >
            <LogoIcon size={84} aria-label="" style={{ width: "100%", height: "100%" }} />
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 3,
          width: "100vw",
          marginTop: "auto",
          borderTop: "1px solid rgba(59,130,246,0.10)",
          background: "rgba(15,23,42,0.6)",
          overflow: "hidden",
        }}
      >
        <div className="lp-tape" style={{ display: "flex", width: "max-content" }}>
          <div ref={yariRef} style={{ display: "flex" }}>
            {yari.map((_, i) => (
              <KodSeridi key={i} />
            ))}
          </div>
          <div style={{ display: "flex" }} aria-hidden="true">
            {yari.map((_, i) => (
              <KodSeridi key={i} gizli />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
