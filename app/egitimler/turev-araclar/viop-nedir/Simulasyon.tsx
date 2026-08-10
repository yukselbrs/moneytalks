"use client";

import { useReducer } from "react";
import Link from "next/link";
import { Sayac } from "@/components/egitim/parcalar";
import { SuBardagiSVG } from "./svg";

// B11 mini simulasyon — akis semasi: viop-nedir-icerik-plani.md (SEC → ZAR_AT → sonuc → cagri karari → karne).
// Math.random yalniz ZAR_AT aksiyonunda (event handler) — SSR/hydration guvenli.

type Secim = "hisse" | "long" | "short";
type Senaryo = "A" | "B"; // A: +%3 yukselis, B: -%6 dusus

type Durum = {
  adim: 1 | 2 | 3 | 4 | 5;
  secim: Secim | null;
  senaryo: Senaryo | null;
  ekTeminat: boolean | null; // cagri kararinda: true=yatirdi, false=yatirmadi
};

type Aksiyon =
  | { tip: "SEC"; secim: Secim }
  | { tip: "ZAR_AT" }
  | { tip: "TEMINAT_YATIR" }
  | { tip: "POZISYON_KAPAT" }
  | { tip: "SIFIRLA" };

const BASLANGIC: Durum = { adim: 1, secim: null, senaryo: null, ekTeminat: null };

function reducer(d: Durum, a: Aksiyon): Durum {
  switch (a.tip) {
    case "SEC": return { ...BASLANGIC, adim: 2, secim: a.secim };
    case "ZAR_AT": {
      const senaryo: Senaryo = Math.random() < 0.5 ? "A" : "B";
      const cagri = d.secim === "long" && senaryo === "B";
      return { ...d, adim: cagri ? 4 : 5, senaryo };
    }
    case "TEMINAT_YATIR": return { ...d, adim: 5, ekTeminat: true };
    case "POZISYON_KAPAT": return { ...d, adim: 5, ekTeminat: false };
    case "SIFIRLA": return BASLANGIC;
  }
}

// Sonuc tablosu (icerik planindaki degerler): pozisyon 100.000; hisse tam para, long/short teminat 10.000.
function sonucHesapla(secim: Secim, senaryo: Senaryo) {
  const hareket = senaryo === "A" ? 0.03 : -0.06;
  const pozisyonFark = 100000 * hareket; // +3000 / -6000
  if (secim === "hisse") return { fark: pozisyonFark, taban: 100000, oran: hareket * 100 };
  const yon = secim === "long" ? 1 : -1;
  const fark = pozisyonFark * yon;
  return { fark, taban: 10000, oran: (fark / 10000) * 100 };
}

