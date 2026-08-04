import type { Metadata } from "next";

// Sayfa artik dort alt takvimi kapsiyor (ekonomik + bilanco + temettu + halka arz);
// baslik/aciklama yalniz "Ekonomik Takvim"i anlatiyordu.
export const metadata: Metadata = {
  title: "Finansal Takvim — Ekonomik Veri, Bilanço, Temettü, Halka Arz | ParaKonuşur",
  description:
    "BIST ve küresel piyasa takvimi tek sayfada: ekonomik veri açıklamaları (TCMB, TÜİK, Fed), şirket bilanço açıklama tarihleri, temettü ödeme takvimi ve halka arzlar.",
  alternates: { canonical: "/takvim" },
  openGraph: {
    title: "Finansal Takvim | ParaKonuşur",
    description: "Ekonomik veri açıklamaları, bilanço tarihleri, temettü ödemeleri ve halka arzlar tek takvimde.",
    url: "https://parakonusur.com/takvim",
    type: "website",
  },
};

export default function TakvimLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
