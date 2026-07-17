import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Döviz ve Kıymetli Maden — USD/TRY, EUR/TRY, Gram Altın | ParaKonuşur",
  description: "Dolar, euro, sterlin kurları ve gram altın, gümüş, platin, paladyum fiyatları — 1G/1H/1A/3A/6A/1Y değişimleriyle, ~15 dk gecikmeli, kaynak şeffaflığıyla.",
  alternates: { canonical: "/doviz-maden" },
};

export default function DovizMadenRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
