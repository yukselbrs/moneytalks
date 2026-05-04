"use client";

import { useEffect, useRef, useState } from "react";

interface HeroProps {
  heroVideo: string;
}

export default function Hero({ heroVideo }: HeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number | null>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!videoRef.current || !sectionRef.current || prefersReducedMotion) return;
    const video = videoRef.current;
    const section = sectionRef.current;
    video.pause();

    const updateFrame = () => {
      if (!video.duration) return;
      const rect = section.getBoundingClientRect();
      const sectionHeight = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.min(Math.max(-rect.top / sectionHeight, 0), 1);
      const targetTime = progress * video.duration;
      if (Math.abs(video.currentTime - targetTime) > 0.04) {
        video.currentTime = targetTime;
      }
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        updateFrame();
        rafRef.current = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateFrame();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full flex items-start justify-center"
      style={{ minHeight: "100vh", paddingTop: "64px" }}
    >
      <div className="relative w-full min-h-screen flex items-center overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 60% 50%, rgba(30,64,175,0.18) 0%, transparent 70%)",
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-0">
          {/* Left: Text */}
          <div className="flex-1 max-w-xl lg:max-w-2xl pt-16 lg:pt-0">
            {/* Eyebrow */}
            <div className="animate-fade-up delay-100 inline-flex items-center gap-2 mb-8">
              <span
                className="animate-pulse-dot inline-block w-2 h-2 rounded-full"
                style={{ background: "#60A5FA" }}
              />
              <span
                className="text-[10px] tracking-[0.3em] font-medium"
                style={{ color: "#60A5FA", fontFamily: "var(--font-manrope)" }}
              >
                CANLI · BIST İLE SENKRON
              </span>
            </div>

            {/* Headline */}
            <h1
              className="animate-fade-up delay-200 text-5xl lg:text-[72px] leading-[1.05] font-bold tracking-tight mb-6"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              <span style={{ color: "#F8FAFC" }}>Borsa artık</span>
              <br />
              <span className="gradient-text">seninle konuşuyor.</span>
            </h1>

            {/* Subheadline */}
            <p
              className="animate-fade-up delay-300 text-[17px] leading-relaxed mb-10 max-w-[520px]"
              style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}
            >
              Yapay zekâ destekli analiz motorumuz, BIST&apos;teki her hisseyi saniyede bir
              değerlendirir. Finansal veriyi, piyasa duyarlılığını ve teknik göstergeleri
              birleştirip anlaşılır bir bilgi özeti sunar.
            </p>

            {/* CTAs */}
            <div className="animate-fade-up delay-400 flex flex-col sm:flex-row gap-4 mb-12">
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)",
                  color: "#F8FAFC",
                  fontFamily: "var(--font-manrope)",
                  boxShadow:
                    "0 0 0 1px rgba(59,130,246,0.4), 0 8px 32px rgba(30,64,175,0.3)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 30px rgba(59,130,246,0.5), 0 0 0 1px rgba(96,165,250,0.5)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 0 1px rgba(59,130,246,0.4), 0 8px 32px rgba(30,64,175,0.3)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                Erken erişim listesine katıl →
              </a>
              <a
                href="#nasil-calisir"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-medium transition-all duration-300"
                style={{
                  color: "#94A3B8",
                  border: "1px solid rgba(59,130,246,0.25)",
                  fontFamily: "var(--font-manrope)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#F8FAFC";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(59,130,246,0.5)";
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(59,130,246,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#94A3B8";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(59,130,246,0.25)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                Nasıl çalışır?
              </a>
            </div>

            {/* Trust strip */}
            <div className="animate-fade-up delay-500">
              <div className="h-px mb-6" style={{ background: "rgba(59,130,246,0.12)" }} />
              <div className="flex flex-wrap gap-6">
                {["600+ BIST HİSSE", "YAPAY ZEKÂ DESTEKLİ", "ERKEN ERİŞİM AÇIK"].map(
                  (item) => (
                    <span
                      key={item}
                      className="text-[10px] tracking-[0.22em] font-medium"
                      style={{ color: "#475569", fontFamily: "var(--font-manrope)" }}
                    >
                      {item}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Right: Video */}
          <div className="flex-1 flex items-center justify-center lg:justify-end">
            {prefersReducedMotion ? (
              <video
                muted
                playsInline
                preload="metadata"
                poster="/parakonusur_hero_poster.jpg"
                className="w-full max-w-lg rounded-2xl"
                style={{ border: "1px solid rgba(59,130,246,0.15)" }}
              >
                <source src={heroVideo} type="video/mp4" />
              </video>
            ) : (
              <video
                ref={videoRef}
                muted
                playsInline
                preload="auto"
                poster="/parakonusur_hero_poster.jpg"
                className="w-full max-w-lg rounded-2xl"
                style={{ border: "1px solid rgba(59,130,246,0.15)" }}
              >
                <source src={heroVideo} type="video/mp4" />
              </video>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
