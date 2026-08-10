"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { getFonLogoInfo } from "@/lib/fon-logos";

type FonLogoProps = {
  kod: string;
  unvan: string;
  size?: number;
  radius?: number;
  style?: CSSProperties;
};

export default function FonLogo({ kod, unvan, size = 26, radius = 7, style }: FonLogoProps) {
  const info = useMemo(() => getFonLogoInfo(kod, unvan), [kod, unvan]);
  // Sirayla candidates[0], candidates[1]... denenir; hata alan sonrakine gecer.
  const [candidateIndex, setCandidateIndex] = useState(0);
  const src = info.candidates[candidateIndex] ?? null;
  const fallbackSize = Math.max(8, Math.round(size * 0.36));

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: src ? "#050914" : `${info.color}18`,
        border: src ? "1px solid rgba(148,163,184,0.12)" : `1px solid ${info.color}33`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
      title={info.kurucu ?? undefined}
    >
      {src ? (
        <Image
          src={src}
          alt={`${info.kurucu ?? kod} logo`}
          width={Math.round(size * 0.72)}
          height={Math.round(size * 0.72)}
          unoptimized
          style={{ width: Math.round(size * 0.72), height: Math.round(size * 0.72), objectFit: "contain" }}
          onError={() => setCandidateIndex((index) => index + 1)}
        />
      ) : (
        <span style={{ fontSize: fallbackSize, fontWeight: 800, color: info.color }}>
          {info.initials}
        </span>
      )}
    </div>
  );
}
