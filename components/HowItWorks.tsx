"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bell, CalendarDays, Star } from "lucide-react";
import {
  Bolum,
  BolumBasligi,
  CamKart,
  SkorHalkasi,
  useReveal,
} from "@/components/landing/parcalar";
import { hareketAzaltilmis } from "@/lib/landing-hareket";
import { formatNumber } from "@/lib/formatters";

const AI_METNI =
  "Bilanço güçlü, borçluluk iki çeyrektir geriliyor. Teknik görünüm yatay; hacim ortalamanın üzerinde.";

/* ── Kart kabugu ─────────────────────────────────────
   Kartlar satir yuksekligini doldurur; alt blok margin-top:auto
   ile dibe sabitlenir, boylece alt kenarlar hizali kalir. */

function AdimKarti({
  gecikme,
  baslik,
  aciklama,
  children,
}: {
  gecikme: number;
  baslik: string;
  aciklama: string;
  children: ReactNode;
}) {
  const { ref, stil } = useReveal<HTMLDivElement>(gecikme);
  return (
    <div ref={ref} data-reveal style={{ ...stil, display: "flex" }}>
      <CamKart style={{ width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div
            style={{
              fontFamily: "var(--font-geist)",
              fontSize: 19,
              fontWeight: 700,
              color: "#F8FAFC",
              marginBottom: 10,
            }}
          >
            {baslik}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#64748B", margin: "0 0 20px" }}>
            {aciklama}
          </p>
          <div style={{ marginTop: "auto" }}>{children}</div>
        </div>
      </CamKart>
    </div>
  );
}

/* ── 1. Kodu secin ───────────────────────────────────
   Degerler gercek — sayfa "her sayinin yaninda kaynagi gorunur"
   diyorken uydurma fiyat gostermek kendiyle celisirdi.
   Tek genel (public) cagri, sunucuda 15sn cache'li. */

type Satir = { kod: string; deger: string | null; secili: boolean };

const BASLANGIC: Satir[] = [
  { kod: "THYAO", deger: null, secili: false },
  { kod: "ASELS", deger: null, secili: true },
  { kod: "GARAN", deger: null, secili: false },
  { kod: "USD/TRY", deger: null, secili: false },
];

function KodListesi() {
  const [satirlar, setSatirlar] = useState<Satir[]>(BASLANGIC);

  useEffect(() => {
    let iptal = false;
    async function getir() {
      const [hisseler, usd] = await Promise.all([
        fetch("/api/fiyatlar").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/doviz-maden/usd-try").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (iptal) return;
      const kur = usd?.enstruman?.fiyat;
      setSatirlar((onceki) =>
        onceki.map((s) => {
          if (s.kod === "USD/TRY") {
            return { ...s, deger: typeof kur === "number" ? formatNumber(kur, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null };
          }
          const veri = hisseler?.[s.kod];
          return { ...s, deger: typeof veri?.fiyat === "string" ? veri.fiyat : null };
        })
      );
    }
    getir();
    return () => { iptal = true; };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {satirlar.map((s) => (
        <div
          key={s.kod}
          className="lp-row"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "9px 11px",
            borderRadius: 8,
            background: s.secili ? "rgba(59,130,246,0.10)" : "rgba(255,255,255,0.02)",
            border: s.secili ? "1px solid rgba(59,130,246,0.18)" : "1px solid transparent",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: s.secili ? "#F1F5F9" : "#CBD5E1" }}>
            {s.kod}
          </span>
          <span
            style={{
              fontSize: 11,
              color: s.secili ? "#93C5FD" : "#64748B",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {s.deger ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── 2. Daktilo ──────────────────────────────────────── */

function useDaktilo(metin: string) {
  const [yazilan, setYazilan] = useState("");
  const { ref, stil, gorunur } = useReveal<HTMLDivElement>(0);

  useEffect(() => {
    if (!gorunur) return;
    if (hareketAzaltilmis()) {
      setYazilan(metin);
      return;
    }
    let i = 0;
    let zamanlayici = 0;
    const adim = () => {
      if (i >= metin.length) {
        zamanlayici = window.setTimeout(() => {
          i = 0;
          setYazilan("");
          adim();
        }, 6500);
        return;
      }
      // Bosluklarda iki karakter birlikte eklenir — akis daha dogal.
      i += metin.charCodeAt(i) === 32 ? 2 : 1;
      setYazilan(metin.slice(0, i));
      zamanlayici = window.setTimeout(adim, 18 + Math.random() * 26);
    };
    adim();
    return () => window.clearTimeout(zamanlayici);
  }, [metin, gorunur]);

  return { yazilan, ref, stil };
}

function AiPaneli() {
  const { yazilan, ref, stil } = useDaktilo(AI_METNI);
  return (
    <div
      ref={ref}
      data-reveal
      style={{
        ...stil,
        position: "relative",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-neutral-soft)",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg,transparent,rgba(59,130,246,0.5) 30%,rgba(139,92,246,0.5) 70%,transparent)",
        }}
      />
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(167,139,250,0.75)", marginBottom: 10 }}>
        PAKO AI
      </div>
      <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#E2E8F0", margin: 0, minHeight: 82 }}>
        {yazilan}
        <span className="lp-caret" style={{ color: "#60A5FA", marginLeft: 2 }} aria-hidden="true">
          ▌
        </span>
      </p>
    </div>
  );
}

/* ── 4. Takibe alin ──────────────────────────────────── */

const TAKIP = [
  { ikon: <Star size={13} strokeWidth={1.5} />, etiket: "Takip listesi", sayi: 12 },
  { ikon: <Bell size={13} strokeWidth={1.5} />, etiket: "Eşik alarmı", sayi: 3 },
  { ikon: <CalendarDays size={13} strokeWidth={1.5} />, etiket: "Bilanço takvimi", sayi: 8 },
];

export default function HowItWorks() {
  return (
    <Bolum id="nasil">
      <BolumBasligi
        rozet="SEÇ · OKU · İZLE"
        baslik="Nasıl çalışır"
        lede="Dört adım. Kayıt olduğunuz anda hepsi açık."
        ledeGenislik="56ch"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(258px,100%),1fr))",
          gap: 24,
          width: "100%",
        }}
      >
        <AdimKarti
          gecikme={0}
          baslik="Kodu seçin"
          aciklama="Takip etmek istediğiniz hisseyi, fonu ya da dövizi arayın."
        >
          <KodListesi />
        </AdimKarti>

        <AdimKarti
          gecikme={80}
          baslik="Yapay zekâ okur"
          aciklama="Bilanço, haber ve teknik veriler tek bir özete dönüşür."
        >
          <AiPaneli />
        </AdimKarti>

        <AdimKarti
          gecikme={160}
          baslik="Risk skorunu görün"
          aciklama="Belirsizliğin ne kadar yüksek olduğunu tek bakışta gösterir."
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 6 }}>
            <SkorHalkasi skor={46} boyut={132} baslik="Bileşik Skor" altBaslik="risk ölçüsü" />
          </div>
        </AdimKarti>

        <AdimKarti
          gecikme={240}
          baslik="Takibe alın"
          aciklama="Portföyünüze ekleyin, fiyat alarmı kurun, bilanço tarihini kaçırmayın."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TAKIP.map((t) => (
              <div
                key={t.etiket}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border-neutral-soft)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <span style={{ color: "#93C5FD", display: "flex" }}>{t.ikon}</span>
                <span style={{ fontSize: 12, color: "#CBD5E1", flex: 1 }}>{t.etiket}</span>
                <span style={{ fontSize: 11, color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  {t.sayi}
                </span>
              </div>
            ))}
          </div>
        </AdimKarti>
      </div>
    </Bolum>
  );
}
