const ERTELENEN_HALKA_ARZ_KODLARI = new Set(["BEWEN"]);

export function ertelenenHalkaArzMi(kod: string | null | undefined) {
  return kod ? ERTELENEN_HALKA_ARZ_KODLARI.has(kod.toLocaleUpperCase("tr-TR")) : false;
}
