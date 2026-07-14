import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev gostergesi mobilde alt navigasyonla cakisiyordu (Faz 3 A.6) — yalniz dev ortamini etkiler.
  devIndicators: { position: "bottom-right" },
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
