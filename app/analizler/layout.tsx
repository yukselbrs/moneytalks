import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analizlerim | ParaKonuşur",
  description: "Daha önce oluşturduğunuz yapay zekâ destekli BIST hisse analizleri. Geçmiş analiz geçmişinizi görüntüleyin.",
  alternates: { canonical: "/analizler" },
};

export default function AnalizlerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
