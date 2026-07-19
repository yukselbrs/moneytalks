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

### Aktif kısıtlar
- ⛔ [[faz4-alarm-cron-donduruldu]] — alarm cron + ilgili her şey ikinci emre kadar ertelendi (15 Tem 2026)

### Uygulama kayıtları
- [[bilanco-kap-haberleri-implementasyon-log]] — Hisse sayfasına bilanço (TradingView) + hisse-KAP haberleri + AI temel analiz (KOD TAMAM 20 Tem; migration Barış'ta)
- [[test-turu-19-temmuz-2026]] — Production doğrulama turu: döviz+maden ✅, KAP haberler ✅, döviz tutarlılık ✅ canlı test; kap_bildirimleri hâlâ 0 satır (açık bulgu)
- [[ai-analiz-haber-tutarlilik-portfoy-mail]] — AI analizine KAP haberi + döviz analiz tutarlılığı + portföy KAP maili (19 Tem; AI kredi + cron secret engelli)
- [[kap-ucretsiz-kaynak-uygulama]] — KAP ücretsiz kaynak: tek kaynak kap.org.tr (VYK/demo kaldırıldı, 19 Tem)
- [[doviz-kiymetli-maden-implementasyon-log]] — Döviz + Kıymetli Maden modülü (KOD TAMAM 18 Tem — migration Barış'ta; resume logu + K1-K8 kararları)
- [[viop-nedir-uygulama]] — VİOP eğitim hikayesi (TAMAMLANDI 16 Tem — 11 sahne + simülasyon)
- [[maden-v1-uygulama]] — Kıymetli madenler v1 (15 Tem 2026; /doviz-maden modülüne evrildi, 18 Tem)

### Analiz / bağlam
- [[hisse-sistemi-mimarisi]] — hisse sisteminin uçtan uca haritası (maden modülü tabanı, 15 Tem)
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
