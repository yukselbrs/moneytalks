# Track 1 / Görev 7 — Çift Alarm Cron'u

**Tarih:** 4 Temmuz 2026 · **Branch:** `fable-track1` · **Durum:** Tamamlandı

## Sorun
`/api/cron/alarmlar` iki yerden tetikleniyordu: Vercel cron (`0 9 * * 1-5`, vercel.json) + GitHub Actions (`*/15 * * * *`, alarm-cron.yml). 09:00'da ikisi çakışabiliyor; ayrıca eşzamanlı iki çalıştırma aynı alarmı iki kez bildirebilirdi (ikisi de "aktif" listesini çekip sonra durum güncelliyordu).

## Kararlar
1. **Tek tetikleyici GitHub Actions (15 dk):** `vercel.json` crons boşaltıldı (`"crons": []` — dosya gelecekteki config için duruyor). GitHub Actions seçildi çünkü 15 dk'lık sıklık Vercel Hobby cron kısıtlarına takılmıyor ve `workflow_dispatch` ile manuel tetikleme imkânı var.
2. **Idempotency — atomic claim:** tetiklenen alarm önce `UPDATE ... WHERE id = X AND durum = 'aktif' RETURNING id` ile sahipleniliyor; satır dönmezse (başka çalıştırma kapmış) bildirim/e-posta atlanıyor. Eşzamanlı çalıştırmalar artık çift e-posta üretemez.
3. Bilinen ve kabul edilen kenar durum: claim sonrası e-posta gönderimi başarısız olursa alarm "tetiklendi"de kalır, bildirim kaybolabilir — bu davranış öncesinde de vardı, kapsam dışı bırakıldı (gelecek iyileştirme: outbox deseni).

## Dağıtım notu
Deploy sonrası Vercel'in eski cron tanımını bıraktığı doğrulanmalı (Vercel dashboard → Cron Jobs boş olmalı).

## Devam noktası
Sıradaki: Görev 8 (RSI Wilder).
