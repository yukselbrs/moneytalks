import bistCompanies from "@/data/bist-companies.json";

export type BistHisse = {
  ticker: string;
  ad: string;
  domain?: string;
  fullName?: string;
  kapTitle?: string | null;
  city?: string | null;
  kapMemberOid?: string | null;
  source?: string;
  listed?: boolean;
  priceAvailable?: boolean | null;
};

export const BIST_HISSELER = bistCompanies as BistHisse[];
