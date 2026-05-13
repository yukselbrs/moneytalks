import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Piyasa Haberleri | ParaKonuşur",
  description: "BIST ve Türk piyasalarına ilişkin güncel haberler ve ekonomik gelişmeler.",
  alternates: { canonical: "/haberler" },
};

export default function HaberlerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
