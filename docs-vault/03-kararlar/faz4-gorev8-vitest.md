# Faz 4 / Görev 8 — Vitest + İlk Birim Testleri (D.1)

**Tarih:** 15 Temmuz 2026 · **Branch:** `fable-faz4` · **Durum:** Tamamlandı (21 test yeşil)

## Kararlar
1. **Saf fonksiyon çıkarımı:** risk motorunun hesapları `lib/risk-hesaplari.ts`'e (gunlukGetiriler, ortalama, stdDev, betaHesapla, rsiHesapla-Wilder, emaHesapla, periyodikGetiri); rate-limit fallback çekirdeği `lib/fixed-window.ts`'e (enjekte edilebilir `now` ile). Route davranışı değişmedi — sadece taşıma. `lib/rate-limit.ts` modül-üstü Supabase client kurduğu için test edilemiyordu; saf çekirdek ayrıldı.
2. **Vitest:** `vitest.config.ts` (`@` alias + node env), `npm test` → `vitest run`. `tests/` altında 2 dosya, 21 test.
3. **Fixture felsefesi:** GÖREV 8'in canlı Yahoo değerleri yerine deterministik seriler (2× piyasa → beta≈2; monoton artış → RSI=100; testere → 45-55 bandı; Wilder sıçrama sönümü <95). Canlı değerler veri değiştikçe kırılırdı.
4. Kapsam dışı bırakılan: `kap-ozet.ts siniflandir()` testleri (görev talimatı gereği bu turda atlandı — KAP dondurması).

## Sonraki adım önerisi
CI'da `npm test` (GitHub Actions push workflow'u) — Dalga 5 sonrası düşünülebilir; şimdilik lokal + deploy öncesi manuel.
