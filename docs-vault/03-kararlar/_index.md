---
aliases: [03-kararlar]
---
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
_Şu an aktif bir kısıt yok._

### Kalkmış kısıtlar (tarihsel)
- ~~[[faz4-alarm-cron-donduruldu]]~~ — alarm cron dondurması (15 Tem 2026) → 16 Tem 2026'da kullanıcı talebiyle kaldırıldı, bkz. [[alarm-cron-fix-2026-07-16]]

### Uygulama kayıtları
- [[takvim-modulu-implementasyon-log]] — Birleşik Takvim Modülü: ekonomik/bilanço/temettü/halka arz dört sekmeli takvim, KAP FR-tabanlı bilanço takvimi, SPK II-14.1 yasal son tarih bandı (TAMAMLANDI 25 Tem → 5 Ağu 2026, production'da canlı)
- [[egitimler-menu-forward-log]] — Eğitimler menüsü + Forward Nedir (VİOP'un yanına ikinci interaktif eğitim, TAMAMLANDI 9 Ağu 2026)
- [[swap-nedir-log]] — Swap Nedir, Türev Araçlar'ın üçüncü eğitimi (TAMAMLANDI 9 Ağu 2026)
- [[alarm-cron-fix-2026-07-16]] — Alarm cron teşhis + fix, GitHub CRON_SECRET sorunu (ÇÖZÜLDÜ, 24 Tem 2026 doğrulandı)
- [[hisse-denetim-halka-arz-takvimi-log]] — Hisse denetimi (evren 614, 8 yeni kotasyon) + veri güncellik turu + Halka Arz Takvimi modülü (TAMAMLANDI 24 Tem — migration çalıştı, lifecycle prod'da uçtan uca doğrulandı: SARAE otomatik işleme geçişi + overlay)
- [[cok-varlik-portfoy-izleme-entegrasyon]] — Fon+döviz+maden portföye ve izlemeye eklenebilir + nav aktif-vurgu fix + hisseler↔fonlar 500 fix (KOD TAMAM 24 Tem; portföy migration'sız canlı, izleme watchlist.tur migration'ı Barış'ta)
- [[bilanco-kap-haberleri-implementasyon-log]] — Hisse sayfasına bilanço (TradingView) + hisse-KAP haberleri + AI temel analiz (TAMAMLANDI — 24 Tem prod doğrulamalı: 8 çeyrek canlı)
- [[test-turu-19-temmuz-2026]] — Production doğrulama turu: döviz+maden ✅, KAP haberler ✅, döviz tutarlılık ✅ canlı test; kap_bildirimleri hâlâ 0 satır (açık bulgu)
- [[ai-analiz-haber-tutarlilik-portfoy-mail]] — AI analizine KAP haberi + döviz analiz tutarlılığı + portföy KAP maili (19 Tem; AI kredi + cron secret engelli)
- [[kap-ucretsiz-kaynak-uygulama]] — KAP ücretsiz kaynak: tek kaynak kap.org.tr (VYK/demo kaldırıldı, 19 Tem)
- [[doviz-kiymetli-maden-implementasyon-log]] — Döviz + Kıymetli Maden modülü (TAMAMLANDI — 24 Tem prod doğrulamalı: 16/16 canlı; kalan yalnız köprü-DROP borcu; K1-K8 kararları)
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

### Faz 4 (15 Temmuz 2026 — tamamlandı, production'da)
Genel bakış: [[parakonusur_handoff_v12]]
- [[faz4-gorev1-chatbot-validasyon]] — Chatbot gövde validasyonu (A.2)
- [[faz4-gorev2-yildiz-geri-bildirim]] — İzleme yıldızı görünür geri bildirim (A.3)
- [[faz4-gorev3-oturum-tek-depo]] — Oturum: tek depo + abonelik deseni (A.4 + D.5 client kısmı)
- [[faz4-gorev4-dev-gosterge]] — Mobil "yüzen Pako butonu" bulgusunun kapanışı (A.6)
- [[faz4-gorev5-makro-harman]] — Makro riskin skora harmanlanması (A.9 + B.1/13'ün skor ayağı)
- [[faz4-gorev6-sse-artefakt]] — Chatbot boş bold artefaktı (A.10)
- [[faz4-gorev7-gozlemlenebilirlik]] — Gözlemlenebilirlik: Sentry + cron hata sayaçları (D.2)
- [[faz4-gorev8-vitest]] — Vitest + ilk birim testleri (D.1)
- [[faz4-gorev9-olu-dosyalar]] — Ölü dosya temizliği (D.3)
- [[faz4-gorev10-bagimliliklar]] — Bağımlılık güncellemeleri (D.4)
- [[faz4-gorev11-cron-tek-duzlem]] — Cron tek düzlem kararı (D.5)
- [[faz4-gorev12-hisse-ozet-endpoint]] — Hafif /api/hisse-ozet endpoint'i (A.7/B.3)
- [[faz4-gorev14-risk-neden-satiri]] — Risk kartında "neden bu skor?" (B.2)
- [[faz4-gorev15-chatbot-status-alarm]] — Chatbot: canlı durum + alarm kurma köprüsü (B.4)
- [[faz4-gorev16-web-push-ertelendi]] — Web push (B.5): bilinçli erteleme
- [[faz4-gorev17-chip-buyukluk-sektor]] — Chip: büyüklük şartı + sektör yönlü (A.8/B.9)
- [[faz4-gorev18-karne-web]] — /karne sayfası + hafta deltası (B.7/B.10)
- [[faz4-gorev19-fon-kategori-kiyas]] — Fon kategori kıyası (B.12)
- [[faz4-gorev20-aksam-raporu]] — Akşam raporu v1 (C.1, KAP'sız)
- [[faz4-gorev21-fon-karnesi-hazirlik]] — Fon karnesi: şema hazırlığı (C.4, kısmi)
- [[faz4-gorev22-dalga5-ertelendi]] — Dalga 5: bilinçli erteleme (Görev 22-23)

## İlgili
- Kararı besleyen araştırma → [[04-arastirma]]
- Stratejik gerekçe → [[01-strateji]]
