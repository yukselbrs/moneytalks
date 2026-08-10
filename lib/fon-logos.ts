import { FON_LOGO_FILES } from "./fon-logo-files";

// Fon unvanindan kurucu portfoy sirketini cikarip logo kaynagi uretir.
// Oncelik: 1) public/fon-logos/ altindaki indirilen resmi logo (manifest'te
// kayitli), 2) sirket sitesinin favicon'u, 3) kurucu bas harfleriyle renkli
// fallback (FonLogo bileseninde). Resmi logolari indirmek icin:
//   node scripts/fetch-fon-logos.mjs

const TR_LOWER_MAP: Record<string, string> = {
  "İ": "i", "I": "i", "Ş": "s", "Ğ": "g", "Ü": "u", "Ö": "o", "Ç": "c",
  "ı": "i", "ş": "s", "ğ": "g", "ü": "u", "ö": "o", "ç": "c",
};

export function fonKuruculugSlug(kurucu: string) {
  return kurucu
    .split("")
    .map((ch) => TR_LOWER_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Unvan TEFAS'ta hep "<KURUCU> PORTFOY ..." ile baslar; PORTFOY kelimesine
// kadar olan kismi (dahil) kurucu kabul ediyoruz.
export function fonKurucu(unvan: string): string | null {
  const match = unvan.match(/^(.{2,40}?PORTF[ÖO]Y)/u);
  return match ? match[1].trim() : null;
}

// Yalnizca emin olunan sirket siteleri. Var olmayan/yanlis domain favicon'u
// bozuk gelirse bilesen bas harf fallback'ine duser; risk dusuk.
// scripts/fetch-fon-logos.mjs bu haritayi okuyarak resmi logolari indirir.
export const KURUCU_DOMAINS: Record<string, string> = {
  "ak-portfoy": "akportfoy.com.tr",
  "ata-portfoy": "ataportfoy.com.tr",
  "is-portfoy": "isportfoy.com.tr",
  "ziraat-portfoy": "ziraatportfoy.com.tr",
  "yapi-kredi-portfoy": "yapikrediportfoy.com.tr",
  "garanti-portfoy": "garantibbvaportfoy.com.tr",
  "vakif-portfoy": "vakifportfoy.com.tr",
  "halk-portfoy": "halkportfoy.com.tr",
  "teb-portfoy": "tebportfoy.com.tr",
  "deniz-portfoy": "denizportfoy.com.tr",
  "istanbul-portfoy": "istanbulportfoy.com",
  "qnb-portfoy": "qnbportfoy.com.tr",
  "oyak-portfoy": "oyakportfoy.com.tr",
  "gedik-portfoy": "gedikportfoy.com.tr",
  "seker-portfoy": "sekerportfoy.com.tr",
  "tacirler-portfoy": "tacirlerportfoy.com.tr",
  "kt-portfoy": "ktportfoy.com.tr",
  "fiba-portfoy": "fibaportfoy.com.tr",
  "osmanli-portfoy": "osmanliportfoy.com.tr",
  "strateji-portfoy": "stratejiportfoy.com.tr",
  "hsbc-portfoy": "hsbc.com.tr",
  "icbc-turkey-portfoy": "icbc.com.tr",
  "unlu-portfoy": "unluco.com",
  "azimut-portfoy": "azimutportfoy.com.tr",
  "aktif-portfoy": "aktifportfoy.com.tr",
  "hedef-portfoy": "hedefportfoy.com.tr",
  "albaraka-portfoy": "albarakaportfoy.com.tr",
  "inveo-portfoy": "inveoportfoy.com.tr",
  "global-md-portfoy": "globalmdportfoy.com",
  "atlas-portfoy": "atlasportfoy.com.tr",
  "nurol-portfoy": "nurolportfoy.com.tr",
  "marmara-capital-portfoy": "marmaracapital.com.tr",
  "mukafat-portfoy": "mukafatportfoy.com",
  "a1-portfoy": "a1portfoy.com.tr",
  "tera-portfoy": "teraportfoy.com.tr",
  "pardus-portfoy": "pardusportfoy.com.tr",
};

const FALLBACK_COLORS = ["#3B82F6", "#14B8A6", "#F59E0B", "#8B5CF6", "#EC4899", "#22C55E", "#EAB308", "#06B6D4"];

export function fonKurucuColor(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export type FonLogoInfo = {
  kurucu: string | null;
  slug: string | null;
  // Sirayla denenecek gorsel kaynaklari; hepsi basarisizsa bas harf fallback'i.
  candidates: string[];
  color: string;
  initials: string;
};

export function getFonLogoInfo(kod: string, unvan: string): FonLogoInfo {
  const kurucu = fonKurucu(unvan);
  const slug = kurucu ? fonKuruculugSlug(kurucu) : null;
  const candidates: string[] = [];
  if (slug) {
    const localFile = FON_LOGO_FILES[slug];
    if (localFile) candidates.push(`/fon-logos/${localFile}`);
    const domain = KURUCU_DOMAINS[slug];
    if (domain) candidates.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
  }
  const initialsSource = kurucu ?? kod;
  const initials = initialsSource
    .split(/\s+/)
    .filter((word) => word && word !== "PORTFÖY" && word !== "PORTFOY")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr-TR") || kod.slice(0, 2);
  return {
    kurucu,
    slug,
    candidates,
    color: fonKurucuColor(slug ?? kod),
    initials,
  };
}
