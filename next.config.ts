import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev gostergesi mobilde alt navigasyonla cakisiyordu (Faz 3 A.6) — yalniz dev ortamini etkiler.
  devIndicators: { position: "bottom-right" },
  async redirects() {
    // Eski kiymetli maden rotasi "Doviz ve Kiymetli Maden" altina tasindi.
    // permanent -> 308 (Google kalici yonlendirme olarak isler, 301 esdegeri).
    return [
      { source: "/maden/:path*", destination: "/doviz-maden/:path*", permanent: true },
      // "VİOP Nedir?" Egitimler > Turev Araclar altina tasindi (9 Agu 2026).
      // Sayfa sitemap'te priority 0.8 ile indeksliydi; kalici yonlendirme sart.
      { source: "/viop-nedir", destination: "/egitimler/turev-araclar/viop-nedir", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // CSP — YALNIZ sifir-risk direktifler. script-src bilincli olarak YOK:
          // Next.js inline script/style uretiyor, kisitlamak icin nonce altyapisi gerekir
          // (mimari degisiklik, launch oncesi riskli). Asagidakiler hicbir mevcut davranisi
          // bozmadan gercek kazanc saglar:
          //   object-src 'none'      -> Flash/plugin tabanli enjeksiyon yolu kapali
          //   base-uri 'self'        -> <base> enjeksiyonuyla goreli URL kacirma kapali
          //   frame-ancestors 'none' -> clickjacking (X-Frame-Options'in modern karsiligi)
          //   form-action 'self'     -> enjekte edilen formun disariya POST etmesi kapali
          {
            key: "Content-Security-Policy",
            value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com" },
      { protocol: "https", hostname: "t1.gstatic.com" },
      { protocol: "https", hostname: "t2.gstatic.com" },
      { protocol: "https", hostname: "t3.gstatic.com" },
      { protocol: "https", hostname: "www.ahlatciyatirim.com.tr" },
    ],
  },
};

export default nextConfig;
