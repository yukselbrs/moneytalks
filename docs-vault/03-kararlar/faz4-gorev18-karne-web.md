# Faz 4 / Görev 18 — /karne Sayfası + Hafta Deltası (B.7/B.10)

**Tarih:** 15 Temmuz 2026 · **Durum:** Tamamlandı

1. Hesap çekirdeği `lib/karne.ts`'e çıkarıldı (karneHesapla, fetchEndeksHaftalik, fetchRiskOzetleri, eğitim içerikleri) — cron ve web aynı kodu kullanıyor.
2. **GET /api/karne** (Bearer): kullanıcının karnesini anında hesaplar; yan etkisiz (gönderim kaydı yok, e-posta yok). Canlı doğrulandı (200, tam karne).
3. **/karne sayfası**: Tailwind + card-glass; toplam değer, haftalık hareket vs XU100, sektör barları, risk profili, haftanın eğitim içeriği, 3 katman disclaimer. Oturumsuz/boş-portföy boş durumları var.
4. **Delta:** `karne_gonderim.ozet JSONB` (migration, idempotent) — cron artık gönderirken özeti saklıyor; e-postaya ve /karne'ye "risk skorun 46 → 52" satırı eklendi. İlk gönderimde delta doğal olarak yok.

Deploy notu: migrations.sql'deki yeni ALTER satırı SQL Editor'de koşulmalı (koşulmazsa cron insert'i ozet kolonu bilinmediği için düşer — koşulması ŞART).
