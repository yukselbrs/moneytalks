"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// EGITIM sahne altyapisi — TUM interaktif egitimlerin ortak kiti.
// Once app/viop-nedir/parcalar.tsx idi; Forward Nedir de ayni kiti kullandigi icin
// components/egitim/ altina tasindi (icerik/davranis birebir ayni, sadece konum degisti).
// Plan: viop-nedir-teknik-plan.md · Sifir yeni bagimlilik: saf CSS transition + rAF sayac.

export function azaltilmisHareket(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Rect-tabanli gorunurluk (IntersectionObserver DEGIL): bazi gomulu tarayici/pane ortamlarinda
// IO callback'leri askida kaliyor (dogrulandi); passive scroll + tek rect olcumu her yerde deterministik.
export function useSahneAktif() {
  const ref = useRef<HTMLElement>(null);
  const [aktif, setAktif] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (azaltilmisHareket()) { void Promise.resolve().then(() => setAktif(true)); return; }
    let bitti = false;
    const kontrol = () => {
      if (bitti || !el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // sahnenin ust kenari ekranin %65'inin uzerine ciktiginda aktifles (bir kez)
      if (r.top < vh * 0.65 && r.bottom > vh * 0.25) {
        bitti = true;
        setAktif(true);
        window.removeEventListener("scroll", kontrol);
        window.removeEventListener("resize", kontrol);
      }
    };
    kontrol();
    window.addEventListener("scroll", kontrol, { passive: true });
    window.addEventListener("resize", kontrol, { passive: true });
    return () => {
      window.removeEventListener("scroll", kontrol);
      window.removeEventListener("resize", kontrol);
    };
  }, []);
  return { ref, aktif };
}

