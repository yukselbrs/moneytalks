"use client";

import { useEffect, useRef, useState } from "react";

export default function AIShowcase() {
  const [ticker, setTicker] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [veri, setVeri] = useState<{ fiyat: number; gunlukYuksek: number; gunlukDusuk: number; oncekiKapanis: number } | null>(null);
  const [done, setDone] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [autoPlayed, setAutoPlayed] = useState(false);

  async function fetchDemo(t: string) {
    setLoading(true);
    setVeri(null);
    setDone(false);
    try {
      const res = await fetch("/api/analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t, veriOnly: true }),
      });
      const data = await res.json();
      if (data.veri) setVeri(data.veri);
      setTicker(t);
      setTimeout(() => setDone(true), 600);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !autoPlayed) {
          setAutoPlayed(true);
          fetchDemo("THYAO");
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [autoPlayed]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    fetchDemo(input.trim().toUpperCase());
    setInput("");
  }

  const degisim = veri && veri.oncekiKapanis
    ? (((veri.fiyat - veri.oncekiKapanis) / veri.oncekiKapanis) * 100)
    : null;

  return (
    <section className="relative py-28 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="h-px mb-28" style={{ background: "rgba(59,130,246,0.08)" }} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Sol */}
          <div>
            <p className="text-[10px] tracking-[0.3em] font-medium mb-4" style={{ color: "#60A5FA", fontFamily: "var(--font-manrope)" }}>
              CANLI DEMO
            </p>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6" style={{ color: "#F8FAFC", fontFamily: "var(--font-syne)" }}>
              Hemen dene, kayıt gerekmez
            </h2>
            <p className="text-[17px] leading-relaxed mb-8" style={{ color: "#64748B", fontFamily: "var(--font-manrope)" }}>
              İstediğin BIST hissesini yaz, gerçek fiyat verisini gör. Yapay zekâ analizi için ücretsiz hesap oluştur.
            </p>
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, marginBottom: 32 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder="THYAO, GARAN, ASELS..."
                style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#E2E8F0", outline: "none" }}
              />
              <button type="submit" disabled={loading}
                style={{ padding: "10px 20px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" }}>
                {loading ? "Yükleniyor..." : "Fiyat Gör"}
              </button>
            </form>
            <div className="flex flex-col gap-3">
              {["Gerçek Yahoo Finance fiyat verisi", "Ücretsiz kayıt ile yapay zekâ analizi", "500+ BIST hissesi kapsama"].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#3B82F6" }} />
                  <span className="text-sm" style={{ color: "#94A3B8", fontFamily: "var(--font-manrope)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sağ: demo kartı */}
          <div ref={cardRef} className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.18)", boxShadow: "0 0 60px rgba(30,64,175,0.12)", minHeight: 300 }}>
            {!ticker && !loading && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#334155", fontSize: 13 }}>
                Bir hisse kodu girin
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "80px 0", justifyContent: "center", color: "#475569", fontSize: 13 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", animation: `pulse 1.2s ${i*0.2}s infinite` }} />
                  ))}
                </div>
                Veri çekiliyor...
              </div>
            )}

            {!loading && veri && done && (
              <div style={{ opacity: 1, transition: "opacity 0.5s" }}>
                {/* Hisse başlık */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#F8FAFC" }}>{ticker}</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: "#E2E8F0", marginTop: 2 }}>
                      {veri.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                      {degisim !== null && (
                        <span style={{ fontSize: 13, fontWeight: 500, color: degisim >= 0 ? "#1D9E75" : "#E24B4A", marginLeft: 8 }}>
                          {degisim >= 0 ? "▲" : "▼"} %{Math.abs(degisim).toFixed(2).replace(".", ",")}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 9, color: "#475569", border: "1px solid rgba(71,85,105,0.2)", borderRadius: 4, padding: "3px 8px", letterSpacing: "0.1em" }}>DEMO</span>
                </div>

                {/* Metrikler */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                  <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Günlük Yüksek</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1D9E75" }}>{veri.gunlukYuksek.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
                  </div>
                  <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Günlük Düşük</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#E24B4A" }}>{veri.gunlukDusuk.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
                  </div>
                </div>

                {/* Yapay zeka analizi için CTA */}
                <div style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 10 }}>
                    {ticker} için yapay zekâ analizi görmek ister misin?
                  </div>
                  <a href="/register" style={{ display: "inline-block", padding: "8px 20px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    Ücretsiz Kayıt Ol →
                  </a>
                </div>

                <p style={{ marginTop: 12, textAlign: "center", fontSize: 10, color: "#1E293B" }}>
                  15 dk gecikmeli · Yatırım tavsiyesi değildir
                </p>
              </div>
            )}

            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(30,64,175,0.15), transparent 70%)" }} />
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
    </section>
  );
}
