"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";

const metrics = [
  { label: "Teknik Görünüm", value: "Güçlü" },
  { label: "Sentiment", value: "Olumlu" },
  { label: "Fiyat Bandı", value: "₺376 – ₺395" },
];

const summaryText =
  "THYAO, güçlü yolcu büyümesi ve operasyonel verimlilik artışıyla desteklenen pozitif bir teknik yapı içinde. Son seanslarda hacim artışı kurumsal ilgiyi işaret ediyor. Kısa vadeli momentum olumlu.";

export default function AIShowcase() {
  const [revealed, setRevealed] = useState(false);
  const [thinking, setThinking] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setThinking(false), 1200);
          setTimeout(() => setRevealed(true), 1500);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative py-28 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="h-px mb-28" style={{ background: "rgba(59,130,246,0.08)" }} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: copy */}
          <div className="pt-8">
            <p
              className="text-[10px] tracking-[0.3em] font-medium mb-4"
              style={{ color: "#60A5FA", fontFamily: "var(--font-manrope)" }}
            >
              AI ANALİZ MOTORU
            </p>
            <h2
              className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6"
              style={{ color: "#F8FAFC", fontFamily: "var(--font-syne)" }}
            >
              Saniyeler içinde derin analiz
            </h2>
            <p
              className="text-[17px] leading-relaxed mb-8"
              style={{ color: "#64748B", fontFamily: "var(--font-manrope)" }}
            >
              Yapay zekâ motorumuz her hisse için teknik göstergeleri, temel finansal veriyi ve
              haber akışını eş zamanlı değerlendirerek tek bir net çıktı üretir.
            </p>
            <div className="flex flex-col gap-3">
              {[
                "Borsa İstanbul resmi veri akışı",
                "Gerçek zamanlı sentiment tarama",
                "Teknik + temel hibrit model",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "#3B82F6" }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: mock UI card */}
          <div
            ref={cardRef}
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: "#0B1220",
              border: "1px solid rgba(59,130,246,0.18)",
              boxShadow: "0 0 60px rgba(30,64,175,0.12)",
            }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(59,130,246,0.1)",
                    border: "1px solid rgba(59,130,246,0.2)",
                  }}
                >
                  <TrendingUp size={16} strokeWidth={1.5} color="#60A5FA" />
                </div>
                <div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "#F8FAFC", fontFamily: "var(--font-syne)" }}
                  >
                    THYAO
                  </div>
                  <div
                    className="text-[10px] tracking-wider"
                    style={{ color: "#475569", fontFamily: "var(--font-manrope)" }}
                  >
                    Türk Hava Yolları
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* ÖRNEK badge */}
                <span
                  className="px-2 py-0.5 rounded text-[9px] tracking-widest uppercase"
                  style={{
                    background: "rgba(71,85,105,0.3)",
                    color: "#64748B",
                    border: "1px solid rgba(71,85,105,0.2)",
                    fontFamily: "var(--font-manrope)",
                  }}
                >
                  ÖRNEK
                </span>

                {/* Signal badge */}
                <div
                  className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-500"
                  style={{
                    background: revealed
                      ? "rgba(34,197,94,0.1)"
                      : "rgba(59,130,246,0.08)",
                    border: revealed
                      ? "1px solid rgba(34,197,94,0.3)"
                      : "1px solid rgba(59,130,246,0.15)",
                    color: revealed ? "#4ADE80" : "#60A5FA",
                    fontFamily: "var(--font-manrope)",
                  }}
                >
                  {revealed ? "GÜÇLÜ AL" : "ANALİZ EDİLİYOR"}
                </div>
              </div>
            </div>

            {/* Summary box */}
            <div
              className="rounded-xl p-4 mb-5 min-h-[88px] flex items-center"
              style={{
                background: "rgba(15,23,42,0.6)",
                border: "1px solid rgba(59,130,246,0.08)",
              }}
            >
              {thinking ? (
                <div className="flex gap-1.5 pl-1">
                  <div
                    className="thinking-dot w-2 h-2 rounded-full"
                    style={{ background: "#3B82F6" }}
                  />
                  <div
                    className="thinking-dot w-2 h-2 rounded-full"
                    style={{ background: "#3B82F6" }}
                  />
                  <div
                    className="thinking-dot w-2 h-2 rounded-full"
                    style={{ background: "#3B82F6" }}
                  />
                </div>
              ) : (
                <p
                  className="text-[13px] leading-relaxed transition-opacity duration-500"
                  style={{
                    color: "#94A3B8",
                    fontFamily: "var(--font-manrope)",
                    opacity: revealed ? 1 : 0,
                  }}
                >
                  {summaryText}
                </p>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3">
              {metrics.map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg p-3"
                  style={{
                    background: "rgba(15,23,42,0.6)",
                    border: "1px solid rgba(59,130,246,0.08)",
                  }}
                >
                  <div
                    className="text-[9px] tracking-widest mb-1.5 uppercase"
                    style={{ color: "#475569", fontFamily: "var(--font-manrope)" }}
                  >
                    {label}
                  </div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "#F8FAFC", fontFamily: "var(--font-manrope)" }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <p
              className="mt-4 text-center text-[10px]"
              style={{ color: "#475569", fontFamily: "var(--font-manrope)" }}
            >
              Temsili örnek · Yatırım tavsiyesi değildir
            </p>

            {/* Corner glow */}
            <div
              className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(30,64,175,0.15), transparent 70%)",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
