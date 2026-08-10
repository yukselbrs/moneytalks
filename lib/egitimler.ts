// Egitimler menusunun TEK kaynagi. Yeni kategori/egitim eklemek icin YALNIZ bu diziye
// oge eklenir — nav, kategori sayfasi, sekme cubugu ve sitemap buradan beslenir.
// Hardcoded tek kategori degil: ikinci kategori (or. "Temel Analiz") eklendiginde
// hicbir bilesen degistirilmez.

export type Egitim = {
  slug: string;
  ad: string;             // sekme etiketi (kisa)
  baslik: string;         // kart basligi (tam)
  ozet: string;
  sure: string;           // tahmini okuma/etkilesim suresi
  hazir: boolean;         // false ise kartta "Yakinda", route yok
};

export type EgitimKategori = {
  slug: string;
  ad: string;
  aciklama: string;
  egitimler: Egitim[];
};

export const EGITIM_KATEGORILERI: EgitimKategori[] = [
  {
    slug: "turev-araclar",
    ad: "Türev Araçlar",
    aciklama: "Vadeli işlemler, forward ve türev piyasaların temel kavramları.",
    egitimler: [
      {
        slug: "viop-nedir",
        ad: "VİOP Nedir?",
        baslik: "VİOP Nedir? — Kaldıraç, Teminat ve Long/Short",
        ozet: "Borsada işlem gören, standartlaştırılmış vadeli kontratları THYAO örneğiyle sıfırdan anlat.",
        sure: "~10 dk",
        hazir: true,
      },
      {
        slug: "forward-nedir",
        ad: "Forward Nedir?",
        baslik: "Forward Nedir? — Taraflar Arası Özel Anlaşma ve Karşı Taraf Riski",
        ozet: "Borsa dışı (OTC) forward sözleşmelerini, VİOP'tan farkını ve karşı taraf riskini anlat.",
        sure: "~10 dk",
        hazir: true,
      },
      {
        // Sira ONEMLI: forward'dan SONRA gelir — Bolum 3 forward bilgisinin uzerine kuruluyor.
        slug: "swap-nedir",
        ad: "Swap Nedir?",
        baslik: "Swap Nedir? — Nakit Akışı Takası ve Faiz Swap'ı",
        ozet: "Swap'ın arka arkaya dizilmiş forward'lar olduğunu, faiz swap'ını ve karşı taraf riskini anlat.",
        sure: "~10 dk",
        hazir: true,
      },
    ],
  },
];

export const EGITIM_KOK = "/egitimler";

export function kategoriBul(slug: string): EgitimKategori | undefined {
  return EGITIM_KATEGORILERI.find((k) => k.slug === slug);
}

export function egitimYolu(kategoriSlug: string, egitimSlug: string): string {
  return `${EGITIM_KOK}/${kategoriSlug}/${egitimSlug}`;
}

// Sitemap ve testler icin duz liste.
export function tumEgitimler(): { yol: string; kategori: EgitimKategori; egitim: Egitim }[] {
  return EGITIM_KATEGORILERI.flatMap((k) =>
    k.egitimler.filter((e) => e.hazir).map((e) => ({ yol: egitimYolu(k.slug, e.slug), kategori: k, egitim: e })),
  );
}
