# 03-kararlar — Mimari Kararlar (ADR)

Verilen mimari ve önemli ürün kararları burada kaydedilir (Architecture Decision Records).

## Amaç
"Neden böyle yaptık?" sorusunun cevabı. Bir karar geri döndürülmesi zor veya birden çok bileşeni etkiliyorsa buraya yazılır.

## Format (öneri)
Her karar tek dosya:
- **Bağlam** — hangi problem/kısıt
- **Karar** — ne seçildi
- **Alternatifler** — neler elendi, neden
- **Sonuç** — etkileri, takas edilen şeyler

## Örnek kararlar
- Veri kaynağı: Yahoo → gecikmeli veri + KAP omurga
- Piyasa değeri: KAP pay adedi × fiyat (vendor'sız)
- Rate limit: in-memory → Upstash Redis

## Kayıtlı kararlar

### Analiz / bağlam
- [[handoff-v9-fark-analizi]] — v9 (4 Mayıs) ↔ 4 Temmuz kod farkı (arşiv)
- [[kap-tercumani-supabase-semasi]] — KAP Tercümanı 3 tablosu, RLS ve idempotency
- [[vault-bakim-2026-07]] — Faz 3 vault bakımı kaydı (13 Temmuz)

### Track 1 (6 Temmuz 2026 — tamamlandı, production'da)
Genel bakış: [[parakonusur_handoff_v10]]
- [[track1-gorev1-izleme-arama-teshis]] — izleme arama tek kaynağa bağlandı
- [[track1-gorev2-cron-secret-rotasyonu]] — CRON_SECRET rotasyonu (Vercel/GitHub ayağı Barış'ta)
- [[track1-gorev3-rate-limit-supabase]] — rate limit in-memory → Supabase RPC
- [[track1-gorev4-rls-audit]] — RLS politikaları migration'a alındı
- [[track1-gorev5-ai-panel-dili]] — AI panel risk dili + mikro-copy
- [[track1-gorev6-alarm-ux]] — optimistic refetch + hedefe uzaklık
- [[track1-gorev7-cift-cron]] — çift alarm cron'u çözüldü + idempotency
- [[track1-gorev8-rsi-wilder]] — RSI Wilder smoothing
- [[track1-gorev9-kap-tercumani]] — KAP Tercümanı (omurga özellik)
- [[track1-gorev10-programatik-seo]] — KAP bildirim SEO sayfaları (ISR)
- [[track1-gorev11-neden-karti]] — "neden düştü/çıktı" atıf kartı v1
- [[track1-gorev12-haftalik-karne]] — portföy haftalık karnesi
- [[track1-gorev13-premium-frontend]] — premium frontend geçişi (Pass 1)

## İlgili
- Kararı besleyen araştırma → [[04-arastirma]]
- Stratejik gerekçe → [[01-strateji]]
