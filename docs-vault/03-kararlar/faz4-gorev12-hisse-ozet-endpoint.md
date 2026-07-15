# Faz 4 / Görev 12 — Hafif /api/hisse-ozet Endpoint'i (A.7/B.3)

**Tarih:** 15 Temmuz 2026 · **Durum:** Tamamlandı

Hisse sayfasının 15 sn'lik polling'i `POST /api/analiz {veriOnly}` yerine yeni `GET /api/hisse-ozet?ticker=X`'e taşındı (15 sn TTL in-memory cache'li — aynı hisseye bakan N kullanıcı tek Yahoo fetch'i paylaşır). Ortak veri çekirdeği `lib/hisse-veri.ts`'e çıkarıldı; analiz route'u ve landing AIShowcase da onu kullanıyor. veriOnly yolu analiz route'unda geriye uyumluluk için duruyor (artık çağıranı yok). Doğrulama: canlı 200 + doğru şema.
