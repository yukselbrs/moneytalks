import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bildirimler | ParaKonuşur",
  description: "Alarm tetiklenmeleri, AI analiz güncellemeleri ve önemli piyasa bildirimleri.",
  alternates: { canonical: "https://parakonusur.com/bildirimler" },
};

export default function BildirimlerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
