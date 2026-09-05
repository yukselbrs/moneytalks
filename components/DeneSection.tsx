"use client";

import { useEffect, useRef, useState } from "react";
import { CamKart, KayitButonu, useReveal } from "@/components/landing/parcalar";
import { formatCurrency, formatPercent } from "@/lib/formatters";

type Sonuc = {
  kod: string;
  fiyat: number;
  degisimYuzde: number | null;
  gunlukYuksek: number | null;
  gunlukDusuk: number | null;
};

const MADDELER = [
  "Kayıt olmadan fiyat sorgula",
  "Ücretsiz kayıt ile yapay zekâ analizi",
  "600+ BIST hissesi kapsamda",
];

function MetrikKutusu({ etiket, deger, renk }: { etiket: string; deger: string; renk: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--border-neutral-soft)",
        borderRadius: 12,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "#475569", marginBottom: 8 }}>
        {etiket}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: renk, fontVariantNumeric: "tabular-nums" }}>
        {deger}
      </div>
    </div>
  );
}

export default function DeneSection() {
  const sol = useReveal<HTMLDivElement>(0);
  const sag = useReveal<HTMLDivElement>(120);

  const [girdi, setGirdi] = useState("");
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [hatali, setHatali] = useState(false);
  const hataZamani = useRef(0);

  async function sorgula(ham: string) {
    const kod = ham.trim().toLocaleUpperCase("tr-TR");
    if (!kod) return;
    setYenileniyor(true);
    try {
      const res = await fetch(`/api/hisse-ozet?ticker=${encodeURIComponent(kod)}`);
      const veri = res.ok ? (await res.json())?.veri : null;
      if (!veri || typeof veri.fiyat !== "number") {
        setHatali(true);
        window.clearTimeout(hataZamani.current);
        hataZamani.current = window.setTimeout(() => setHatali(false), 1200);
        return;
      }
      setSonuc({
        kod,
        fiyat: veri.fiyat,
        degisimYuzde: veri.degisimYuzde ?? null,
        gunlukYuksek: veri.gunlukYuksek ?? null,
        gunlukDusuk: veri.gunlukDusuk ?? null,
      });
      setGirdi("");
    } catch {
      setHatali(true);
      window.clearTimeout(hataZamani.current);
      hataZamani.current = window.setTimeout(() => setHatali(false), 1200);
    } finally {
      // Degerler 200ms opaklik gecisiyle yenilenir.
      window.setTimeout(() => setYenileniyor(false), 180);
    }
  }

  useEffect(() => {
    sorgula("THYAO");
    return () => window.clearTimeout(hataZamani.current);
    // Yalniz mount'ta bir kez — varsayilan kart icerigi.
  }, []);

  const artis = (sonuc?.degisimYuzde ?? 0) >= 0;
  const degisimMetni = sonuc?.degisimYuzde === null || sonuc?.degisimYuzde === undefined
    ? "—"
    : `${artis ? "▲ " : "▼ "}${formatPercent(sonuc.degisimYuzde, { symbolPosition: "prefix", signDisplay: "never" })}`;
  const kod = sonuc?.kod ?? "THYAO";
  const deger: React.CSSProperties = {
    transition: "opacity 200ms var(--ease)",
    opacity: yenileniyor ? 0.35 : 1,
  };

  return (
    <section id="dene" style={{ position: "relative", zIndex: 1, padding: "clamp(60px,10vh,120px) clamp(20px,3vw,36px)" }}>
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(340px,100%),1fr))",
          gap: "clamp(32px,5vw,64px)",
          alignItems: "center",
        }}
      >
        <div ref={sol.ref} data-reveal style={sol.stil}>
          <h2
            style={{
              fontFamily: "var(--font-geist)",
              fontSize: "clamp(30px,4.2vw,56px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1.12,
              paddingBottom: "0.04em",
              color: "#F8FAFC",
              margin: "0 0 18px",
              maxWidth: "16ch",
            }}
          >
            Hemen dene, kayıt gerekmez
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94A3B8", margin: "0 0 30px", maxWidth: "46ch" }}>
            İstediğin BIST hissesini yaz, fiyat verisini gör. Yapay zekâ analizi için ücretsiz hesap
            oluştur.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 26 }}>
            <label htmlFor="dene-kod" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              Hisse kodu
            </label>
            <input
              id="dene-kod"
              className="lp-input"
              type="text"
              value={girdi}
              onChange={(e) => setGirdi(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sorgula(girdi);
              }}
              placeholder="THYAO, GARAN, ASELS..."
              style={{
                flex: "1 1 220px",
                minWidth: 0,
                height: 46,
                padding: "0 16px",
                borderRadius: 12,
                border: `1px solid ${hatali ? "var(--border-danger)" : "var(--border-input)"}`,
                background: "rgba(255,255,255,0.02)",
                color: "#F1F5F9",
                fontSize: 14,
                letterSpacing: "0.04em",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => sorgula(girdi)}
              style={{
                height: 46,
                padding: "0 22px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg,#3B82F6,#1E40AF)",
                color: "#F8FAFC",
                fontSize: 14,
                fontWeight: 600,
                boxShadow: "0 0 0 1px rgba(59,130,246,0.4), 0 8px 32px rgba(30,64,175,0.3)",
              }}
            >
              Fiyat Gör
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {MADDELER.map((m) => (
              <div key={m} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#3B82F6", flex: "none" }} />
                <span style={{ fontSize: 14, color: "#CBD5E1" }}>{m}</span>
              </div>
            ))}
          </div>
        </div>

        <div ref={sag.ref} data-reveal style={{ ...sag.stil, display: "flex", flexDirection: "column" }}>
          <CamKart style={{ width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div
                style={{
                  fontFamily: "var(--font-geist)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#F8FAFC",
                  letterSpacing: "0.02em",
                  marginBottom: 10,
                }}
              >
                {kod}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
                <span
                  style={{
                    ...deger,
                    fontSize: 30,
                    fontWeight: 800,
                    color: "#F8FAFC",
                    letterSpacing: "-0.6px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {sonuc ? formatCurrency(sonuc.fiyat) : "—"}
                </span>
                <span
                  style={{
                    ...deger,
                    fontSize: 13,
                    fontWeight: 700,
                    color: artis ? "#10B981" : "#EF4444",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {degisimMetni}
                </span>
              </div>

              <div
                style={{
                  ...deger,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(min(130px,100%),1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <MetrikKutusu
                  etiket="GÜNLÜK YÜKSEK"
                  deger={sonuc?.gunlukYuksek != null ? formatCurrency(sonuc.gunlukYuksek) : "—"}
                  renk="#10B981"
                />
                <MetrikKutusu
                  etiket="GÜNLÜK DÜŞÜK"
                  deger={sonuc?.gunlukDusuk != null ? formatCurrency(sonuc.gunlukDusuk) : "—"}
                  renk="#EF4444"
                />
              </div>

              <div
                style={{
                  marginTop: "auto",
                  border: "1px solid var(--border-neutral-soft)",
                  borderRadius: 14,
                  padding: 20,
                  textAlign: "center",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#94A3B8", margin: "0 0 16px" }}>
                  {kod} için yapay zekâ analizi görmek ister misin?
                </p>
                <KayitButonu okIsareti />
              </div>
            </div>
          </CamKart>
          <p style={{ fontSize: 11, color: "#334155", margin: "14px 0 0", textAlign: "center" }}>
            15 dk gecikmeli · Yatırım tavsiyesi değildir
          </p>
        </div>
      </div>
    </section>
  );
}
