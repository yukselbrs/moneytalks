/**
 * Design tokens — globals.css'teki CSS variable'ların TypeScript karşılığı.
 * Inline style'larda `color: tokens.text.primary` yazarak hex literal'lardan
 * kurtulmak için kullanılır. CSS tarafında aynı değerler `var(--...)` üzerinden
 * erişilebilir.
 */

export const colors = {
  bg: {
    primary: "#0F172A",
    secondary: "#0B1220",
    card: "rgba(255, 255, 255, 0.02)",
    surface: "rgba(15, 23, 42, 0.72)",
  },
  blue: {
    royal: "#1E40AF",
    signal: "#3B82F6",
    pulse: "#60A5FA",
    alpha10: "rgba(59, 130, 246, 0.10)",
    alpha15: "rgba(59, 130, 246, 0.15)",
    alpha20: "rgba(59, 130, 246, 0.20)",
    alpha30: "rgba(59, 130, 246, 0.30)",
  },
  text: {
    primary: "#F1F5F9",
    secondary: "#94A3B8",
    muted: "#64748B",
    dim: "#475569",
    invert: "#0F172A",
  },
  state: {
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
    orange: "#F97316",
  },
  border: {
    base: "rgba(59, 130, 246, 0.12)",
    subtle: "rgba(59, 130, 246, 0.10)",
    hover: "rgba(59, 130, 246, 0.30)",
    danger: "rgba(239, 68, 68, 0.40)",
  },
  surface: {
    glass: "rgba(11, 18, 32, 0.80)",
    overlay: "rgba(11, 18, 32, 0.70)",
    raised: "#0F1C2E",
    sunken: "#1E293B",
  },
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  pill: 999,
} as const;

export const space = {
  px1: 2,
  px2: 4,
  px3: 6,
  px4: 8,
  px5: 10,
  px6: 12,
  px8: 16,
  px10: 20,
  px12: 24,
  px16: 32,
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 20,
  display: 26,
} as const;

export const shadow = {
  card: "0 8px 24px rgba(0, 0, 0, 0.35)",
  glow: "0 0 22px rgba(59, 130, 246, 0.13), 0 0 44px rgba(59, 130, 246, 0.05)",
  buttonPrimary: "0 8px 20px rgba(37, 99, 235, 0.22)",
  flash: "0 1px 4px rgba(59, 130, 246, 0.30)",
} as const;

export const gradient = {
  buttonPrimary: "linear-gradient(135deg, #1E40AF, #3B82F6)",
  buttonHover: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
  brandText: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1E40AF 100%)",
  surface: "linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(11, 18, 32, 0.96))",
} as const;

export const tokens = {
  colors,
  radius,
  space,
  fontSize,
  shadow,
  gradient,
} as const;

export type Tokens = typeof tokens;
