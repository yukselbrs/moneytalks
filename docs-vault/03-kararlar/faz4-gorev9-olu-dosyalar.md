# Faz 4 / Görev 9 — Ölü Dosya Temizliği (D.3)

**Tarih:** 15 Temmuz 2026 · **Branch:** `fable-faz4` · **Durum:** Tamamlandı

Silinen: `app/profile/page.tsx.bak`, `components/WaitlistCTA.tsx` (hiçbir import kalmamıştı — landing'den Mayıs'ta çıkarılmıştı). `app/hisseler/page.tsx.bak` zaten upstream'de silinmiş bulundu. `.gitignore`'a `*.bak` eklendi — yedek dosyalar bir daha repoya giremez.
