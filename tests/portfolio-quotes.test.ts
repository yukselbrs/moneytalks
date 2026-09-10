import { afterEach, describe, expect, it, vi } from "vitest";
import { portfolioQuotes } from "@/lib/portfolio-quotes";
import { formatQuantity } from "@/lib/formatters";

afterEach(() => vi.unstubAllGlobals());

describe("portfolio quote consistency", () => {
  it("uses the fund list source with full price precision and its actual date", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [
      { kod: "TLY", fiyat: 9770.186752, gunluk_getiri: 0.684, veri_tarihi: "2026-09-10" },
    ] })));
    vi.stubGlobal("fetch", fetcher);
    expect(await portfolioQuotes([{ ticker: "TLY", tur: "fon" }])).toEqual({
      TLY: { fiyat: 9770.186752, degisim: 0.684, veriTarihi: "2026-09-10" },
    });
    expect(fetcher.mock.calls[0][0]).toBe("/api/fonlar?kodlar=TLY");
  });
  it("does not substitute zero prices or changes for an unavailable source", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.startsWith("/api/fonlar")
      ? new Response("unavailable", { status: 503 })
      : new Response(JSON.stringify({ THYAO: { fiyat: "300,00", degisim: "1,00" } }))));
    expect(await portfolioQuotes([{ ticker: "TLY", tur: "fon" }, { ticker: "THYAO" }])).toEqual({ THYAO: { fiyat: 300, degisim: 1 } });
  });
  it("keeps fractional instrument quantities visible", () => {
    expect(formatQuantity(0.125)).toBe("0,125");
    expect(formatQuantity(1000)).toBe("1.000");
  });
});
