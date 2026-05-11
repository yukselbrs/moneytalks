export const LS = {
  RECENT: "pk_recent",
  PIYASA: "pk_piyasa",
  SB_COLLAPSED: "pk_sb_collapsed",
  analiz: (ticker: string) => `pk_analiz_${ticker}`,
} as const;
