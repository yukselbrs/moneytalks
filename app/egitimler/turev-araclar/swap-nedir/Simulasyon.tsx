"use client";

import { useReducer } from "react";
import Link from "next/link";

// B7 mini simulasyon — akis semasi: swap-nedir-icerik-plani.md
// (TARAF SEC → 4 CEYREK ILERLET → KARNE).
// VIOP/Forward'daki Simulasyon.tsx deseninin aynisi: useReducer, adim adim, sonda karne.
// Math.random YALNIZ CEYREK_ILERLET aksiyonunda (event handler) — SSR/hydration guvenli.

type Taraf = "sabit-oder" | "degisken-oder";

type Ceyrek = { no: number; degisken: number; fark: number };

type Durum = {
  adim: 1 | 2 | 3;          // 1: taraf sec · 2: ceyrekler · 3: karne
  taraf: Taraf | null;
  ceyrekler: Ceyrek[];
};

type Aksiyon =
  | { tip: "TARAF_SEC"; taraf: Taraf }
  | { tip: "CEYREK_ILERLET" }
  | { tip: "SIFIRLA" };

const BASLANGIC: Durum = { adim: 1, taraf: null, ceyrekler: [] };

// Swap: 1.000.000 TL nominal, 1 yil, ceyreklik odeme, sabit oran %40.
const NOMINAL = 1_000_000;
const SABIT_ORAN = 40;
const CEYREK_SAYISI = 4;

// Ceyrek nakit farki: (degisken - sabit) / 4 * nominal / 100.
// Sabit odeyen degisken alir -> degisken yuksekse lehine.
function ceyrekFarki(taraf: Taraf, degisken: number): number {
  const ham = ((degisken - SABIT_ORAN) / 4) * (NOMINAL / 100);
  return taraf === "sabit-oder" ? ham : -ham;
}

function reducer(d: Durum, a: Aksiyon): Durum {
  switch (a.tip) {
    case "TARAF_SEC": return { ...BASLANGIC, adim: 2, taraf: a.taraf };
    case "CEYREK_ILERLET": {
      if (!d.taraf) return d;
      // %30–%55 arasi degisken faiz
      const degisken = Math.round((30 + Math.random() * 25) * 10) / 10;
      const ceyrek: Ceyrek = { no: d.ceyrekler.length + 1, degisken, fark: ceyrekFarki(d.taraf, degisken) };
      const ceyrekler = [...d.ceyrekler, ceyrek];
      return { ...d, ceyrekler, adim: ceyrekler.length >= CEYREK_SAYISI ? 3 : 2 };
    }
    case "SIFIRLA": return BASLANGIC;
  }
}

