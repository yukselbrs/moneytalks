# Faz 4 / Görev 20 — Akşam Raporu v1 (C.1, KAP'sız)

**Tarih:** 15 Temmuz 2026 · **Durum:** Tamamlandı (canlı dry-run doğrulandı)

## Ne yapıldı
`/api/cron/aksam-raporu` + `aksam-raporu-cron.yml` (hafta içi TR 18:35, 19:35 yedek koşu — idempotent): portföy VEYA izleme listesi olan her kullanıcıya günde bir kez kişisel gün sonu özeti — in-app bildirim (🌙) + e-posta.

**İçerik (tamamı teşhis dili):** değer-ağırlıklı portföy günlük hareketi + XU100 kıyası; en çok etkileyen pozisyon (+katkı yüzdesi + sektörü); izleme listesinden en hareketli 2 hisse. `aksam_raporu_gonderim (user_id, gun)` UNIQUE idempotency (karne deseniyle aynı). `?dry=1` yan etkisiz.

## Bilinçli kararlar
- **KAP korelasyon cümlesi YOK** (görev talimatı — A.1 çözülünce ayrı iş olarak eklenir; rapor şablonunda yeri hazır).
- **Claude harmanı v1'de YOK:** metin deterministik şablon — SPK açısından öngörülebilir, maliyet sıfır, Robinhood Digests'in çekirdek değeri (kişisel atıf) zaten sayısal içerikte. "2-3 cümlelik AI harmanı" açık işe yazıldı (env flag'li eklenmesi kolay).
- Web görünümü yok (bildirim+e-posta yeterli ilk sürüm); /karne deseni istenirse kopyalanır.

## Canlı dry-run (15 Temmuz)
9 kullanıcı; örnek: portföy −%1,48 (XU100 −%0,09), en etkili THYAO −%2,25 (%83 ağırlık, Ulaştırma), izleme: EREGL… — hesaplar doğru.

## Canlıya alma
migrations.sql'deki `aksam_raporu_gonderim` bloğu SQL Editor'de koşulmalı; koşulmazsa cron claim insert'te düşer, mükerrer gönderim OLMAZ (güvenli taraf).
