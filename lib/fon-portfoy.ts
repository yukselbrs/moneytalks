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
      deger: 12_429_913_392,
    },
    {
      kod: "ABG",
      ad: "Atlas Portföy Dördüncü Serbest Fon",
      tur: "Katılma Belgesi",
      oran: 36,
      deger: 6_908_678_616.19,
    },
    {
      kod: "ISKPL",
      ad: "Işık Plastik Sanayi ve Dış Ticaret Pazarlama A.Ş.",
      tur: "Hisse Senedi",
      oran: 4.93,
      deger: 945_243_348.42,
    },
    {
      kod: "LIDER",
      ad: "LDR Turizm A.Ş.",
      tur: "Hisse Senedi",
      oran: 0.34,
      deger: 65_120_000,
    },
    {
      kod: "KVR",
      ad: "Atlas Portföy Kısa Vadeli Serbest Fon",
      tur: "Katılma Belgesi",
      oran: 0.21,
      deger: 40_000_000.02,
    },
  ],
};

export function getFonPortfoy(kod: string) {
  return kod.toLocaleUpperCase("tr-TR") === "DFI" ? DFI_PORTFOY : null;
}
