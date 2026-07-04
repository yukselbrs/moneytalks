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
- [[kap-tercumani-supabase-semasi]] — KAP Tercümanı 3 tablosu (kap_bildirimleri, kap_bildirim_gonderim, kap_cursor), RLS ve idempotency

## İlgili
- Kararı besleyen araştırma → [[04-arastirma]]
- Stratejik gerekçe → [[01-strateji]]
