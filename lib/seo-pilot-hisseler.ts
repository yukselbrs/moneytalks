export const SEO_PILOT_HISSELER = [
  "THYAO", "GARAN", "ASELS", "AKBNK", "EREGL", "KCHOL", "SISE", "BIMAS", "TUPRS", "SAHOL",
  "YKBNK", "ISCTR", "PGSUS", "TCELL", "TTKOM", "FROTO", "TOASO", "ARCLK", "PETKM", "KOZAL",
  "SASA", "HEKTS", "GUBRF", "EKGYO", "VESTL", "TAVHL", "ENKAI", "ODAS", "KRDMD", "ASTOR",
  "AEFES", "MGROS", "ULKER", "AKSEN", "ALARK", "DOAS", "EGEEN", "GESAN", "KONTR", "OYAKC",
  "SMRTG", "SOKM", "TSKB", "VAKBN", "HALKB", "CCOLA", "MAVI", "BRSAN", "ISMEN", "ENJSA",
] as const;

export function seoPilotMu(ticker: string): boolean {
  return (SEO_PILOT_HISSELER as readonly string[]).includes(ticker.toUpperCase());
}
