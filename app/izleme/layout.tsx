import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İzleme Listesi | ParaKonuşur",
  description: "Takip ettiğiniz BIST hisselerini izleyin. Anlık fiyat, değişim yüzdesi ve mini grafik tek yerde.",
  alternates: { canonical: "/izleme" },
};

export default function IzlemeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
