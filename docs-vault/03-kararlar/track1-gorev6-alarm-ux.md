# Track 1 / Görev 6 — Alarm UX

**Tarih:** 4 Temmuz 2026 · **Branch:** `fable-track1` · **Durum:** Tamamlandı

## Kararlar
1. **`window.location.reload()` kaldırıldı** ([alarmlar/page.tsx](../../app/alarmlar/page.tsx)). `fetchAlarmlar` useEffect içinden component scope'a (useCallback) çıkarıldı; `onEklendi` artık tam sayfa yenileme yerine listeyi yeniden çekiyor — sekme/scroll durumu korunuyor. *Saf optimistic insert yapılmadı:* `AlarmModal.onEklendi(): void` oluşturulan alarmı geri vermiyor ve modal zaten POST başarısını bekleyip 1,5 sn başarı animasyonu gösteriyor — refetch anında satır sunucuda garanti; modal sözleşmesini değiştirmeye değecek bir kazanım yok.
2. **"Hedefe %X uzakta" göstergesi:** yalnız `fiyat_seviye` alarmlarında (yüzde/gösterge alarmlarında anlamlı bir "uzaklık" tanımı yok). `(hedef − güncel)/güncel` hesabı; yön oku (↑/↓) + ince yakınlık barı (0-20% uzaklık ölçeğinde dolar; %20+ uzaklık = boş). Renk: <%1 yeşil ("Hedef seviyede" ≤%0,05), %1-5 amber, üstü gri. Türkçe ondalık virgül.
3. Alarm tipinin ham hali (`tipRaw`) ve sayısal hedef (`hedefDeger`) Alarm tipine eklendi; `fiyatParse` Türkçe biçimli fiyat string'ini sayıya çeviriyor.

`tsc --noEmit` temiz.

## Devam noktası
Sıradaki: Görev 7 (çift alarm cron'u).
