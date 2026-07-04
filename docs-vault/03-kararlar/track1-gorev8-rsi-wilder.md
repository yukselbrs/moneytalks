# Track 1 / GÖREV 8 — RSI Wilder Yöntemine Geçiş

**Tarih:** 4 Temmuz 2026
**Durum:** Tamamlandı
**Referans:** 2026-07-analiz-raporu.md Görev E.1

## Bağlam
`app/api/risk/route.ts` içindeki `rsiHesapla` yalnızca son 14 günlük yüzde getirinin **basit ortalamasını** kullanıyordu. Standart RSI (Wilder, 1978) üstel düzeltme (smoothing) ister; basit ortalama tek günlük sıçramalara aşırı tepki verir ve TradingView/Matriks gibi platformların gösterdiği değerden belirgin sapar (kullanıcı güven sorunu + RSI alarmlarının yanlış tetiklenmesi).

## Karar
- Wilder yöntemi uygulandı: ilk 14 delta ile seed (basit ortalama), kalan tüm seriyle `avg = (avg*13 + yeni)/14` özyinelemesi. Mutlak fiyat farkları kullanıldı (standart formülasyon; eski kod yüzde getiri kullanıyordu).
- **Veri aralığı 3mo'da bırakıldı** (fetch değişmedi): 63 kapanış ≈ 49 smoothing adımı → seed etkisi (13/14)^49 ≈ %3. Doğrulamada 1 yıllık tam-yakınsamış referansla max sapma 0.70 RSI puanı — aralığı büyütmek diğer faktörlerin (volatilite, likidite, momentum) 3 aylık semantiğini bozacaktı, gerek yok.
- Edge case'ler korundu: veri < 15 → 50 (nötr), avgLoss=0 → 100.

## Doğrulama (4 Temmuz 2026, gerçek Yahoo verisi)

| Ticker | Basit (eski) | Wilder 3mo (yeni) | Wilder 1y (referans) | sapma |
|---|---|---|---|---|
| THYAO | 61.9 | 67.0 | 66.7 | 0.32 |
| PGSUS | 39.6 | 46.5 | 46.1 | 0.40 |
| GUBRF | 32.6 | 40.4 | 40.2 | 0.16 |
| ASELS | 58.0 | 56.5 | 56.2 | 0.34 |
| SASA | 21.1 | 36.3 | 35.6 | 0.70 |
| KRDMD | 38.5 | 45.0 | 44.7 | 0.30 |
| EREGL | 49.9 | 52.6 | 52.4 | 0.21 |
| GARAN | 30.7 | 45.7 | 45.4 | 0.35 |

Eski yöntemin sapması yer yer ~15 puan (SASA, GARAN) — E.1'deki "belirgin sapma" iddiası somutlandı.

## Etki
- `meta.rsi`'yi tüketen her yer otomatik düzelir: risk skoru RSI bileşeni, alarm cron'u RSI eşik kontrolü (`app/api/cron/alarmlar/route.ts:87`), dashboard risk kartları.
- RSI alarmı kurmuş kullanıcılarda tetiklenme davranışı değişebilir (artık standart değerler) — bilinçli ve istenen etki.
- Test script'i: scratchpad `rsi-validate.mjs` (kalıcı değil; gerekirse karar notundaki tablo yeterli).