// Sahne: min-h-100svh bolum sarmalayicisi; aktiflesince cocuk satirlar kademeli fade-up.
export function Sahne({ id, etiket, baslik, ton = "notr", children }: {
  id: string;
  etiket: string;
  baslik: string;
  ton?: "notr" | "kar" | "zarar" | "uyari";
  children: ReactNode;
}) {
  const { ref, aktif } = useSahneAktif();
  const glow = ton === "kar" ? "rgba(16,185,129,0.07)" : ton === "zarar" ? "rgba(239,68,68,0.07)" : ton === "uyari" ? "rgba(245,158,11,0.08)" : "rgba(59,130,246,0.06)";
  return (
    <section ref={ref as React.RefObject<HTMLElement>} id={id} data-aktif={aktif}
      className="vn-sahne"
      style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", padding: "72px 20px", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 50% at 50% 45%, ${glow}, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 680, position: "relative" }}>
        <p className="vn-satir" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(96,165,250,0.75)", margin: "0 0 6px" }}>{etiket}</p>
        <h2 className="vn-satir" style={{ fontSize: 26, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.4px", margin: "0 0 18px", transitionDelay: "80ms" }}>{baslik}</h2>
        {children}
      </div>
    </section>
  );
}

// Satir: sahne icinde kademeli beliren metin/blok. gecikme = kacinci sira (0,1,2...)
export function Satir({ sira = 0, children, style }: { sira?: number; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="vn-satir" style={{ transitionDelay: `${160 + sira * 110}ms`, fontSize: 16, lineHeight: 1.75, color: "#CBD5E1", marginBottom: 12, ...style }}>
      {children}
    </div>
  );
}

// rAF sayi sayaci — dashboard skor sayaci deseninin genellestirilmisi.
export function Sayac({ hedef, aktif, format, sure = 900, style }: {
  hedef: number;
  aktif: boolean;
  format: (v: number) => string;
  sure?: number;
  style?: React.CSSProperties;
}) {
  const [deger, setDeger] = useState(0);
  const basladi = useRef(false);
  useEffect(() => {
    if (!aktif || basladi.current) return;
    basladi.current = true;
    if (azaltilmisHareket()) { void Promise.resolve().then(() => setDeger(hedef)); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min((performance.now() - t0) / sure, 1);
      setDeger(hedef * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [aktif, hedef, sure]);
  return <span aria-live="polite" style={{ fontVariantNumeric: "tabular-nums", ...style }}>{format(deger)}</span>;
}

// SoruKarti — RiskProfilWidget soru/secenek deseninden uyarlama.
export function SoruKarti({ soru, secenekler, dogruIndex, geriBildirim, sira = 4 }: {
  soru: string;
  secenekler: string[];
  dogruIndex?: number;              // tanimliysa tahmin sorusu (dogru/yanlis rozeti)
  geriBildirim?: (secilen: number) => string;
  sira?: number;
}) {
  const [secilen, setSecilen] = useState<number | null>(null);
  return (
    <Satir sira={sira}>
      <div className="card-glass" style={{ borderRadius: 12, padding: "16px 18px", marginTop: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", margin: "0 0 12px" }}>{soru}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {secenekler.map((s, i) => {
            const secildiMi = secilen === i;
            const dogruMu = dogruIndex !== undefined && secilen !== null && i === dogruIndex;
            return (
              <button key={s} onClick={() => setSecilen(i)} disabled={secilen !== null}
                style={{
                  minHeight: 44, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: secilen === null ? "pointer" : "default",
                  background: dogruMu ? "rgba(16,185,129,0.15)" : secildiMi ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${dogruMu ? "rgba(16,185,129,0.45)" : secildiMi ? "rgba(59,130,246,0.45)" : "rgba(148,163,184,0.15)"}`,
                  color: dogruMu ? "#6EE7B7" : secildiMi ? "#93C5FD" : "#CBD5E1",
                  transition: "all 0.15s",
                }}>
                {s}{dogruMu ? " ✓" : ""}
              </button>
            );
          })}
        </div>
        {secilen !== null && geriBildirim && (
          <p style={{ fontSize: 13, color: "#94A3B8", margin: "12px 0 0", lineHeight: 1.6 }}>{geriBildirim(secilen)}</p>
        )}
      </div>
    </Satir>
  );
}

// Ilerleme rayi — sag kenarda bolum noktalari.
export function IlerlemeRayi({ bolumler }: { bolumler: { id: string; ad: string }[] }) {
  const [aktifId, setAktifId] = useState(bolumler[0]?.id);
  useEffect(() => {
    const kontrol = () => {
      const orta = window.innerHeight / 2;
      let enYakin: { id: string; mesafe: number } | null = null;
      for (const b of bolumler) {
        const el = document.getElementById(b.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const merkez = r.top + r.height / 2;
        const mesafe = Math.abs(merkez - orta);
        if (!enYakin || mesafe < enYakin.mesafe) enYakin = { id: b.id, mesafe };
      }
      if (enYakin) setAktifId(enYakin.id);
    };
    kontrol();
    window.addEventListener("scroll", kontrol, { passive: true });
    return () => window.removeEventListener("scroll", kontrol);
  }, [bolumler]);
  return (
    <nav aria-label="Bölümler" className="vn-ray" style={{ position: "fixed", right: 14, top: "50%", transform: "translateY(-50%)", zIndex: 40, display: "flex", flexDirection: "column", gap: 10 }}>
      {bolumler.map(b => (
        <a key={b.id} href={`#${b.id}`} title={b.ad} aria-label={b.ad}
          onClick={e => { e.preventDefault(); document.getElementById(b.id)?.scrollIntoView({ behavior: azaltilmisHareket() ? "auto" : "smooth" }); }}
          style={{ width: 10, height: 10, borderRadius: "50%", background: aktifId === b.id ? "#3B82F6" : "rgba(148,163,184,0.25)", border: "1px solid rgba(148,163,184,0.2)", transition: "background 0.2s", display: "block" }} />
      ))}
    </nav>
  );
}

// Ikiz kiyas karti (B5/B6): hisse vs VIOP.
export function IkizKart({ aktif, sol, sag }: {
  aktif: boolean;
  sol: { baslik: string; satirlar: [string, ReactNode][] };
  sag: { baslik: string; satirlar: [string, ReactNode][]; ton: "kar" | "zarar" };
}) {
  const tonRenk = sag.ton === "kar" ? "#10B981" : "#EF4444";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="vn-ikiz">
      {[{ ...sol, vurgu: false }, { ...sag, vurgu: true }].map((k, idx) => (
        <div key={k.baslik} className="card-glass" style={{ borderRadius: 12, padding: "16px 18px", border: k.vurgu ? `1px solid ${tonRenk}44` : undefined, opacity: aktif ? 1 : 0, transform: aktif ? "none" : "translateY(14px)", transition: `all 0.5s ease ${idx * 0.12 + 0.3}s` }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: k.vurgu ? tonRenk : "#64748B", margin: "0 0 10px" }}>{k.baslik}</p>
          {k.satirlar.map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, marginBottom: 6 }}>
              <span style={{ color: "#64748B" }}>{l}</span>
              <span style={{ color: "#E2E8F0", fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
