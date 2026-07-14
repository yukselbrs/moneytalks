# Faz 4 / Görev 2 — İzleme Yıldızı Görünür Geri Bildirim (A.3)

**Tarih:** 15 Temmuz 2026 · **Branch:** `fable-faz4` · **Durum:** Tamamlandı

## Karar
`toggleIzleme` artık hatayı yutmuyor ([hisse/[ticker]/page.tsx](../../app/hisse/[ticker]/page.tsx)):
- Oturum yoksa: "İzleme listesi için giriş yapmalısın." toast'ı.
- Insert/delete hatasında: durum geri alınır + "eklenemedi/çıkarılamadı — yıldıza tekrar dokunarak dene" toast'ı (retry = tekrar dokunma; ayrı buton eklemeye değmez).
- Mevcut `components/ui/Toast` primitive'i kullanıldı (dashboard'daki desenle aynı), yeni bileşen yazılmadı.

## Doğrulama
Anon kullanıcıyla yıldız tıklaması → toast ekran görüntüsüyle doğrulandı (temiz sekmede).
