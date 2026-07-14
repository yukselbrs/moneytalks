# Faz 4 / Görev 4 — Mobil "Yüzen Pako Butonu" Bulgusunun Kapanışı (A.6)

**Tarih:** 15 Temmuz 2026 · **Branch:** `fable-faz4` · **Durum:** Tamamlandı (bulgu yeniden sınıflandı)

## Tespit
Faz 3 A.6'daki "yüzen N butonu alt nav'la çakışıyor" bulgusu üründeki bir buton değil, **Next.js dev-mode göstergesi** çıktı (yalnız `npm run dev`'de görünür; app'te sol-altta yüzen buton yok — arama doğruladı). Production kullanıcısı bunu hiç görmüyor.

## Karar
Geliştirme konforu için gösterge sağ-alta alındı: `next.config.ts` → `devIndicators: { position: "bottom-right" }` (masaüstünde chatbot balonuyla değil, mobilde alt nav'la çakışmaması esas alındı; sağ-altta alt nav üstüne biner ama tıklanabilirliği bozmaz — dev-only kabul).
