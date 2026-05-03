import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Manrope } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  verification: {
    google: "07quE2WQ2Y35Xug7Ezge5_eyMAxSzP_WZg40homYMT8",
  },
  icons: { icon: "/favicon.svg" },
  title: "ParaKonusur — BIST Yapay Zekâ Analiz Platformu",
  description:
    "Yapay zekâ destekli analiz motorumuz BIST'teki 500+ hisseyi saniyede değerlendirir. Finansal veriyi, piyasa duyarlılığını ve teknik sinyalleri birleştirip size net içgörüler sunar.",
  openGraph: {
    title: "ParaKonusur — BIST Yapay Zekâ Analiz Platformu",
    description: "500+ BIST hissesi için yapay zekâ destekli analiz. Erken erişim açık.",
    url: "https://parakonusur.com",
    siteName: "ParaKonusur",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ParaKonusur — BIST Yapay Zekâ Analiz Platformu",
    description: "500+ BIST hissesi için yapay zekâ destekli analiz.",
    images: ["/og-image.png"],
  },
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
      <body className="min-h-full flex flex-col antialiased">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-0H2KJGRV6D"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-0H2KJGRV6D');
          `}
        </Script>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
