import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/auth-redirect";
import { portfolioComposition, adjustPosition, positivePortfolioNumber, portfolioHistory, weightedRisk } from "@/lib/portfolio-math";
import { safeAnalysis, ANALYSIS_DISCLAIMER } from "@/lib/ai-output";
import { halkaArzDagitimHesabi } from "@/lib/halka-arz-dagitim";

describe("launch safety", () => {
  it.each(["@evil.example", "//evil.example", "/\\evil.example", "https://evil.example", "/\nevil.example"])("rejects unsafe redirect %s", value => {
    expect(safeRedirectPath(value)).toBe("/dashboard");
  });
  it("preserves an internal destination and query", () => {
    expect(safeRedirectPath("/portfoy?range=1y")).toBe("/portfoy?range=1y");
  });
  it("does not classify unavailable risk as low risk", () => {
    expect(weightedRisk([{ skor: null, deger: 100 }, { skor: 20, deger: 300 }])).toBeNull();
    expect(weightedRisk([{ skor: 80, deger: 300 }, { skor: 20, deger: 100 }])).toEqual({ skor: 65, seviye: "Yüksek" });
  });
  it("retains distinct dates with the same month label and aligns assets by date", () => {
    const result = portfolioHistory([
      { adet: 2, points: [{ timestamp: 1, fiyat: 10 }, { timestamp: 2, fiyat: 20 }, { timestamp: 3, fiyat: 30 }] },
      { adet: 1, points: [{ timestamp: 1, fiyat: 20 }, { timestamp: 3, fiyat: 20 }, { timestamp: 4, fiyat: 25 }] },
    ]);
    expect(result).toEqual([{ timestamp: 1, degisim: 0 }, { timestamp: 3, degisim: 100 }]);
    expect(portfolioHistory([{ adet: 2, points: [] }])).toEqual([]);
  });
  it("never emits a fixed lot estimate for proportional allocation", () => {
    expect(halkaArzDagitimHesabi({ pay_miktari: 87500000, buyukluk: null, fiyat: 25.52, dagitim_yontemi: "Oransal Dağıtım", tahsisat_gruplari: [{ grup: "Yurt İçi Bireysel Yatırımcı", oran: 40 }] })).toBeNull();
  });
  it("filters investment commands before delivery and adds disclosure", () => {
    expect(safeAnalysis("Şimdi al, garanti getiri var.")).not.toContain("Şimdi al");
    expect(safeAnalysis("Fiyat günlük ortalamanın üzerinde.")).toContain(ANALYSIS_DISCLAIMER);
    expect(safeAnalysis(ANALYSIS_DISCLAIMER)).toBe(ANALYSIS_DISCLAIMER);
  });
});


describe("portfolio position changes", () => {
  it.each([true, false, [], [1], {}, null, "", " ", "12abc", "1e309", Infinity, NaN, -1, 0, "-5", "1,5"])("rejects invalid input %s", value => {
    expect(positivePortfolioNumber(value, 1_000_000_000)).toBeNull();
  });
  it("preserves fractional fund cost across additions and partial removals", () => {
    const added = adjustPosition({ adet: 100, maliyet: 0.123456 }, "100", "0.123458", "ekle");
    expect(added.adet).toBe(200);
    expect(added.maliyet).toBeCloseTo(0.123457, 12);
    const removed = adjustPosition(added, "50", "0.2", "cikar");
    expect(removed).toEqual({ adet: 150, maliyet: added.maliyet });
  });
  it("weights stock purchase cost and closes a fully removed position", () => {
    expect(adjustPosition({ adet: 10, maliyet: 100 }, 30, 200, "ekle")).toEqual({ adet: 40, maliyet: 175 });
    expect(adjustPosition({ adet: 10, maliyet: 100 }, 10, 80, "cikar").adet).toBe(0);
  });
  it("rejects overselling and excessive combined quantities", () => {
    expect(() => adjustPosition({ adet: 10, maliyet: 100 }, 11, 80, "cikar")).toThrow();
    expect(() => adjustPosition({ adet: 1e9, maliyet: 1 }, 1, 1, "ekle")).toThrow();
  });
});


describe("mixed portfolio composition", () => {
  it("does not count a fund as a stock or include it in stock scenarios", () => {
    expect(portfolioComposition([{ tur: "fon" }])).toEqual({ stocks: [], hasFunds: true, label: "1 fon" });
  });
  it("counts asset types separately and preserves legacy stock positions", () => {
    const stock = { ticker: "THYAO" };
    const result = portfolioComposition([stock, { tur: "fon" }, { tur: "fon" }, { tur: "maden" }, { tur: "doviz" }]);
    expect(result.stocks).toEqual([stock]);
    expect(result.label).toBe("1 hisse · 2 fon · 1 maden · 1 döviz");
    expect(result.hasFunds).toBe(true);
  });
});
