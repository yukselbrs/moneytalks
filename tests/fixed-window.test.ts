import { describe, it, expect } from "vitest";
import { fixedWindowHit, FALLBACK_MAX_KEYS, type PencereKaydi } from "@/lib/fixed-window";

const W = 60; // saniye
const T0 = 1_700_000_040_000; // pencere ici sabit bir an

describe("fixedWindowHit", () => {
  it("ayni pencerede max'a kadar izin verir, sonrasini reddeder", () => {
    const map = new Map<string, PencereKaydi>();
    expect(fixedWindowHit(map, "k", W, 3, T0)).toBe(true);
    expect(fixedWindowHit(map, "k", W, 3, T0 + 1000)).toBe(true);
    expect(fixedWindowHit(map, "k", W, 3, T0 + 2000)).toBe(true);
    expect(fixedWindowHit(map, "k", W, 3, T0 + 3000)).toBe(false);
  });

  it("yeni pencerede sayac sifirlanir", () => {
    const map = new Map<string, PencereKaydi>();
    for (let i = 0; i < 5; i++) fixedWindowHit(map, "k", W, 2, T0 + i * 100);
    const sonrakiPencere = (Math.floor(T0 / (W * 1000)) + 1) * W * 1000;
    expect(fixedWindowHit(map, "k", W, 2, sonrakiPencere)).toBe(true);
    expect(map.get("k")!.count).toBe(1);
  });

  it("anahtarlar birbirinden bagimsiz sayilir", () => {
    const map = new Map<string, PencereKaydi>();
    expect(fixedWindowHit(map, "a", W, 1, T0)).toBe(true);
    expect(fixedWindowHit(map, "a", W, 1, T0 + 10)).toBe(false);
    expect(fixedWindowHit(map, "b", W, 1, T0 + 20)).toBe(true);
  });

  it("kapasite dolunca eski pencere kayitlarini temizler", () => {
    const map = new Map<string, PencereKaydi>();
    const eskiPencere = T0 - W * 1000 * 10;
    for (let i = 0; i < FALLBACK_MAX_KEYS; i++) {
      map.set("eski" + i, { count: 1, windowStart: Math.floor(eskiPencere / (W * 1000)) * W * 1000 });
    }
    expect(map.size).toBe(FALLBACK_MAX_KEYS);
    expect(fixedWindowHit(map, "yeni", W, 5, T0)).toBe(true);
    expect(map.size).toBeLessThan(FALLBACK_MAX_KEYS + 1);
    expect(map.get("yeni")!.count).toBe(1);
  });
});
