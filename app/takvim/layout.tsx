import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ekonomik Takvim | ParaKonuşur",
  description: "Türkiye ve küresel piyasaları etkileyen ekonomik veri açıklamaları, TCMB kararları ve önemli tarihler.",
  alternates: { canonical: "https://parakonusur.com/takvim" },
};

export default function TakvimLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
