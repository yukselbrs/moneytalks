import type { Metadata } from "next";
import { jsonLdGuvenli } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Forward Nedir? Tezgâh Üstü (OTC) Anlaşma ve Karşı Taraf Riski | ParaKonuşur",
  description:
    "Forward sözleşmelerini sıfırdan anlatan interaktif rehber: fiyatı bugünden kilitlemek, tezgâh üstü (OTC) özel anlaşma, karşı taraf riski, long/short ve mini simülasyon. Eğitim amaçlıdır; yatırım tavsiyesi değildir.",
  alternates: { canonical: "/egitimler/turev-araclar/forward-nedir" },
  openGraph: {
    title: "Forward Nedir? — İnteraktif Basit Anlatım",
    description: "OTC anlaşmalar, karşı taraf riski ve long/short'u 7 adımda, animasyonlu hikayeyle öğren.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: "Forward Nedir? — İnteraktif Basit Anlatım",
  description: "Forward sözleşmelerini tezgâh üstü (OTC) yapısı, karşı taraf riski ve long/short kavramlarıyla anlatan etkileşimli eğitim içeriği.",
  educationalLevel: "Beginner",
  inLanguage: "tr",
  learningResourceType: "Interactive Resource",
  provider: { "@type": "Organization", name: "ParaKonuşur", url: "https://parakonusur.com" },
};

export default function ForwardNedirLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdGuvenli(jsonLd) }} />
      {children}
    </>
  );
}
