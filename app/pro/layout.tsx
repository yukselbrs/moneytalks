import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pro Plan | ParaKonuşur",
  description: "Sınırsız AI analiz, gelişmiş risk skorlama ve öncelikli destek. ParaKonuşur Pro çok yakında — çıktığında ilk siz haberdar olun.",
  alternates: { canonical: "/pro" },
};

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
