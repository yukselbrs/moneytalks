import { FON_LOGO_FILES, FON_LOGO_BACKGROUNDS } from "./fon-logo-files";

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
  const normalized = unvan.toLocaleUpperCase("tr-TR").replace(/\s+/g, " ").trim().replace(/ PYŞ(?=\s|$)/u, " PORTFÖY");
  const match = normalized.match(/^(.{1,60}?PORTF[ÖO]Y)/u);
  return match ? match[1].trim() : null;
}

// Yalnizca emin olunan sirket siteleri. Var olmayan/yanlis domain favicon'u
// bozuk gelirse bilesen bas harf fallback'ine duser; risk dusuk.
// scripts/fetch-fon-logos.mjs bu haritayi okuyarak resmi logolari indirir.
export const KURUCU_DOMAINS: Record<string, string> = {
  "a1-capital-portfoy": "www.a1portfoy.com",
  "ahlatci-portfoy": "www.ahlatciportfoy.com.tr",
  "ak-portfoy": "www.akportfoy.com.tr",
  "aktif-portfoy": "www.aktifportfoy.com.tr",
  "albaraka-portfoy": "www.albarakaportfoy.com.tr",
  "allbatross-portfoy": "allbatrossportfoy.com",
  "astra-portfoy": "www.astraportfoy.com.tr",
  "ata-portfoy": "www.ataportfoy.com.tr",
  "atlas-portfoy": "www.atlasportfoy.com",
  "aura-portfoy": "www.auraportfoy.com.tr",
  "azimut-portfoy": "www.azimutportfoy.com",
  "btcturk-portfoy": "portfoy.btcturk.com",
  "bulls-portfoy": "www.bullsportfoy.com",
  "bv-portfoy": "www.bvportfoy.com",
  "deniz-portfoy": "www.denizportfoy.com",
  "destek-portfoy": "www.destekportfoy.com",
  "emaa-blue-portfoy": "www.emaaportfoy.com.tr",
  "emlak-katilim-portfoy": "www.emlakkatilimportfoy.com.tr",
  "fiba-portfoy": "www.fibaportfoy.com.tr",
  "fonmap-portfoy": "www.fonmap.com",
  "garanti-portfoy": "www.garantibbvaportfoy.com.tr",
  "global-md-portfoy": "www.globalmdportfoy.com.tr",
  "golden-global-portfoy": "goldenglobalportfoy.com.tr",
  "has-portfoy": "www.hasportfoy.com.tr",
  "hedef-portfoy": "www.hedefportfoy.com.tr",
  "hsbc-portfoy": "www.hsbcportfoy.com.tr",
  "incir-portfoy": "www.incirportfoy.com.tr",
  "inveo-portfoy": "www.inveoportfoy.com",
  "is-portfoy": "www.isportfoy.com.tr",
  "istanbul-portfoy": "www.istanbulportfoy.com",
  "kare-portfoy": "kareportfoy.com.tr",
  "kuveyt-turk-portfoy": "www.kuveytturkportfoy.com.tr",
  "logos-portfoy": "www.logosportfoy.com",
  "marmara-capital-portfoy": "www.marmaracapital.com.tr",
  "meksa-portfoy": "www.meksaportfoy.com.tr",
  "mt-portfoy": "www.mtportfoy.com",
  "neo-portfoy": "www.neoportfoy.com.tr",
  "nurol-portfoy": "www.nurolportfoy.com.tr",
  "one-portfoy": "www.oneportfoy.com.tr",
  "osmanli-portfoy": "www.osmanliportfoy.com.tr",
  "oyak-portfoy": "www.oyakportfoy.com.tr",
  "pardus-portfoy": "www.pardusportfoy.com",
  "perform-portfoy": "www.performportfoy.com",
  "phillip-portfoy": "phillipportfoy.com.tr",
  "piramit-portfoy": "www.piramitportfoy.com.tr",
  "pusula-portfoy": "pusulaportfoy.com.tr",
  "qnb-portfoy": "www.qnbportfoy.com.tr",
  "re-pie-portfoy": "www.repieportfoy.com",
  "rota-portfoy": "www.rotaportfoy.com.tr",
  "sparta-portfoy": "www.spartaportfoy.com.tr",
  "statech-portfoy": "www.statechportfoy.com.tr",
  "strateji-portfoy": "www.stratejiportfoy.com.tr",
  "tacirler-portfoy": "www.tacirlerportfoy.com.tr",
  "teb-portfoy": "www.tebportfoy.com.tr",
  "tera-portfoy": "www.teraportfoy.com",
  "trive-portfoy": "www.triveportfoy.com.tr",
  "unlu-portfoy": "www.unluportfoy.com",
  "v-portfoy": "www.vportfoy.com.tr",
  "vakif-katilim-portfoy": "www.vakifkatilimportfoy.com.tr",
  "vega-portfoy": "www.vegaportfoy.com",
  "yapi-kredi-portfoy": "www.yapikrediportfoy.com.tr",
  "ziraat-portfoy": "www.ziraatportfoy.com.tr",

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
  background: string;
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
    if (domain) candidates.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
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
    background: (slug && FON_LOGO_BACKGROUNDS[slug]) || "#F8FAFC",
    color: fonKurucuColor(slug ?? kod),
    initials,
  };
}
