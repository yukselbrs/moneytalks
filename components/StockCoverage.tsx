"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeftRight, BarChart3, GraduationCap, Layers } from "lucide-react";
import { Bolum, BolumBasligi, CamKart, IkonPlaka, useReveal } from "@/components/landing/parcalar";
import { hareketAzaltilmis } from "@/lib/landing-hareket";
import { formatNumber } from "@/lib/formatters";

const IKON = { size: 24, strokeWidth: 1.5 } as const;

const CIPLER = [
  "THYAO", "GARAN", "ASELS", "EREGL", "SISE",
  "AKBNK", "KCHOL", "TUPRS", "USD/TRY", "GRAM ALTIN",
];

/** 0 -> hedef, 1400ms, cubic ease-out. Gorunur olunca baslar. */
function Sayac({ hedef }: { hedef: number }) {
  const { ref, stil, gorunur } = useReveal<HTMLSpanElement>(0);
  const [deger, setDeger] = useState(0);

  useEffect(() => {
    if (!gorunur) return;
    if (hareketAzaltilmis()) {
      const frame = requestAnimationFrame(() => setDeger(hedef));
      return () => cancelAnimationFrame(frame);
    }
    let kare = 0;
    const t0 = performance.now();
    const adim = (simdi: number) => {
      const p = Math.min(1, (simdi - t0) / 1400);
      setDeger(Math.round(hedef * (1 - Math.pow(1 - p, 3))));
      if (p < 1) kare = requestAnimationFrame(adim);
    };
    kare = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(kare);
  }, [gorunur, hedef]);

  return (
    <span ref={ref} data-reveal style={{ ...stil, fontVariantNumeric: "tabular-nums" }}>
      {formatNumber(deger, { maximumFractionDigits: 0 })}
    </span>
  );
}

function KapsamKarti({
  gecikme,
  ikon,
  etiket,
  aciklama,
}: {
  gecikme: number;
  ikon: ReactNode;
  etiket: ReactNode;
  aciklama: string;
}) {
  const { ref, stil } = useReveal<HTMLDivElement>(gecikme);
  return (
    <div ref={ref} data-reveal style={{ ...stil, display: "flex" }}>
      <CamKart style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            textAlign: "center",
            alignItems: "center",
          }}
        >
          <IkonPlaka>{ikon}</IkonPlaka>
          <div
            style={{
              fontFamily: "var(--font-geist)",
              fontSize: 16,
              fontWeight: 600,
              color: "#F1F5F9",
              marginTop: 14,
            }}
          >
            {etiket}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.55, color: "#64748B", marginTop: 8, maxWidth: "26ch" }}>
            {aciklama}
          </div>
        </div>
      </CamKart>
    </div>
  );
}

export default function StockCoverage() {
  const { ref: ciplerRef, stil: ciplerStil } = useReveal<HTMLDivElement>(300);

  return (
    <Bolum id="kapsam">
      <BolumBasligi
        rozet="KAPSAM"
        baslik="Tek platformda dört kapsam"
        lede="Her enstrüman aynı hattan geçer, aynı damgayı taşır. Aradığınız kod listede yoksa söyleyin, ekleriz."
        ledeGenislik="58ch"
      />
      {/* auto-fit KULLANILMAZ — 3+1 yetim satir olusur. */}
      <div
        className="lp-grid-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,minmax(0,1fr))",
          gap: 24,
          width: "100%",
          marginBottom: 36,
        }}
      >
        <KapsamKarti
          gecikme={0}
          ikon={<BarChart3 {...IKON} />}
          etiket={
            <>
              <Sayac hedef={600} />
              <span style={{ color: "#3B82F6" }}>+</span> BIST hissesi
            </>
          }
          aciklama="Borsa İstanbul'da işlem gören hisselerin tamamına yakını."
        />
        <KapsamKarti
          gecikme={80}
          ikon={<Layers {...IKON} />}
          etiket="Fonlar"
          aciklama="Yatırım fonları, portföy dağılımı ve getiri geçmişiyle."
        />
        <KapsamKarti
          gecikme={160}
          ikon={<ArrowLeftRight {...IKON} />}
          etiket="Döviz ve Kıymetli Madenler"
          aciklama="USD, EUR ve gram altın dahil kur ve maden verileri."
        />
        <KapsamKarti
          gecikme={240}
          ikon={<GraduationCap {...IKON} />}
          etiket="İnteraktif eğitimler"
          aciklama="Türev ürünler: VİOP, opsiyon ve vadeli işlem dersleri."
        />
      </div>

      <div
        ref={ciplerRef}
        data-reveal
        style={{
          ...ciplerStil,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          maxWidth: 860,
        }}
      >
        {CIPLER.map((c) => (
          <span
            key={c}
            className="lp-chip"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#94A3B8",
              background: "rgba(59,130,246,0.06)",
              border: "1px solid rgba(59,130,246,0.10)",
              borderRadius: 8,
              padding: "7px 11px",
              letterSpacing: "0.04em",
            }}
          >
            {c}
          </span>
        ))}
        <span style={{ fontSize: 12, color: "#334155", padding: "7px 11px" }}>+ 588 enstrüman</span>
      </div>
    </Bolum>
  );
}
