# Faz 4 / Görev 21 — Fon Karnesi: Şema Hazırlığı (C.4, kısmi)

**Tarih:** 15 Temmuz 2026 · **Durum:** Kısmen tamamlandı (şema hazır; UI + karne satırı ertelendi)

**Yapılan:** `portfoy.tur` kolonu migration'a eklendi (`hisse|fon` CHECK, DEFAULT hisse — mevcut satırlar etkilenmez). Kategori kıyası Görev 19'da tamamlandı.

**Ertelenen (sonraki oturum):** portföy sayfasına fon pozisyonu ekleme UI'ı (1200 satırlık sayfa, dikkatli entegrasyon ister) + haftalık karneye fon satırı (fon_snapshots'ta getiri_1h olmadığından haftalık kıyasa DEĞİL, ayrı "fon pozisyonların" bloğu olarak: değer + günlük getiri). supabase-schema agent hafızasına şema kararı işlendi: fon pozisyonunda `ticker` alanı fon kodunu taşır, `maliyet` pay fiyatıdır — ayrı tablo AÇILMADI (tek portföy görünümü + mevcut RLS'i yeniden kullanmak için).
