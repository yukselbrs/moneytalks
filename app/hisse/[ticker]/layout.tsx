import type { Metadata } from "next";
import bistHisseler from "@/data/bist-companies.json";
import { seoPilotMu } from "@/lib/seo-pilot-hisseler";

type BistEntry = { ticker: string; ad: string };

export async function generateMetadata(
  { params }: { params: Promise<{ ticker: string }> }
): Promise<Metadata> {
  const { ticker } = await params;
  const t = ticker.toUpperCase();
  const hisse = (bistHisseler as BistEntry[]).find(h => h.ticker === t);
  const sirketAdi = hisse?.ad ?? t;
  const title = `${t} Hisse Analizi — ${sirketAdi}`;
  const desc = `${t} (${sirketAdi}) için yapay zekâ destekli teknik analiz, canlı fiyat grafiği, risk skoru ve portföy takibi. BIST'in en kapsamlı AI analiz platformu.`;
  return {
    title: `${title} | ParaKonuşur`,
    description: desc,
    openGraph: {
      title: `${title} | ParaKonuşur`,
      description: desc,
      url: `/hisse/${t}`,
    },
    twitter: {
      card: "summary",
      title: `${t} — ${sirketAdi} | ParaKonuşur`,
      description: desc,
    },
    alternates: { canonical: `/hisse/${t}` },
  };
}

export default async function HisseLayout(
  { children, params }: { children: React.ReactNode; params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const t = ticker.toUpperCase();
  if (!seoPilotMu(t)) return <>{children}</>;

  const hisse = (bistHisseler as BistEntry[]).find(h => h.ticker === t);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Corporation",
    name: hisse?.ad ?? t,
    tickerSymbol: t,
    url: `https://parakonusur.com/hisse/${t}`,
    sameAs: `https://www.kap.org.tr/tr/bist-sirketler`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
