"use client";

import { tokens } from "@/lib/design-tokens";

type SkeletonCardProps = {
  height?: number | string;
  width?: number | string;
  radius?: number;
  inline?: boolean;
};

export default function SkeletonCard({
  height = 80,
  width = "100%",
  radius = tokens.radius.lg,
  inline = false,
}: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: inline ? "inline-block" : "block",
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${tokens.colors.bg.card} 0%, ${tokens.colors.blue.alpha10} 50%, ${tokens.colors.bg.card} 100%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s linear infinite",
        border: `1px solid ${tokens.colors.border.subtle}`,
      }}
    />
  );
}