const tl = (v: number) => `${Math.round(Math.abs(v)).toLocaleString("tr-TR")} ₺`;
const isaretliTl = (v: number) => `${v < 0 ? "−" : "+"}${tl(v)}`;
const isaretliYuzde = (v: number) => `${v < 0 ? "−" : "+"}%${Math.abs(v).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;

const SECIMLER: { kod: Secim; ad: string; alt: string; detay: string }[] = [
  { kod: "hisse", ad: "THYAO Hissesi", alt: "100.000 ₺ bağlanır", detay: "Tanıdık yol: parayla hisse alırsın." },
  { kod: "long", ad: "VİOP Long", alt: "Teminat 10.000 ₺ · pozisyon 100.000 ₺", detay: "Yükseliş yönlü kaldıraçlı pozisyon." },
  { kod: "short", ad: "VİOP Short", alt: "Teminat 10.000 ₺ · pozisyon 100.000 ₺", detay: "Düşüş yönlü kaldıraçlı pozisyon." },
];

function KutuBaslik({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B", margin: "0 0 10px" }}>{children}</p>;
}

export default function Simulasyon() {
  const [d, gonder] = useReducer(reducer, BASLANGIC);
  const sonuc = d.secim && d.senaryo ? sonucHesapla(d.secim, d.senaryo) : null;
  const zarar = (sonuc?.fark ?? 0) < 0;
  const renk = zarar ? "#EF4444" : "#10B981";

  return (
    <div className="card-glass" style={{ borderRadius: 14, padding: "20px 20px 22px" }}>
      <p style={{ fontSize: 14, color: "#CBD5E1", lineHeight: 1.7, margin: "0 0 16px" }}>
        Sanal <strong style={{ color: "#F1F5F9" }}>100.000 ₺</strong>&apos;n var. Gerçek para değil — ama mekanizma gerçek. Bir yol seç:
      </p>

      {/* ADIM 1: secim kartlari */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 16 }}>
        {SECIMLER.map(s => {
          const secili = d.secim === s.kod;
          return (
            <button key={s.kod} onClick={() => gonder({ tip: "SEC", secim: s.kod })}
              style={{
                textAlign: "left", padding: "14px 16px", borderRadius: 12, cursor: "pointer", minHeight: 44,
                background: secili ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${secili ? "rgba(59,130,246,0.5)" : "rgba(148,163,184,0.14)"}`,
                transition: "all 0.15s",
              }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: secili ? "#93C5FD" : "#E2E8F0", margin: 0 }}>{s.ad}{secili ? " ✓" : ""}</p>
              <p style={{ fontSize: 11.5, color: "#64748B", margin: "4px 0 0" }}>{s.alt}</p>
              <p style={{ fontSize: 11.5, color: "#475569", margin: "2px 0 0" }}>{s.detay}</p>
            </button>
          );
        })}
      </div>

      {/* ADIM 2: zar */}
      {d.adim === 2 && (
        <button onClick={() => gonder({ tip: "ZAR_AT" })}
          style={{ width: "100%", minHeight: 46, borderRadius: 10, background: "linear-gradient(135deg, #2563EB, #3B82F6)", border: "1px solid rgba(59,130,246,0.5)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          🎲 Piyasayı çalıştır — ne olacağını kimse bilmiyor
        </button>
      )}

      {/* ADIM 3/5: senaryo + sonuc */}
      {d.senaryo && sonuc && (
        <div style={{ marginTop: 4 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.14)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
            <KutuBaslik>Senaryo</KutuBaslik>
            <p style={{ fontSize: 15, fontWeight: 700, color: d.senaryo === "A" ? "#10B981" : "#EF4444", margin: 0 }}>
              {d.senaryo === "A" ? "THYAO %3 yükseldi" : "THYAO %6 düştü"}
            </p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${renk}44`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
            <KutuBaslik>Senin sonucun</KutuBaslik>
            <p style={{ fontSize: 24, fontWeight: 800, color: renk, margin: 0 }}>
              {sonuc.fark < 0 ? "−" : "+"}<Sayac hedef={Math.abs(sonuc.fark)} aktif format={v => tl(v)} />
              <span style={{ fontSize: 14, marginLeft: 10, fontWeight: 700 }}>({isaretliYuzde(sonuc.oran)} {d.secim === "hisse" ? "paranın" : "teminatının"})</span>
            </p>
            {d.secim !== "hisse" && (
              <p style={{ fontSize: 12.5, color: "#94A3B8", margin: "8px 0 0", lineHeight: 1.6 }}>
                Kıyas: aynı senaryoda hisse yatırımcısı {isaretliTl(100000 * (d.senaryo === "A" ? 0.03 : -0.06))} görürdü ({isaretliYuzde(d.senaryo === "A" ? 3 : -6)}).
              </p>
            )}
          </div>
        </div>
      )}

      {/* ADIM 4: teminat cagrisi karari */}
      {d.adim === 4 && (
        <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
          <KutuBaslik>⚠️ Teminat tamamlama çağrısı</KutuBaslik>
          <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 8px" }}>
            <div data-aktif="true"><SuBardagiSVG aktif /></div>
          </div>
          <p style={{ fontSize: 13.5, color: "#FCD34D", lineHeight: 1.65, margin: "0 0 12px" }}>
            Zarar teminatını sürdürme seviyesinin altına indirdi (10.000 → 4.000 ₺). Aracı kurum ek teminat istiyor: <strong>5.000 ₺</strong>.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => gonder({ tip: "TEMINAT_YATIR" })}
              style={{ flex: 1, minWidth: 150, minHeight: 44, borderRadius: 10, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.5)", color: "#93C5FD", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              5.000 ₺ yatır — pozisyon devam
            </button>
            <button onClick={() => gonder({ tip: "POZISYON_KAPAT" })}
              style={{ flex: 1, minWidth: 150, minHeight: 44, borderRadius: 10, background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.3)", color: "#CBD5E1", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Yatırma — pozisyon kapansın
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: "#94A3B8", margin: "10px 0 0" }}>İki seçenek de meşru — bu bir bilgi kararı, doğru/yanlış cevabı yok.</p>
        </div>
      )}

      {/* ADIM 5: karne */}
      {d.adim === 5 && d.secim && d.senaryo && sonuc && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 12, padding: "16px 18px" }}>
          <KutuBaslik>Simülasyon karnesi</KutuBaslik>
          <div style={{ fontSize: 13.5, color: "#CBD5E1", lineHeight: 1.9 }}>
            <div>Seçimin: <strong style={{ color: "#F1F5F9" }}>{SECIMLER.find(s => s.kod === d.secim)?.ad}</strong></div>
            <div>Senaryo: <strong style={{ color: d.senaryo === "A" ? "#10B981" : "#EF4444" }}>{d.senaryo === "A" ? "+%3 yükseliş" : "−%6 düşüş"}</strong></div>
            <div>Sonuç: <strong style={{ color: renk }}>{isaretliTl(sonuc.fark)} ({isaretliYuzde(sonuc.oran)} {d.secim === "hisse" ? "paranın" : "teminatının"})</strong></div>
            {d.ekTeminat === true && <div>Karar: ek teminat yatırdın → pozisyon açık kaldı; bağladığın para 15.000 ₺&apos;ye çıktı.</div>}
            {d.ekTeminat === false && <div>Karar: yatırmadın → pozisyon kapandı; kalan teminat 4.000 ₺ hesabına döndü.</div>}
          </div>
          <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.7, margin: "12px 0 14px" }}>
            Gördüğün gibi: VİOP kazancı da kaybı da büyütür. Bu bir simülasyondu; gerçek piyasada teminat oranları ve fiyatlar değişkendir. Bu içerik yatırım tavsiyesi değildir.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => gonder({ tip: "SIFIRLA" })}
              style={{ minHeight: 44, borderRadius: 10, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.4)", color: "#93C5FD", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "0 18px" }}>
              ↺ Baştan dene (farklı seçimle)
            </button>
            <Link href="/hisseler" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.25)", color: "#CBD5E1", fontSize: 13, fontWeight: 700, textDecoration: "none", padding: "0 18px" }}>
              Hisseleri keşfet →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
