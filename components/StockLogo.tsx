"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { getStockLogoUrl } from "@/lib/stock-logos";

type StockLogoProps = {
  ticker: string;
  domain?: string;
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
  size = 40,
  imageSize,
  radius = 10,
  className,
  style,
  color = "#3B82F6",
}: StockLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : getStockLogoUrl(ticker, domain);
  const resolvedImageSize = imageSize ?? Math.round(size * 0.62);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `${color}22`,
        border: `1px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={`${ticker} logo`}
          style={{ width: resolvedImageSize, height: resolvedImageSize, objectFit: "contain" }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ fontSize: Math.max(8, Math.round(size * 0.25)), fontWeight: 700, color }}>
          {fallbackText(ticker)}
        </span>
      )}
    </div>
  );
}
