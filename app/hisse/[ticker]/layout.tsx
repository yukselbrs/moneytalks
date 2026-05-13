import type { Metadata } from "next";
import bistHisseler from "@/data/bist-companies.json";

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
      url: `https://parakonusur.com/hisse/${t}`,
    },
    twitter: {
      card: "summary",
      title: `${t} — ${sirketAdi} | ParaKonuşur`,
      description: desc,
    },
    alternates: { canonical: `https://parakonusur.com/hisse/${t}` },
  };
}

export default function HisseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
