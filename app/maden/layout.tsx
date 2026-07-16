import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kıymetli Madenler — Gram Altın, Gümüş, Platin Fiyatları | ParaKonuşur",
  description: "Gram altın, ons altın, gümüş ve platin spot fiyatları — 1G/1H/1A/3A/1Y değişimleriyle, ~15 dk gecikmeli, kaynak şeffaflığıyla.",
  alternates: { canonical: "/maden" },
};

export default function MadenRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
