const TR_LOCALE = "tr-TR";

type NumericValue = number | null | undefined;

function isFiniteNumber(value: NumericValue): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatNumber(
  value: NumericValue,
  options: Intl.NumberFormatOptions = {},
  fallback = "—"
) {
  if (!isFiniteNumber(value)) return fallback;
  return new Intl.NumberFormat(TR_LOCALE, options).format(value);
}

export function formatCurrency(value: NumericValue, options: Intl.NumberFormatOptions = {}) {
  if (!isFiniteNumber(value)) return "—";
  return `${formatNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  })} ₺`;
}

export function formatSignedCurrency(value: NumericValue, options: Intl.NumberFormatOptions = {}) {
  if (!isFiniteNumber(value)) return "—";
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(value), options)}`;
}

type PercentOptions = {
  fractionDigits?: number;
  signDisplay?: "never" | "negative" | "always";
  symbolPosition?: "prefix" | "suffix";
  absolute?: boolean;
};

export function formatPercent(value: NumericValue, options: PercentOptions = {}) {
  if (!isFiniteNumber(value)) return "—";

  const {
    fractionDigits = 2,
    signDisplay = "negative",
    symbolPosition = "suffix",
    absolute = false,
  } = options;
  const resolvedSignDisplay = absolute ? "never" : signDisplay;
  const sign = resolvedSignDisplay === "always"
    ? value >= 0 ? "+" : "-"
    : resolvedSignDisplay === "negative" && value < 0 ? "-" : "";
  const number = formatNumber(Math.abs(value), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return symbolPosition === "prefix" ? `%${sign}${number}` : `${sign}${number}%`;
}

export function formatQuantity(value: NumericValue, unit?: string) {
  if (!isFiniteNumber(value)) return "—";
  const formatted = formatNumber(value, { maximumFractionDigits: 0, useGrouping: true });
  return unit ? `${formatted} ${unit}` : formatted;
}
