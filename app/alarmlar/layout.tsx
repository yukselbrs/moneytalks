import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fiyat Alarmları | ParaKonuşur",
  description: "BIST hisseleri için fiyat ve gösterge alarmı oluşturun. Hedef fiyata ulaştığında e-posta bildirimi alın.",
  alternates: { canonical: "/alarmlar" },
};

export default function AlarmlarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
