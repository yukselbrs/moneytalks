import { describe, expect, it } from "vitest";
import { halkaArzDagitimHesabi, type DagitimGirdisi } from "@/lib/halka-arz-dagitim";

const temel: DagitimGirdisi = {
  pay_miktari: 87_500_000,
  buyukluk: 2_200_000_000,
  fiyat: 25.52,
  dagitim_yontemi: "Eşit Dağıtım",
  tahsisat_gruplari: null,
};

describe("halkaArzDagitimHesabi", () => {
  it("aciklanan bireysel tahsis oranini uygular", () => {
    const sonuc = halkaArzDagitimHesabi({
      ...temel,
      tahsisat_gruplari: [{ grup: "Yurt İçi Bireysel Yatırımcı", oran: 40 }],
    });
    expect(sonuc).toMatchObject({ bireyselOran: 40, dagitilacakPay: 35_000_000, varsayim: "aciklanan_tahsisat" });
  });

  it("esit dagitimda tahsisat yoksa toplam payla yaklasik hesaplar", () => {
    expect(halkaArzDagitimHesabi(temel)).toMatchObject({
      bireyselOran: 100,
      dagitilacakPay: 87_500_000,
      varsayim: "esit_dagitim",
    });
  });

  it("eski kayitta payi buyukluk/fiyattan turetip ust sinir tahmini verir", () => {
    expect(halkaArzDagitimHesabi({
      pay_miktari: null,
      buyukluk: 2_702_000_000,
      fiyat: 38.6,
      dagitim_yontemi: null,
      tahsisat_gruplari: null,
    })).toMatchObject({
      toplamPay: 70_000_000,
      dagitilacakPay: 70_000_000,
      toplamPayTuretildi: true,
      varsayim: "ust_sinir",
    });
  });

  it("oransal dagitim icin kisi basi sabit lot uretmez", () => {
    expect(halkaArzDagitimHesabi({ ...temel, dagitim_yontemi: "Oransal Dağıtım" })).toBeNull();
  });
});
