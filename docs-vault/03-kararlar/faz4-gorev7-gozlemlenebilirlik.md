# Faz 4 / Görev 7 — Gözlemlenebilirlik: Sentry + Cron Hata Sayaçları (D.2)

**Tarih:** 15 Temmuz 2026 · **Branch:** `fable-faz4` · **Durum:** Tamamlandı (Sentry DSN'i Barış açacak)

## Kararlar
1. **`lib/hata-yakala.ts`** — tek nokta hata raporu: her zaman `console.error`, `SENTRY_DSN` tanımlıysa `Sentry.captureException` (baglam tag'i + extra). Route'lar SDK'ya doğrudan bağımlı değil.
2. **`instrumentation.ts`** — Next instrumentation hook'unda sunucu tarafı `Sentry.init` (DSN yoksa no-op; `tracesSampleRate: 0` — sadece hata, performans izleme yok). `withSentryConfig` build sarmalayıcısı bilinçli KULLANILMADI: kaynak haritası/upload karmaşasına girmeden hata yakalama sağlanıyor.
3. **Beş cron'a `hata` sayacı** (yanıt gövdesinde sayısal alan): alarmlar (RSI fetch + e-posta hataları), hisse-snapshot (upsert hatası; kapsam %10'dan fazla düşerse sistemik say), kap-bildirimleri (lastIndex/disclosures yanıt hataları + `durum='hata'` özet sayısı — **A.1'in sessizliği artık görünür**, fix'i ayrı iş), haftalik-karne (e-posta), fon-snapshot (genel catch).
4. **GitHub Actions:** 5 workflow tek şablona geçirildi — gövde yakalanıyor, non-200 VEYA `"hata":[1-9]` görülürse job kırmızı. Artık "200 döndü ama iş yapmadı" sınıfı Actions sekmesinde görünür.

## Manuel adım (Barış)
Sentry'de proje aç → `SENTRY_DSN` env'ini Vercel'e ekle (yoksa sistem sadece console.error ile çalışmaya devam eder).
