import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swap Nedir? Faiz Swap'ı ve Nakit Akışı Takası | ParaKonuşur",
  description:
    "Swap sözleşmelerini sıfırdan anlatan interaktif rehber: nakit akışı takası, swap'ın arka arkaya dizilmiş forward'lar oluşu, faiz swap'ı, tezgâh üstü (OTC) yapı ve karşı taraf riski. Eğitim amaçlıdır; yatırım tavsiyesi değildir.",
  alternates: { canonical: "/egitimler/turev-araclar/swap-nedir" },
  openGraph: {
    title: "Swap Nedir? — İnteraktif Basit Anlatım",
    description: "Faiz swap'ını, nakit akışı takasını ve karşı taraf riskini 7 adımda, animasyonlu hikayeyle öğren.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: "Swap Nedir? — İnteraktif Basit Anlatım",
  description: "Swap sözleşmelerini nakit akışı takası, faiz swap'ı, tezgâh üstü (OTC) yapı ve karşı taraf riski kavramlarıyla anlatan etkileşimli eğitim içeriği.",
  educationalLevel: "Beginner",
  inLanguage: "tr",
  learningResourceType: "Interactive Resource",
  provider: { "@type": "Organization", name: "ParaKonuşur", url: "https://parakonusur.com" },
};

export default function SwapNedirLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
