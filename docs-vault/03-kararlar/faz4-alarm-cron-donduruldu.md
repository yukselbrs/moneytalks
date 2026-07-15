# Alarm Cron ve İlgili İşler — DONDURULDU

**Tarih:** 15 Temmuz 2026 · **Durum:** Aktif kısıt (ikinci bir emre kadar)

## Karar
Kullanıcı direktifiyle **alarm cron'u ve alarmlarla ilgili her şey ikinci bir emre kadar ertelendi.** Yeni özellik, refactor, iyileştirme veya bakım — hiçbiri yapılmayacak; mevcut kod olduğu gibi kalır.

## Kapsam (dokunulmayacaklar)
- `app/api/cron/alarmlar/route.ts` — alarm tetikleme cron'u
- `.github/workflows/alarm-cron.yml` — 15 dk zamanlayıcı
- `app/api/alarmlar/route.ts` — alarm CRUD
- `app/alarmlar/page.tsx`, `components/AlarmModal.tsx` — alarm UI/UX
- `alarmlar` tablosu şeması, RSI/fiyat/yüzde alarm mantığı, alarm bildirimleri/e-postaları

## Gerekçe
Belirtilmedi ("until further notice"). Karar stratejik/operasyonel — kod kaynaklı değil.

## Ne zaman kalkar
Yalnız kullanıcı açıkça "alarm üzerinde çalışabilirsin / erteleme kalktı" dediğinde. O zamana kadar açık iş listelerinde alarma değen maddeler kapsam dışı işaretlenir.

## Not
Faz 4'te alarm UX (reload→refetch, hedefe-uzaklık) ve çift-cron fix'i zaten tamamlanmıştı ([[track1-gorev6-alarm-ux]], [[track1-gorev7-cift-cron]]); bunların üstüne planlanmış yeni iş yoktu — bu dondurma ileriye dönük tüm alarm işlerini kapsar.
