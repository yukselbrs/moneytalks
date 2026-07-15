import type { Metadata } from "next";
import { MADENLER } from "@/lib/maden-pricing";

export async function generateMetadata({ params }: { params: Promise<{ kod: string }> }): Promise<Metadata> {
  const { kod } = await params;
  const m = MADENLER.find(x => x.kod === kod.toLocaleLowerCase("tr-TR"));
  const ad = m?.ad ?? "Kıymetli Maden";
  const title = `${ad} Fiyatı ve Analizi | ParaKonuşur`;
  const description = `${ad} güncel spot fiyatı, günlük değişim, getiri ve oynaklık profili. ~15 dk gecikmeli veri, kaynak şeffaflığıyla. Yatırım tavsiyesi değildir.`;
  return {
    title,
    description,
    alternates: { canonical: `/maden/${kod}` },
    openGraph: { title, description },
  };
}

export default async function MadenLayout({ children, params }: { children: React.ReactNode; params: Promise<{ kod: string }> }) {
  const { kod } = await params;
  const m = MADENLER.find(x => x.kod === kod.toLocaleLowerCase("tr-TR"));
  const jsonLd = m ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: m.ad,
    description: `${m.ad} spot fiyatı (${m.birim}, ${m.paraBirimi})`,
    category: "Precious Metal",
  } : null;
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      {children}
    </>
  );
}
