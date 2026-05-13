import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tüm BIST Hisseleri | ParaKonuşur",
  description: "BIST'teki 600+ hisseyi fiyat, değişim yüzdesi, hacim ve getiri bazında filtreleyin ve sıralayın.",
  alternates: { canonical: "/hisseler" },
};

export default function HisselerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
