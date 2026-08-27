"use client";

import { KayitButonu, useHareketCanvas, useReveal } from "@/components/landing/parcalar";

export default function KayitCTA() {
  const ctaRef = useHareketCanvas("cta");
  const { ref, stil } = useReveal<HTMLDivElement>(0);

  return (
    <section
      id="kayit"
      style={{ position: "relative", zIndex: 1, padding: "0 clamp(20px,3vw,36px) clamp(70px,10vh,120px)" }}
    >
      <div
        ref={ref}
        data-reveal
        style={{
          ...stil,
          position: "relative",
          maxWidth: 1280,
          margin: "0 auto",
          border: "1px solid rgba(59,130,246,0.14)",
          borderRadius: 20,
          overflow: "hidden",
          background: "var(--surface-glass)",
          backdropFilter: "blur(12px)",
          padding: "clamp(44px,9vh,104px) clamp(24px,4vw,64px)",
          textAlign: "center",
        }}
      >
        <canvas
          ref={ctaRef}
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", opacity: 0.75 }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 60% 90% at 50% 130%,rgba(30,64,175,0.30),transparent 70%)",
          }}
        />
        <div style={{ position: "relative" }}>
          <h2
            style={{
              fontFamily: "var(--font-geist)",
              fontSize: "clamp(30px,5vw,68px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.12,
              paddingBottom: "0.04em",
              color: "#F8FAFC",
              margin: "0 auto 16px",
              maxWidth: "20ch",
            }}
          >
            Kayıt ol, hepsi ücretsiz.
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#94A3B8", margin: "0 auto 30px", maxWidth: "48ch" }}>
            600+ enstrüman, AI özet raporları ve risk notları. Kart bilgisi istemiyoruz, deneme süresi
            yok.
          </p>
          <KayitButonu boyut="lg" okIsareti />
        </div>
      </div>
    </section>
  );
}
