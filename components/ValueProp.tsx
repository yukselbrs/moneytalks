"use client";

import { FileText, Radio, Target } from "lucide-react";
import { Bolum, BolumBasligi, OzellikKarti, useReveal } from "@/components/landing/parcalar";

const IKON = { size: 24, strokeWidth: 1.5 } as const;

const KARTLAR = [
  {
    ikon: <FileText {...IKON} />,
    baslik: "Sade Türkçe özet",
    aciklama: "Terim yığını yok. Hangi veriye dayandığı cümlenin içinde durur.",
  },
  {
    ikon: <Target {...IKON} />,
    baslik: "Yönsüz risk ölçüsü",
    aciklama: "Beş bant, tek ölçü. Getiri tahmini değil, belirsizliğin ölçüsü.",
  },
  {
    ikon: <Radio {...IKON} />,
    baslik: "Damgalı veri",
    aciklama: "Her sayının yanında gecikme bilgisi ve kaynağı görünür.",
  },
];

function Kart({ indeks }: { indeks: number }) {
  const { ref, stil } = useReveal<HTMLDivElement>(indeks * 80);
  const k = KARTLAR[indeks];
  return (
    <div ref={ref} data-reveal style={stil}>
      <OzellikKarti ikon={k.ikon} baslik={k.baslik} aciklama={k.aciklama} />
    </div>
  );
}

export default function ValueProp() {
  return (
    <Bolum id="nedir" dolgu="clamp(80px,14vh,150px)">
      <BolumBasligi
        rozet="TANITIM"
        baslik="ParaKonuşur nedir?"
        lede="600'den fazla BIST enstrümanını değerlendiren bir analiz motoru. Sonucu grafik yığını değil, okunabilir bir paragraf ve bir risk bandı olarak verir."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))",
          gap: 24,
          width: "100%",
        }}
      >
        {KARTLAR.map((k, i) => (
          <Kart key={k.baslik} indeks={i} />
        ))}
      </div>
    </Bolum>
  );
}
