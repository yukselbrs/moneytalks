export type FonPortfoyDagilim = {
  ad: string;
  oran: number;
  renk: string;
};

export type FonPortfoyPozisyon = {
  kod: string;
  ad: string;
  tur: string;
  oran: number;
  deger: number;
  tahminOrani?: number;
  fiyatlama?: "hisse" | "tefas" | "gefas" | "sabit";
  fiyatlamaKodu?: string;
  yillikGetiriTahmini?: number;
};

export type FonPortfoy = {
  kod: string;
  donem: string;
  yayinTarihi: string;
  toplamDeger: number;
  dagilim: FonPortfoyDagilim[];
  pozisyonlar: FonPortfoyPozisyon[];
};

const DFI_PORTFOY: FonPortfoy = {
  kod: "DFI",
  donem: "Haziran 2026",
  yayinTarihi: "08.07.2026",
  toplamDeger: 19_038_252_509.74,
  dagilim: [
    { ad: "Hisse Senedi", oran: 67.38, renk: "#22C55E" },
    { ad: "Katılma Belgesi", oran: 32.96, renk: "#38BDF8" },
    { ad: "Vadeli Mevduat TL", oran: 3.35, renk: "#A78BFA" },
    { ad: "Devlet Tahvili Repo", oran: -2.54, renk: "#F97316" },
    { ad: "Takasbank Para Piyasası", oran: -1.15, renk: "#EF4444" },
  ],
  pozisyonlar: [
    {
      kod: "IEYHO",
      ad: "Işıklar Enerji ve Yapı Holding A.Ş.",
      tur: "Hisse Senedi",
      oran: 64.78,
      tahminOrani: 62.310869,
      deger: 12_429_913_392,
    },
    {
      kod: "ABG",
      ad: "Atlas Portföy Dördüncü Serbest Fon",
      tur: "Katılma Belgesi",
      oran: 36,
      tahminOrani: 32.768848,
      deger: 6_908_678_616.19,
      fiyatlama: "tefas",
    },
    {
      kod: "ISKPL",
      ad: "Işık Plastik Sanayi ve Dış Ticaret Pazarlama A.Ş.",
      tur: "Hisse Senedi",
      oran: 4.93,
      tahminOrani: 4.74209,
      deger: 945_243_348.42,
    },
    {
      kod: "LIDER",
      ad: "LDR Turizm A.Ş.",
      tur: "Hisse Senedi",
      oran: 0.34,
      tahminOrani: 0.327041,
      deger: 65_120_000,
    },
    {
      kod: "KVR",
      ad: "Atlas Portföy Kısa Vadeli Serbest Fon",
      tur: "Katılma Belgesi",
      oran: 0.21,
      tahminOrani: 0.191152,
      deger: 40_000_000.02,
      fiyatlama: "tefas",
    },
    {
      kod: "DFI-VDL",
      ad: "Vadeli Mevduat TL",
      tur: "Sabit Getirili",
      oran: 3.35,
      deger: 637_781_459.08,
      fiyatlama: "sabit",
      yillikGetiriTahmini: 43,
    },
    {
      kod: "DFI-DTR",
      ad: "Devlet Tahvili Repo",
      tur: "Sabit Getirili",
      oran: -2.54,
      deger: -483_571_613.75,
      fiyatlama: "sabit",
      yillikGetiriTahmini: 43,
    },
    {
      kod: "DFI-TPP",
      ad: "Takasbank Para Piyasası",
      tur: "Sabit Getirili",
      oran: -1.15,
      deger: -218_939_903.86,
      fiyatlama: "sabit",
      yillikGetiriTahmini: 43,
    },
  ],
};

