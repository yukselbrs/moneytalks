import type { Metadata } from "next";
import { enstrumanBul, enstrumanParaBirimi } from "@/lib/enstruman-pricing";
import { jsonLdGuvenli } from "@/lib/json-ld";

export async function generateMetadata({ params }: { params: Promise<{ kod: string }> }): Promise<Metadata> {
  const { kod } = await params;
  const e = enstrumanBul(kod.toLocaleLowerCase("tr-TR"));
  const ad = e?.ad ?? "Döviz ve Kıymetli Maden";
  const title = `${ad} ${e?.tur === "doviz" ? "Kuru" : "Fiyatı"} ve Analizi | ParaKonuşur`;
  const description = e?.tur === "doviz"
    ? `${ad} (${(e as { aciklama?: string }).aciklama ?? ad}) güncel kur, günlük değişim, 1H/1A/3A/6A/1Y getiri ve oynaklık profili. ~15 dk gecikmeli veri. Yatırım tavsiyesi değildir.`
    : `${ad} güncel spot fiyatı, günlük değişim, getiri ve oynaklık profili. ~15 dk gecikmeli veri, kaynak şeffaflığıyla. Yatırım tavsiyesi değildir.`;
  return {
    title,
    description,
    alternates: { canonical: `/doviz-maden/${kod}` },
    openGraph: { title, description },
  };
}

export default async function DovizMadenDetayLayout({ children, params }: { children: React.ReactNode; params: Promise<{ kod: string }> }) {
  const { kod } = await params;
  const e = enstrumanBul(kod.toLocaleLowerCase("tr-TR"));
  const jsonLd = !e ? null : e.tur === "doviz" ? {
    "@context": "https://schema.org",
    "@type": "ExchangeRateSpecification",
    name: e.ad,
    currency: e.taban,
    currentExchangeRate: { "@type": "UnitPriceSpecification", priceCurrency: e.karsi },
  } : {
    "@context": "https://schema.org",
    "@type": "Product",
    name: e.ad,
    description: `${e.ad} spot fiyatı (${e.birim}, ${enstrumanParaBirimi(e)})`,
    category: "Precious Metal",
  };
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdGuvenli(jsonLd) }} />}
      {children}
    </>
  );
}
