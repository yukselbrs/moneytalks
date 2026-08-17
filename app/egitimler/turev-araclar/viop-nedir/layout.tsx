import type { Metadata } from "next";
import { jsonLdGuvenli } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "VİOP Nedir? Kaldıraç, Teminat ve Long/Short — Basit Anlatım | ParaKonuşur",
  description:
    "VİOP'u sıfırdan, THYAO örneğiyle anlatan interaktif rehber: teminat, kaldıraç, teminat tamamlama çağrısı, long/short ve mini simülasyon. Eğitim amaçlıdır; yatırım tavsiyesi değildir.",
  alternates: { canonical: "/egitimler/turev-araclar/viop-nedir" },
  openGraph: {
    title: "VİOP Nedir? — İnteraktif Basit Anlatım",
    description: "Kaldıraç, teminat ve long/short'u 11 adımda, animasyonlu hikayeyle öğren.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: "VİOP Nedir? — İnteraktif Basit Anlatım",
  description: "Vadeli İşlem ve Opsiyon Piyasası'nı (VİOP) teminat, kaldıraç, teminat tamamlama çağrısı ve long/short kavramlarıyla anlatan etkileşimli eğitim içeriği.",
  educationalLevel: "Beginner",
  inLanguage: "tr",
  learningResourceType: "Interactive Resource",
  provider: { "@type": "Organization", name: "ParaKonuşur", url: "https://parakonusur.com" },
};

export default function ViopNedirLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdGuvenli(jsonLd) }} />
      {children}
    </>
  );
}
