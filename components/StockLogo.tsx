"use client";

import { useState } from "react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { getStockLogoSource, getStockLogoUrl } from "@/lib/stock-logos";

type StockLogoProps = {
  ticker: string;
  domain?: string;
  logoUrl?: string | null;
  size?: number;
  imageSize?: number;
  radius?: number;
  className?: string;
  style?: CSSProperties;
  color?: string;
};

function fallbackText(ticker: string) {
  return ticker.slice(0, 3).toUpperCase();
}

export default function StockLogo({
  ticker,
  domain,
  logoUrl,
  size = 40,
  imageSize,
  radius = 10,
  className,
  style,
  color = "#3B82F6",
}: StockLogoProps) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const candidates = [logoUrl, getStockLogoUrl(ticker, domain), domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null];
  // Acik logoUrl (or. yeni kotasyonlarin araci-kurum logosu) statik cozumun onunde gelir.
  const src = candidates.find((candidate): candidate is string => Boolean(candidate) && !failedSources.includes(candidate!)) ?? null;
  const source = src === logoUrl ? "domain" : getStockLogoSource(ticker, domain);
  const resolvedImageSize = imageSize ?? size;
  const domainImageSize = imageSize ?? Math.round(size * 0.7);
  const fallbackSize = Math.max(8, Math.round(size * 0.28));
  const hasNeutralPlate = source === "domain";

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: src ? (hasNeutralPlate ? "#F8FAFC" : "#F0F3FA") : `${color}18`,
        border: src ? "none" : `1px solid ${color}33`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={`${ticker} logo`}
          width={hasNeutralPlate ? domainImageSize : resolvedImageSize}
          height={hasNeutralPlate ? domainImageSize : resolvedImageSize}
          // Acik logoUrl'i (uzak host) next/image proxy'siyle SAME-ORIGIN servis et (server-fetch,
          // Vercel cache) — client cross-origin/referer takintilarini asar. Diger kaynaklar (data:,
          // favicon) unoptimized kalir.
          unoptimized={!(logoUrl && logoUrl === src && /^https?:\/\//.test(logoUrl))}
          style={{
            width: hasNeutralPlate ? domainImageSize : resolvedImageSize,
            height: hasNeutralPlate ? domainImageSize : resolvedImageSize,
            objectFit: "contain",
          }}
          onError={() => setFailedSources((sources) => [...sources, src])}
        />
      ) : (
        <span style={{ fontSize: fallbackSize, fontWeight: 700, color }}>
          {fallbackText(ticker)}
        </span>
      )}
    </div>
  );
}
