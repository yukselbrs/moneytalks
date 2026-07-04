# Track 1 / Görev 5 — AI Panel Risk Dili

**Tarih:** 4 Temmuz 2026 · **Branch:** `fable-track1` · **Durum:** Tamamlandı

## Önemli bağlam
Rapor E.3.1/G.2'nin hedeflediği düzeltmelerin çoğu, raporun görmediği upstream commit'lerde (Kaan, `6f24997` "yönsüz etiketler" + `d069957` panel redesign) zaten yapılmış:
- "Güçlü/Olumsuz Görünüm" → "Çok Düşük Risk … Çok Yüksek Risk" yönsüz etiketleri ✓
- "Güven" satırı → veri-gün-sayısı bazlı "Güvenilir/Kısmi/Yetersiz" ✓
- Yorum-skor tutarlılık kontrolü (bearish metin + yüksek skor çelişkisini yumuşatma) ✓

## Bu görevde eklenenler (kalan boşluklar)
1. **Mikro-copy:** Skor halkasının içine "risk ölçüsü" alt etiketi; alt disclaimer "Skor bir risk ölçüsüdür, getiri tahmini değildir. Yatırım tavsiyesi değildir." oldu. Gerekçe (rapor E.3.1): 0-100 "AI Skoru" getiri beklentisi gibi okunuyordu.
2. **Etiket:** "Veri:" → "Veri yeterliliği:" (neyin ölçüldüğü açık).
3. **Tutarlılık:** [dashboard/page.tsx](../../app/dashboard/page.tsx) hata/oturumsuz fallback'lerinde `guven: "Düşük"` değeri panelin renk haritasında olmayan bir değerdi → "Yetersiz" yapıldı.

"AI Skoru" adı korundu (skor = 100 − risk; "Risk Skoru"na çevirmek semantiği ters yüz ederdi). Pro CTA'ları bilinçli olarak dokunulmadı (Görev 13 kapsam-dışı listesinde).

## Devam noktası
Sıradaki: Görev 6 (Alarm UX).
