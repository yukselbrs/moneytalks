# Faz 4 / Görev 15 — Chatbot: Canlı Durum + Alarm Kurma Köprüsü (B.4)

**Tarih:** 15 Temmuz 2026 · **Durum:** Tamamlandı (canlı SSE testi Dalga 4 sonu doğrulamasında)

1. **Kök değişiklik:** Tool-calling döngüsü SSE stream'inin DIŞINDAYDI — kullanıcı 20+ sn hiçbir şey görmüyordu. Döngü `ReadableStream.start()` içine taşındı; her araç çağrısında `{type:"status", text:"Fiyat verisi çekiliyor…"}` event'i + bitişte "Yanıt hazırlanıyor…" gidiyor. HisseChatbot status'u typing balonunda gösteriyor, ilk delta'da temizliyor.
2. **alarmTaslak köprüsü:** `done` event'indeki taslak artık mesaja iliştiriliyor; "🔔 Bu alarmı kur" butonu Bearer'la `/api/alarmlar`'a POST atıyor, başarıda "✓ Alarm kuruldu" onayı. Chatbot→alarm dönüşümü tek dokunuş.
