"use client";

import { useReducer } from "react";
import Link from "next/link";

// B7 mini simulasyon — akis semasi: forward-nedir-icerik-plani.md
// (TARAF SEC → VADE GELDI → sonuc → KARSI TARAF KARARI (yalniz karsi taraf zarardaysa) → KARNE).
// VIOP'taki Simulasyon.tsx deseninin aynisi: useReducer, adim adim akis, sonda karne.
// Math.random YALNIZ VADE_GELDI aksiyonunda (event handler) — SSR/hydration guvenli.

type Taraf = "long" | "short";
type Senaryo = "yukseldi" | "sabit" | "dustu";

type Durum = {
  adim: 1 | 2 | 3 | 4;
  taraf: Taraf | null;
  senaryo: Senaryo | null;
  karsiTarafTuttu: boolean | null;   // null = bu adima hic gelinmedi
};

type Aksiyon =
  | { tip: "TARAF_SEC"; taraf: Taraf }
  | { tip: "VADE_GELDI" }
  | { tip: "KARSI_TARAF"; tuttu: boolean }
  | { tip: "SIFIRLA" };

const BASLANGIC: Durum = { adim: 1, taraf: null, senaryo: null, karsiTarafTuttu: null };

// Sozlesme: 500 kg kahve, forward fiyati 100 TL/kg.
const MIKTAR = 500;
const FORWARD_FIYAT = 100;
const SPOT: Record<Senaryo, number> = { yukseldi: 130, sabit: 100, dustu: 80 };

// Pozisyon farki: long ileride ALACAK -> spot yukselirse lehine.
function pozisyonFarki(taraf: Taraf, senaryo: Senaryo): number {
  const yon = taraf === "long" ? 1 : -1;
  return (SPOT[senaryo] - FORWARD_FIYAT) * MIKTAR * yon;
}

// Karsi taraf riski YALNIZ karsi taraf zarardayken anlamlidir (sen kardayken).
function karsiTarafZarardaMi(taraf: Taraf, senaryo: Senaryo): boolean {
  return pozisyonFarki(taraf, senaryo) > 0;
}

function reducer(d: Durum, a: Aksiyon): Durum {
  switch (a.tip) {
    case "TARAF_SEC": return { ...BASLANGIC, adim: 2, taraf: a.taraf };
    case "VADE_GELDI": {
      const secenekler: Senaryo[] = ["yukseldi", "sabit", "dustu"];
      const senaryo = secenekler[Math.floor(Math.random() * 3)];
      const riskVar = d.taraf ? karsiTarafZarardaMi(d.taraf, senaryo) : false;
      return { ...d, adim: riskVar ? 3 : 4, senaryo };
    }
    case "KARSI_TARAF": return { ...d, adim: 4, karsiTarafTuttu: a.tuttu };
    case "SIFIRLA": return BASLANGIC;
  }
}

const tl = (v: number) => `${Math.round(Math.abs(v)).toLocaleString("tr-TR")} ₺`;
const isaretliTl = (v: number) => `${v < 0 ? "−" : "+"}${tl(v)}`;

const TARAFLAR: { kod: Taraf; ad: string; alt: string; detay: string }[] = [
  { kod: "long", ad: "Long — alacağım", alt: "3 ay sonra 100 ₺'den alma sözü", detay: "Fiyat yükselirse pozisyonun değer kazanır." },
  { kod: "short", ad: "Short — satacağım", alt: "3 ay sonra 100 ₺'den satma sözü", detay: "Fiyat düşerse pozisyonun değer kazanır." },
];

const BTN: React.CSSProperties = {
  minHeight: 44, padding: "11px 18px", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
  cursor: "pointer", border: "1px solid rgba(59,130,246,0.45)", background: "rgba(59,130,246,0.15)", color: "#93C5FD",
};

