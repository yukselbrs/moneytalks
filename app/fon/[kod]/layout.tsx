import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ kod: string }> }
): Promise<Metadata> {
  const { kod } = await params;
  const upper = kod.toLocaleUpperCase("tr-TR");
  return {
    title: `${upper} Fon Detayı | ParaKonuşur`,
    description: `${upper} yatırım fonu için TEFAS verileri, fiyat grafiği, dönem getirileri, risk, büyüklük, yatırımcı sayısı ve yıllık yönetim ücreti.`,
    alternates: { canonical: `/fon/${upper}` },
    openGraph: {
      title: `${upper} Fon Detayı | ParaKonuşur`,
      description: `${upper} fonu için TEFAS kaynaklı fon detayları ve performans görünümü.`,
      url: `/fon/${upper}`,
    },
    twitter: {
      card: "summary",
      title: `${upper} Fon Detayı | ParaKonuşur`,
      description: `${upper} fonu için TEFAS kaynaklı fon detayları.`,
    },
  };
}

export default function FonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
