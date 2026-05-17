export const LS = {
  RECENT: "pk_recent",
  PIYASA: "pk_piyasa",
  SB_COLLAPSED: "pk_sb_collapsed",
  LOGIN_IDENTIFIER: "pk_login_identifier",
  analiz: (ticker: string) => `pk_analiz_${ticker}`,
} as const;
