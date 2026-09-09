import { beforeEach, describe, expect, it, vi } from "vitest";

const range = vi.hoisted(() => vi.fn());
vi.mock("@/components/lib/supabase", () => ({
  supabase: { from: () => ({ select: () => ({ order: () => ({ range }) }) }) },
}));

beforeEach(() => { vi.resetModules(); range.mockReset(); });
describe("fund catalog", () => {
  it("includes funds beyond Supabase's first 1000 rows", async () => {
    range.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => ({ kod: `A${i}`, unvan: "Fon" })), error: null });
    range.mockResolvedValueOnce({ data: [{ kod: "TLY", unvan: "TLY Fonu" }], error: null });
    const { loadFundCatalog } = await import("@/lib/fund-catalog");
    const funds = await loadFundCatalog();
    expect(funds).toHaveLength(1001);
    expect(funds.at(-1)?.kod).toBe("TLY");
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
  it("retries failures rather than caching an incomplete list", async () => {
    range.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    range.mockResolvedValueOnce({ data: [{ kod: "TLY", unvan: "TLY Fonu" }], error: null });
    const { loadFundCatalog } = await import("@/lib/fund-catalog");
    await expect(loadFundCatalog()).rejects.toThrow("Fon listesi yüklenemedi");
    expect(await loadFundCatalog()).toHaveLength(1);
  });
});
