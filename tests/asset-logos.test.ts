import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import companies from "../data/bist-companies.json";
import sources from "../data/logo-sources.json";
import { getStockLogoUrl } from "../lib/stock-logos";
import { getFonLogoInfo } from "../lib/fon-logos";

describe("reviewed asset logo coverage", () => {
  it("serves a real local file for every listed stock", () => {
    for (const { ticker } of companies) {
      const url = getStockLogoUrl(ticker);
      expect(url, ticker).toMatch(/^\/stock-logos\//);
      expect(existsSync(join(process.cwd(), "public", url!)), ticker).toBe(true);
    }
  });
  it("keeps reviewed files available and fund issuer mappings complete", () => {
    for (const asset of [...Object.values(sources.stocks), ...Object.values(sources.funds)]) {
      expect(existsSync(join(process.cwd(), "public", asset.file)), asset.file).toBe(true);
    }
    for (const [slug, asset] of Object.entries(sources.funds)) {
      const title = slug.replaceAll("-", " ").toUpperCase();
      expect(getFonLogoInfo("TEST", `${title} SERBEST FON`).candidates[0], slug).toBe(asset.file);
    }
  });
});
