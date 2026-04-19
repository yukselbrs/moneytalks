"use client";

import { useState } from "react";

export default function WaitlistCTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bir hata oluştu. Lütfen tekrar deneyin.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="waitlist" className="relative py-36 px-6 lg:px-8 overflow-hidden">
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(30,64,175,0.2) 0%, transparent 70%)",
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <p
          className="text-[10px] tracking-[0.3em] font-medium mb-5"
          style={{ color: "#60A5FA", fontFamily: "var(--font-manrope)" }}
        >
          ERKEN ERIŞIM
        </p>
        <h2
          className="text-4xl lg:text-5xl font-bold tracking-tight mb-5"
          style={{ color: "#F8FAFC", fontFamily: "var(--font-syne)" }}
        >
          Erken erişim fırsatını
          <br />
          kaçırmayın
        </h2>
        <p
          className="text-lg mb-10"
          style={{ color: "#64748B", fontFamily: "var(--font-manrope)" }}
        >
          Listeye katılın, ürün hazır olduğunda ilk siz haberdar olun.
        </p>

        {submitted ? (
          <div
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.25)",
            }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: "#4ADE80" }} />
            <span
              className="text-sm font-medium"
              style={{ color: "#4ADE80", fontFamily: "var(--font-manrope)" }}
            >
              Listeye eklendiniz. Haberdar edeceğiz.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <label htmlFor="waitlist-email" className="sr-only">
                E-posta adresiniz
              </label>
              <input
                id="waitlist-email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={!!error}
                aria-describedby={error ? "waitlist-error" : undefined}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="E-posta adresiniz"
                className="flex-1 max-w-sm px-5 py-3.5 rounded-full text-sm outline-none transition-all duration-300"
                style={{
                  background: "rgba(11,18,32,0.8)",
                  border: error
                    ? "1px solid rgba(239,68,68,0.5)"
                    : "1px solid rgba(59,130,246,0.2)",
                  color: "#F8FAFC",
                  fontFamily: "var(--font-manrope)",
                }}
                onFocus={(e) => {
                  if (!error) e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)";
                }}
                onBlur={(e) => {
                  if (!error) e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)";
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !email}
                className="px-6 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap"
                style={{
                  background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)",
                  color: "#F8FAFC",
                  fontFamily: "var(--font-manrope)",
                  boxShadow: "0 0 0 1px rgba(59,130,246,0.4), 0 8px 32px rgba(30,64,175,0.3)",
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? "wait" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (isLoading) return;
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
                {isLoading ? "Gönderiliyor..." : "Listeye Katıl →"}
              </button>
            </div>

            {/* KVKK consent microcopy */}
            <p
              className="mt-4 text-[11px] leading-relaxed max-w-md mx-auto"
              style={{ color: "#475569", fontFamily: "var(--font-manrope)" }}
            >
              Formu göndererek{" "}
              <a
                href="/kvkk"
                className="underline underline-offset-2"
                style={{ color: "#64748B" }}
              >
                KVKK Aydınlatma Metni
              </a>
              &apos;ni okuduğunuzu kabul edersiniz.
            </p>

            {error && (
              <p
                id="waitlist-error"
                role="alert"
                className="mt-3 text-xs"
                style={{ color: "rgba(239,68,68,0.8)", fontFamily: "var(--font-manrope)" }}
              >
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
