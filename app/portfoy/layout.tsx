import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portföyüm | ParaKonuşur",
  description: "BIST hisse portföyünüzü takip edin. Kâr/zarar, getiri yüzdesi, AI analiz ve risk skoru tek ekranda.",
  alternates: { canonical: "/portfoy" },
};

export default function PortfoyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
