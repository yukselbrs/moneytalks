import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev gostergesi mobilde alt navigasyonla cakisiyordu (Faz 3 A.6) — yalniz dev ortamini etkiler.
  devIndicators: { position: "bottom-right" },
  async redirects() {
    // Eski kiymetli maden rotasi "Doviz ve Kiymetli Maden" altina tasindi.
    // permanent -> 308 (Google kalici yonlendirme olarak isler, 301 esdegeri).
    return [
      { source: "/maden/:path*", destination: "/doviz-maden/:path*", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com" },
      { protocol: "https", hostname: "t1.gstatic.com" },
      { protocol: "https", hostname: "t2.gstatic.com" },
      { protocol: "https", hostname: "t3.gstatic.com" },
    ],
  },
};

export default nextConfig;