export default function Simulasyon() {
  const [d, gonder] = useReducer(reducer, BASLANGIC);
  const fark = d.taraf && d.senaryo ? pozisyonFarki(d.taraf, d.senaryo) : 0;
  const spot = d.senaryo ? SPOT[d.senaryo] : FORWARD_FIYAT;
  // Karsi taraf kactiysa kagit ustundeki kar gerceklesmez.
  const gerceklesen = d.karsiTarafTuttu === false ? 0 : fark;

  return (
    <div className="card-glass" style={{ borderRadius: 12, padding: "18px 20px" }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(96,165,250,0.75)", margin: "0 0 4px" }}>
        Mini simülasyon · adım {d.adim}/4
      </p>

      {/* 1 — taraf sec */}
      {d.adim === 1 && (
        <>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#CBD5E1", margin: "0 0 14px" }}>
            Kahve çekirdeği bugün 100 ₺/kg. Üç ay sonrası için <b style={{ color: "#E2E8F0" }}>100 ₺'den 500 kilo</b> forward
            anlaşması yapıyorsun. Hangi taraftasın?
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

      {/* 2 — vade */}
      {d.adim === 2 && (
        <>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#CBD5E1", margin: "0 0 14px" }}>
            Anlaşma yapıldı. Üç ay geçti — piyasa fiyatı ne oldu, bakalım.
          </p>
          <button onClick={() => gonder({ tip: "VADE_GELDI" })} style={BTN}>Vade geldi →</button>
        </>
      )}

      {/* 3 — karsi taraf karari (forward'a ozgu adim) */}
      {d.adim === 3 && d.taraf && d.senaryo && (
        <>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#CBD5E1", margin: "0 0 10px" }}>
            Vade fiyatı <b style={{ color: "#E2E8F0" }}>{spot} ₺</b>. Anlaşma senin lehine:
            kâğıt üstünde <b style={{ color: "#6EE7B7" }}>{isaretliTl(fark)}</b>.
          </p>
          <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "12px 16px", fontSize: 13.5, lineHeight: 1.65, color: "#FCD34D", marginBottom: 14 }}>
            Ama karşı taraf bu anlaşmada <b>{tl(fark)}</b> zararda. Ne yapar?
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => gonder({ tip: "KARSI_TARAF", tuttu: true })} style={BTN}>Sözünü tutar</button>
            <button onClick={() => gonder({ tip: "KARSI_TARAF", tuttu: false })}
              style={{ ...BTN, border: "1px solid rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.12)", color: "#FCA5A5" }}>
              Kaçar
            </button>
          </div>
        </>
      )}

      {/* 4 — karne */}
      {d.adim === 4 && d.taraf && d.senaryo && (
        <>
          <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            {[
              ["Taraf", d.taraf === "long" ? "Long (alacaktın)" : "Short (satacaktın)"],
              ["Anlaşma fiyatı", `${FORWARD_FIYAT} ₺/kg · ${MIKTAR} kg`],
              ["Vade fiyatı", `${spot} ₺/kg`],
              ["Pozisyon farkı", isaretliTl(fark)],
              ...(d.karsiTarafTuttu !== null
                ? [["Karşı taraf", d.karsiTarafTuttu ? "Sözünü tuttu" : "Yükümlülüğünü yerine getirmedi"] as [string, string]]
                : []),
              ["Gerçekleşen", isaretliTl(gerceklesen)],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                <span style={{ color: "#64748B" }}>{l}</span>
                <span style={{ color: l === "Gerçekleşen" ? (gerceklesen < 0 ? "#FCA5A5" : gerceklesen > 0 ? "#6EE7B7" : "#E2E8F0") : "#E2E8F0", fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{
            background: d.karsiTarafTuttu === false ? "rgba(239,68,68,0.08)" : "rgba(59,130,246,0.07)",
            border: `1px solid ${d.karsiTarafTuttu === false ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.25)"}`,
            borderRadius: 10, padding: "12px 16px", fontSize: 13.5, lineHeight: 1.65,
            color: d.karsiTarafTuttu === false ? "#FCA5A5" : "#93C5FD", marginBottom: 14,
          }}>
            {d.karsiTarafTuttu === false
              ? <>Kâğıt üstündeki fark gerçekleşmedi. Forward&apos;da seni koruyan bir takas kurumu yok — bu <b>karşı taraf riski</b>. VİOP&apos;ta bu adım hiç olmazdı: orada karşı tarafın borsadır.</>
              : d.senaryo === "sabit"
                ? <>Fiyat değişmedi, anlaşma nötr kapandı. Forward&apos;ın amacı zaten kazanç değil, <b>belirsizliği azaltmak</b>tı — fiyatını baştan biliyordun.</>
                : fark > 0
                  ? <>Anlaşma senin lehine kapandı ve karşı taraf sözünü tuttu. Forward&apos;da bu her zaman garanti değildir; güvence tarafların anlaşmasına bağlıdır.</>
                  : <>Anlaşma aleyhine kapandı — ama sürprizle karşılaşmadın. Fiyatını üç ay önce biliyordun; forward&apos;ın verdiği şey buydu.</>}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => gonder({ tip: "SIFIRLA" })} style={BTN}>Yeniden dene</button>
            <Link href="/egitimler/turev-araclar/viop-nedir" style={{ fontSize: 13, color: "#60A5FA", textDecoration: "none", fontWeight: 600 }}>
              VİOP Nedir? eğitimine geç →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
