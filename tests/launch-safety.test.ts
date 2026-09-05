import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/auth-redirect";
import { portfolioHistory, weightedRisk } from "@/lib/portfolio-math";
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