const tl = (v: number) => `${Math.round(Math.abs(v)).toLocaleString("tr-TR")} ₺`;
const isaretliTl = (v: number) => `${v < 0 ? "−" : "+"}${tl(v)}`;
const yuzde = (v: number) => `%${v.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

const TARAFLAR: { kod: Taraf; ad: string; alt: string; detay: string }[] = [
  { kod: "sabit-oder", ad: "Sabit öderim", alt: `Her çeyrek %${SABIT_ORAN}/4 öderim, değişken alırım`, detay: "Ödemen öngörülebilir olur. Faiz yükselirse aradaki fark lehine döner." },
  { kod: "degisken-oder", ad: "Değişken öderim", alt: `O dönemin faizini öderim, %${SABIT_ORAN} alırım`, detay: "Ödemen dalgalanır. Faiz düşerse aradaki fark lehine döner." },
];

const BTN: React.CSSProperties = {
  minHeight: 44, padding: "11px 18px", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
  cursor: "pointer", border: "1px solid rgba(59,130,246,0.45)", background: "rgba(59,130,246,0.15)", color: "#93C5FD",
};

export default function Simulasyon() {
  const [d, gonder] = useReducer(reducer, BASLANGIC);
  const toplam = d.ceyrekler.reduce((a, c) => a + c.fark, 0);
  const ortDegisken = d.ceyrekler.length ? d.ceyrekler.reduce((a, c) => a + c.degisken, 0) / d.ceyrekler.length : 0;

  return (
    <div className="card-glass" style={{ borderRadius: 12, padding: "18px 20px" }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(96,165,250,0.75)", margin: "0 0 4px" }}>
        Mini simülasyon · {d.adim === 1 ? "taraf seç" : d.adim === 2 ? `${d.ceyrekler.length}/${CEYREK_SAYISI} çeyrek` : "karne"}
      </p>

      {/* 1 — taraf sec */}
      {d.adim === 1 && (
        <>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#CBD5E1", margin: "0 0 14px" }}>
            <b style={{ color: "#E2E8F0" }}>1.000.000 ₺</b> nominal, 1 yıllık faiz swap&apos;ı. Sabit oran <b style={{ color: "#E2E8F0" }}>%{SABIT_ORAN}</b>.
            Ödemeler çeyreklik. Hangi tarafı alırsın?
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {TARAFLAR.map((t) => (
              <button key={t.kod} onClick={() => gonder({ tip: "TARAF_SEC", taraf: t.kod })}
                style={{ ...BTN, textAlign: "left", padding: "14px 16px" }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#E2E8F0" }}>{t.ad}</span>
                <span style={{ display: "block", fontSize: 12, color: "#94A3B8", marginTop: 3, fontWeight: 500 }}>{t.alt}</span>
                <span style={{ display: "block", fontSize: 12, color: "#64748B", marginTop: 3, fontWeight: 500 }}>{t.detay}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 2 — ceyrekleri ilerlet */}
      {d.adim === 2 && (
        <>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#CBD5E1", margin: "0 0 12px" }}>
            {d.taraf === "sabit-oder" ? "Sabit ödüyorsun, değişken alıyorsun." : "Değişken ödüyorsun, sabit alıyorsun."}{" "}
            Her çeyrekte o dönemin faizi belli olur ve aradaki fark el değiştirir.
          </p>
          {d.ceyrekler.length > 0 && <CeyrekTablosu ceyrekler={d.ceyrekler} />}
          <button onClick={() => gonder({ tip: "CEYREK_ILERLET" })} style={{ ...BTN, marginTop: 12 }}>
            {d.ceyrekler.length + 1}. çeyreği aç →
          </button>
        </>
      )}

      {/* 3 — karne */}
      {d.adim === 3 && d.taraf && (
        <>
          <CeyrekTablosu ceyrekler={d.ceyrekler} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 15, fontWeight: 800, padding: "12px 0 4px", borderTop: "1px solid rgba(148,163,184,0.15)", marginTop: 10 }}>
            <span style={{ color: "#94A3B8" }}>Yıl sonu net</span>
            <span style={{ color: toplam < 0 ? "#FCA5A5" : toplam > 0 ? "#6EE7B7" : "#E2E8F0" }}>{isaretliTl(toplam)}</span>
          </div>

          <div style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 10, padding: "12px 16px", fontSize: 13.5, lineHeight: 1.65, color: "#93C5FD", margin: "12px 0 14px" }}>
            Ortalama değişken faiz <b>{yuzde(ortDegisken)}</b>, sabit oran <b>%{SABIT_ORAN}</b>.{" "}
            {toplam > 0
              ? d.taraf === "sabit-oder"
                ? "Faizler sabit oranın üzerinde seyretti, fark lehine döndü."
                : "Faizler sabit oranın altında kaldı, fark lehine döndü."
              : toplam < 0
                ? "Fark aleyhine döndü — ama ödemen baştan belliydi."
                : "Fark neredeyse sıfırlandı."}
            {" "}<b>Swap&apos;ın amacı bu sayıyı büyütmek değil, ödemeni öngörülebilir kılmaktı.</b>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => gonder({ tip: "SIFIRLA" })} style={BTN}>Yeniden dene</button>
            <Link href="/egitimler/turev-araclar/forward-nedir" style={{ fontSize: 13, color: "#60A5FA", textDecoration: "none", fontWeight: 600 }}>
              Forward Nedir? eğitimine dön →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function CeyrekTablosu({ ceyrekler }: { ceyrekler: Ceyrek[] }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        <span>Çeyrek</span><span style={{ textAlign: "center" }}>Değişken</span><span style={{ textAlign: "right" }}>Fark</span>
      </div>
      {ceyrekler.map((c) => (
        <div key={c.no} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 14 }}>
          <span style={{ color: "#94A3B8" }}>{c.no}. çeyrek</span>
          <span style={{ color: "#E2E8F0", textAlign: "center" }}>{yuzde(c.degisken)}</span>
          <span style={{ color: c.fark < 0 ? "#FCA5A5" : "#6EE7B7", textAlign: "right", fontWeight: 700 }}>{isaretliTl(c.fark)}</span>
        </div>
      ))}
    </div>
  );
}
