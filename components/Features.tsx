"use client";

import { Briefcase, FileText, Newspaper, TrendingUp } from "lucide-react";
import { Bolum, BolumBasligi, OzellikKarti, useReveal } from "@/components/landing/parcalar";

const IKON = { size: 24, strokeWidth: 1.5 } as const;

const KARTLAR = [
  {
    ikon: <FileText {...IKON} />,
    baslik: "AI Özet Raporları",
    aciklama:
      "Hisse başına yapay zekâ destekli, anlaşılır özet analiz. Karmaşık finansal veriyi sade Türkçe ile toplar.",
  },
  {
    ikon: <TrendingUp {...IKON} />,
    baslik: "Teknik Gösterge Özeti",
    aciklama:
      "Fiyat, hacim ve momentum verisini sadeleştirir. Teknik görünümü yönlendirme yapmadan aktarır.",
  },
  {
    ikon: <Newspaper {...IKON} />,
    baslik: "Haber Duyarlılığı",
    aciklama:
      "Finansal haberlerin piyasa algısındaki yerini özetler; olumlu ve olumsuz veri noktalarını ayırır.",
  },
  {
    ikon: <Briefcase {...IKON} />,
    baslik: "Portföy Takibi",
    aciklama:
      "Portföyünüzü tek ekranda izleyin. Her pozisyon için analiz ve risk skoru yan yana durur.",
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

export default function Features() {
  return (
    <Bolum id="ozellikler">
      <BolumBasligi
        rozet="ÖZELLİKLER"
        baslik="İhtiyacınız olan her analiz aracı"
        lede="Hepsi kayıt olan herkese açık. Ek paket, ek ücret yok."
        ledeGenislik="56ch"
      />
      {/* auto-fit KULLANILMAZ — 4 kart 3 sutuna dusup tek karti yetim birakir. */}
      <div
        className="lp-grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 24,
          width: "100%",
          maxWidth: 920,
        }}
      >
        {KARTLAR.map((k, i) => (
          <Kart key={k.baslik} indeks={i} />
        ))}
      </div>
    </Bolum>
  );
}
