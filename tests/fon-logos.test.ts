import { describe, expect, it } from "vitest";
import { fonKurucu, getFonLogoInfo } from "../lib/fon-logos";

describe("fund issuer logo resolution", () => {
  it("normalizes alternate issuer spelling and whitespace", () => {
    expect(fonKurucu("  Garanti  Portföy Para Piyasası Fonu")).toBe("GARANTİ PORTFÖY");
    expect(getFonLogoInfo("XYZ", "AZİMUT PYŞ BİRİNCİ SERBEST FON").slug).toBe("azimut-portfoy");
    expect(getFonLogoInfo("XYZ", "V PORTFÖY SERBEST FON").slug).toBe("v-portfoy");
  });
  it("keeps an identifiable fallback for unknown issuers", () => {
    const info = getFonLogoInfo("XYZ", "YENİ KURUCU PORTFÖY SERBEST FON");
    expect(info.initials).toBe("YK");
    expect(info.candidates).toEqual([]);
  });
});
