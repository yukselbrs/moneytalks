"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { getStockLogoSource, getStockLogoUrl } from "@/lib/stock-logos";

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
  const source = failed ? "fallback" : getStockLogoSource(ticker, domain);
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
        borderRadius: hasNeutralPlate ? 999 : radius,
        background: src ? (hasNeutralPlate ? "#050914" : "transparent") : "rgba(148, 163, 184, 0.08)",
        border: src ? "none" : "1px solid rgba(148, 163, 184, 0.12)",
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
          style={{
            width: hasNeutralPlate ? domainImageSize : resolvedImageSize,
            height: hasNeutralPlate ? domainImageSize : resolvedImageSize,
            objectFit: "contain",
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ fontSize: fallbackSize, fontWeight: 700, color: "#94A3B8" }}>
          {fallbackText(ticker)}
        </span>
      )}
    </div>
  );
}
