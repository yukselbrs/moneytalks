export type TahsisatGrubu = { grup: string; oran: number | string };

export type DagitimGirdisi = {
  pay_miktari: number | null;
  buyukluk: number | null;
  fiyat: number | null;
  dagitim_yontemi: string | null;
  tahsisat_gruplari: TahsisatGrubu[] | null;
};

export type DagitimHesabi = {
  toplamPay: number;
  bireyselOran: number;
  dagitilacakPay: number;
  toplamPayTuretildi: boolean;
  varsayim: "aciklanan_tahsisat" | "esit_dagitim" | "ust_sinir";
};

function oranOku(value: number | string): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value.replace("%", "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function esitDagitimMi(value: string | null): boolean {
  const normalized = value?.toLocaleLowerCase("tr-TR");
  return Boolean(normalized?.includes("eşit") || normalized?.includes("esit"));
}

export function halkaArzDagitimHesabi(arz: DagitimGirdisi): DagitimHesabi | null {
  // Tahsisat, oransal dağıtımı kişi başına eşit dağıtıma dönüştürmez.
  if (arz.dagitim_yontemi && !esitDagitimMi(arz.dagitim_yontemi)) return null;
  let toplamPay = arz.pay_miktari;
  let toplamPayTuretildi = false;
  if (toplamPay === null && arz.buyukluk !== null && arz.fiyat !== null && arz.fiyat > 0) {
    toplamPay = Math.round(arz.buyukluk / arz.fiyat);
    toplamPayTuretildi = true;
  }
  if (toplamPay === null || !Number.isFinite(toplamPay) || toplamPay <= 0) return null;

  const bireyselGrup = arz.tahsisat_gruplari?.find((t) => t.grup.toLocaleLowerCase("tr-TR").includes("bireysel"));
  const aciklananOran = bireyselGrup ? oranOku(bireyselGrup.oran) : null;
  if (aciklananOran !== null && aciklananOran > 0 && aciklananOran <= 100) {
    return {
      toplamPay,
      bireyselOran: aciklananOran,
      dagitilacakPay: Math.floor(toplamPay * aciklananOran / 100),
      toplamPayTuretildi,
      varsayim: "aciklanan_tahsisat",
    };
  }

  if (esitDagitimMi(arz.dagitim_yontemi)) {
    return { toplamPay, bireyselOran: 100, dagitilacakPay: toplamPay, toplamPayTuretildi, varsayim: "esit_dagitim" };
  }

  // Eski kayitlarda dagitim yontemi/tahsisat bos olabiliyor. Tum detaylarda araci korumak icin
  // toplam arz payini %100 kabul eden, UI'da acikca "ust sinir" diye isaretlenen tahmin doner.
  if (!arz.dagitim_yontemi) {
    return { toplamPay, bireyselOran: 100, dagitilacakPay: toplamPay, toplamPayTuretildi, varsayim: "ust_sinir" };
  }

  // Oransal dagitimda katilimci sayisindan kisi basi sabit lot hesaplanamaz.
  return null;
}
