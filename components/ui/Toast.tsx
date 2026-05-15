"use client";

import { tokens } from "@/lib/design-tokens";

type ToastTon = "error" | "success" | "info";

type ToastProps = {
  message: string;
  onClose?: () => void;
  ton?: ToastTon;
};

const TON_RENKLERI: Record<ToastTon, { bg: string; fg: string; border: string }> = {
  error: { bg: "#7F1D1D", fg: "#FECACA", border: tokens.colors.border.danger },
  success: { bg: "#064E3B", fg: "#A7F3D0", border: "rgba(16, 185, 129, 0.40)" },
  info: { bg: tokens.colors.surface.raised, fg: tokens.colors.text.primary, border: tokens.colors.border.hover },
};

export default function Toast({ message, onClose, ton = "info" }: ToastProps) {
  const palette = TON_RENKLERI[ton];
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: tokens.space.px8 * 2,
        right: tokens.space.px8 * 2,
        zIndex: 100,
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: tokens.radius.md,
        padding: `${tokens.space.px5}px ${tokens.space.px8 + tokens.space.px3 / 2}px`,
        fontSize: tokens.fontSize.base,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: tokens.space.px6,
        boxShadow: tokens.shadow.card,
      }}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Bildirimi kapat"
          style={{
            background: "transparent",
            border: "none",
            color: palette.fg,
            cursor: "pointer",
            fontSize: tokens.fontSize.lg,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
