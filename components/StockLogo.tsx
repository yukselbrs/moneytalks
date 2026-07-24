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
  const [failed, setFailed] = useState(false);
  // Acik logoUrl (or. yeni kotasyonlarin araci-kurum logosu) statik cozumun onunde gelir.
  const src = failed ? null : (logoUrl || getStockLogoUrl(ticker, domain));
  const source = failed ? "fallback" : (logoUrl ? "domain" : getStockLogoSource(ticker, domain));
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
        background: src ? (hasNeutralPlate ? "#050914" : "transparent") : `${color}18`,
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
          unoptimized
          style={{
            width: hasNeutralPlate ? domainImageSize : resolvedImageSize,
            height: hasNeutralPlate ? domainImageSize : resolvedImageSize,
            objectFit: "contain",
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ fontSize: fallbackSize, fontWeight: 700, color }}>
          {fallbackText(ticker)}
        </span>
      )}
    </div>
  );
}