const TLY_PORTFOY: FonPortfoy = {
  kod: "TLY",
  donem: "Haziran 2026",
  yayinTarihi: "02.07.2026",
  toplamDeger: 203_121_895_304.84,
  dagilim: [
    { ad: "Hisse Senedi", oran: 69.04, renk: "#22C55E" },
    { ad: "Repo-Trepo", oran: 14.29, renk: "#38BDF8" },
    { ad: "Yatırım Fonu", oran: 13.4, renk: "#A78BFA" },
    { ad: "Finansman Bonosu", oran: 2.46, renk: "#F59E0B" },
    { ad: "Teminat", oran: 0.73, renk: "#64748B" },
    { ad: "Kira Sertifikaları", oran: 0.08, renk: "#14B8A6" },
  ],
  pozisyonlar: [
    {
      kod: "DSTKF",
      ad: "Destek Faktoring A.Ş.",
      tur: "Hisse Senedi",
      oran: 22.85,
      deger: 46_395_976_567.5,
    },
    {
      kod: "OZATD",
      ad: "Özata Denizcilik Sanayi ve Ticaret A.Ş.",
      tur: "Hisse Senedi",
      oran: 14.3,
      deger: 29_034_026_456,
    },
    {
      kod: "PEKGY",
      ad: "Peker Gayrimenkul Yatırım Ortaklığı A.Ş.",
      tur: "Hisse Senedi",
      oran: 7.73,
      deger: 15_701_639_419.62,
    },
    {
      kod: "TEHOL",
      ad: "Tera Yatırım Teknoloji Holding A.Ş.",
      tur: "Hisse Senedi",
      oran: 7.14,
      deger: 14_490_910_012.5,
    },
    {
      kod: "TERA",
      ad: "Tera Yatırım Menkul Değerler A.Ş.",
      tur: "Hisse Senedi",
      oran: 6.63,
      deger: 13_470_283_939.82,
    },
    {
      kod: "TRHOL",
      ad: "Tera Finansal Yatırımlar Holding A.Ş.",
      tur: "Hisse Senedi",
      oran: 5.61,
      deger: 11_393_428_746,
    },
    {
      kod: "ANELE",
      ad: "Anel Elektrik Proje Taahhüt ve Ticaret A.Ş.",
      tur: "Hisse Senedi",
      oran: 1.99,
      deger: 4_049_683_600,
    },
    {
      kod: "SELEC",
      ad: "Selçuk Ecza Deposu Ticaret ve Sanayi A.Ş.",
      tur: "Hisse Senedi",
      oran: 1.04,
      deger: 2_113_484_307.3,
    },
    {
      kod: "ALKLC",
      ad: "Altınkılıç Gıda ve Süt Sanayi Ticaret A.Ş.",
      tur: "Hisse Senedi",
      oran: 0.54,
      deger: 1_086_222_894,
    },
    {
      kod: "SVGYO",
      ad: "Savur Gayrimenkul Yatırım Ortaklığı A.Ş.",
      tur: "Hisse Senedi",
      oran: 0.52,
      deger: 1_060_441_912.5,
    },
    {
      kod: "HEDEF",
      ad: "Hedef Holding A.Ş.",
      tur: "Hisse Senedi",
      oran: 0.27,
      deger: 546_100_241.08,
    },
    {
      kod: "MANAS",
      ad: "Manas Enerji Yönetimi Sanayi ve Ticaret A.Ş.",
      tur: "Hisse Senedi",
      oran: 0.14,
      deger: 293_195_727.36,
    },
    {
      kod: "DAPGM",
      ad: "DAP Gayrimenkul Geliştirme A.Ş.",
      tur: "Hisse Senedi",
      oran: 0.07,
      deger: 137_200_000,
    },
    {
      kod: "EUPWR",
      ad: "Europower Enerji ve Otomasyon Teknolojileri A.Ş.",
      tur: "Hisse Senedi",
      oran: 0.01,
      deger: 10_226_262.15,
    },
    {
      kod: "EFOR",
      ad: "Efor Çay Sanayi Ticaret A.Ş.",
      tur: "Hisse Senedi",
      oran: 0.01,
      deger: 8_754_000,
    },
    {
      kod: "TMPOL",
      ad: "Temapol Polimer Plastik A.Ş.",
      tur: "Hisse Senedi",
      oran: 0.01,
      deger: 20_784_268,
    },
    {
      kod: "TPKGY",
      ad: "Tera Portföy TPKGY Fonu",
      tur: "Yatırım Fonu",
      oran: 11.91,
      deger: 24_190_479_986.86,
      fiyatlama: "gefas",
      fiyatlamaKodu: "TRYTALP00036",
    },
    {
      kod: "HMV",
      ad: "Hedef Portföy HMV Fonu",
      tur: "Yatırım Fonu",
      oran: 1.27,
      deger: 2_579_780_520.06,
      fiyatlama: "tefas",
    },
    {
      kod: "T3B",
      ad: "Tera Portföy T3B Fonu",
      tur: "Yatırım Fonu",
      oran: 0.02,
      deger: 47_181_952.15,
      fiyatlama: "tefas",
    },
    {
      kod: "TLY-REPO",
      ad: "Repo-Trepo",
      tur: "Sabit Getirili",
      oran: 14.29,
      deger: 29_026_118_839.06,
      fiyatlama: "sabit",
      yillikGetiriTahmini: 43,
    },
    {
      kod: "TLY-FB",
      ad: "Finansman Bonosu",
      tur: "Sabit Getirili",
      oran: 2.46,
      deger: 4_996_798_624.5,
      fiyatlama: "sabit",
      yillikGetiriTahmini: 47.4,
    },
    {
      kod: "TLY-TEM",
      ad: "Teminat",
      tur: "Sabit Getirili",
      oran: 0.73,
      deger: 1_482_789_835.73,
      fiyatlama: "sabit",
      yillikGetiriTahmini: 43,
    },
    {
      kod: "TLY-KS",
      ad: "Kira Sertifikaları",
      tur: "Sabit Getirili",
      oran: 0.08,
      deger: 162_497_516.24,
      fiyatlama: "sabit",
      yillikGetiriTahmini: 48,
    },
  ],
};

export function getFonPortfoy(kod: string) {
  const normalized = kod.toLocaleUpperCase("tr-TR");
  if (normalized === "DFI") return DFI_PORTFOY;
  if (normalized === "TLY") return TLY_PORTFOY;
  return null;
}
