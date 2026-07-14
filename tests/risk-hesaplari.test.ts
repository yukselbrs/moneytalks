import { describe, it, expect } from "vitest";
import { gunlukGetiriler, ortalama, stdDev, betaHesapla, rsiHesapla, emaHesapla, periyodikGetiri } from "@/lib/risk-hesaplari";

describe("gunlukGetiriler", () => {
  it("ardisik kapanislardan yuzde getiri uretir", () => {
    expect(gunlukGetiriler([100, 110, 99])).toEqual([0.1, -0.1]);
  });
  it("sifir/negatif onceki kapanisi atlar", () => {
    expect(gunlukGetiriler([0, 100, 110])).toEqual([0.1]);
  });
});

describe("betaHesapla", () => {
  const piyasa = [0.01, -0.02, 0.015, 0.005, -0.01, 0.02, -0.005, 0.01, -0.015, 0.008, 0.012, -0.007];

  it("piyasanin ikiye katlanmis kopyasi icin beta ~2", () => {
    const hisse = piyasa.map(r => r * 2);
    expect(betaHesapla(hisse, piyasa)).toBeCloseTo(2, 6);
  });
  it("birebir ayni seri icin beta ~1", () => {
    expect(betaHesapla([...piyasa], piyasa)).toBeCloseTo(1, 6);
  });
  it("10'dan az gozlemde notr 1 doner", () => {
    expect(betaHesapla([0.01, 0.02], [0.01, 0.02])).toBe(1);
  });
  it("piyasa varyansi sifirsa 1 doner", () => {
    const duzPiyasa = new Array(12).fill(0);
    expect(betaHesapla(piyasa, duzPiyasa)).toBe(1);
  });
});

describe("rsiHesapla (Wilder)", () => {
  it("15'ten az kapanista notr 50 doner", () => {
    expect(rsiHesapla([1, 2, 3])).toBe(50);
  });
  it("hic dusus yoksa 100 doner", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(rsiHesapla(closes)).toBe(100);
  });
  it("hic yukselis yoksa 0'a yakinsar", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 - i);
    expect(rsiHesapla(closes)).toBeCloseTo(0, 6);
  });
  it("simetrik testere seride 50 civarinda kalir", () => {
    // +1/-1 donusumlu 30 kapanis: kazanc/kayip dengeli; son delta'nin fazina gore hafif sapar.
    const closes: number[] = [100];
    for (let i = 0; i < 30; i++) closes.push(closes[closes.length - 1] + (i % 2 === 0 ? 1 : -1));
    const rsi = rsiHesapla(closes);
    expect(rsi).toBeGreaterThan(45);
    expect(rsi).toBeLessThan(55);
  });
  it("Wilder smoothing: tek buyuk sicrama basit ortalamadaki gibi domine etmez", () => {
    // 14 gunluk sakin seed + tek gunde +%20 sicrama + sakin devam:
    // Wilder'da etki ustel olarak sonumlenir; deger 50 ile 100 arasinda, 100'e yapismamis olmali.
    const closes = [
      ...Array.from({ length: 15 }, (_, i) => 100 + (i % 2 === 0 ? 0.5 : -0.4)),
      121, // sicrama
      ...Array.from({ length: 15 }, (_, i) => 121 + (i % 2 === 0 ? 0.5 : -0.4)),
    ];
    const rsi = rsiHesapla(closes);
    expect(rsi).toBeGreaterThan(50);
    expect(rsi).toBeLessThan(95);
  });
});

describe("emaHesapla", () => {
  it("sabit seride sabit degeri doner", () => {
    expect(emaHesapla(new Array(30).fill(42), 5)).toBeCloseTo(42, 9);
  });
  it("periyottan kisa seride son kapanisi doner", () => {
    expect(emaHesapla([1, 2, 3], 5)).toBe(3);
  });
});

describe("periyodikGetiri", () => {
  it("n gun onceki kapanisa gore yuzde doner", () => {
    expect(periyodikGetiri([100, 105, 110], 2)).toBeCloseTo(10, 9);
  });
  it("yetersiz seride null doner", () => {
    expect(periyodikGetiri([100, 110], 5)).toBeNull();
  });
});

describe("ortalama/stdDev", () => {
  it("ortalama dogru", () => {
    expect(ortalama([1, 2, 3, 4])).toBe(2.5);
  });
  it("sabit serinin sapmasi 0", () => {
    expect(stdDev([5, 5, 5])).toBe(0);
  });
});
