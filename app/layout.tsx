import type { Metadata } from "next";
import { Geist, Manrope } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-syne",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ParaKonusur — BIST Yapay Zekâ Analiz Platformu",
  description:
    "Yapay zekâ destekli analiz motorumuz BIST'teki her hisseyi saniyede değerlendirir. Finansal veriyi, piyasa duyarlılığını ve teknik sinyalleri birleştirip size tek bir net yanıt verir.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geist.variable} ${manrope.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
