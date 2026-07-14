# Faz 4 / Görev 3 — Oturum: Tek Depo + Abonelik Deseni (A.4 + D.5 client kısmı)

**Tarih:** 15 Temmuz 2026 · **Branch:** `fable-faz4` · **Durum:** Tamamlandı (kullanıcı etkisi notuna bakın)

## Kararlar
1. **`components/lib/supabase.ts` → `createBrowserClient` (@supabase/ssr).** Oturum artık cookie'de — `/auth/callback`'in SSR ile yazdığı depoyla AYNI. Önceki `createClient` localStorage kullanıyordu; OAuth (cookie) + form login (localStorage) iki ayrı depoydu (D.5 bulgusu). CLAUDE.md kuralı da buydu.
2. **`hooks/useSession.ts` (yeni):** ilk değer `getSession()`, sonrası `onAuthStateChange` aboneliği — tek seferlik okuma yerine canlı state. Hisse sayfası buna geçirildi (izleme durumu, "Son analiz", portföy rozetleri artık session-reaktif); diğer sayfalar Dalga 5'te fırsatçı geçebilir.

## A.4 bulgusunun akıbeti (dürüst not)
Faz 3'teki "hard-load'da sayfa çıkışlı davranıyor" gözleminin büyük kısmı **test tarayıcı sekmesinin bozulmuş durumu** çıktı: aynı sayfa eski sekmede donuk (veri yüklemiyor, handler'lar ölü), taze sekmede kusursuz. Yani üründe kanıtlanmış bir oturum yarışı YOK; yine de iki-depo tutarsızlığı gerçekti ve bu değişiklik onu bitiriyor.

## Kullanıcı etkisi (deploy notu)
localStorage'daki mevcut oturumlar cookie'ye taşınmaz → **tüm kullanıcılar bir kez yeniden giriş yapar.** Planlı ve kabul edilmiş etki; duyuru gerekmez (kullanıcı sayısı küçük).
