import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ParaKonusur - Paraya Dair Her Sey",
  description: "Turkiye AI destekli finans ve yatirim platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={geist.className}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
