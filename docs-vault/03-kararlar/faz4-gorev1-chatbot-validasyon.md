# Faz 4 / Görev 1 — Chatbot Gövde Validasyonu (A.2)

**Tarih:** 15 Temmuz 2026 · **Branch:** `fable-faz4` · **Durum:** Tamamlandı

## Karar
`/api/chatbot` artık geçersiz gövdeyi Anthropic'e taşımıyor: bozuk JSON → 400 "Geçersiz istek gövdesi."; `messages` boş/dizi-değil ya da son kullanıcı mesajı boş → 400 "Mesaj boş...". Kontrol auth + rate-limit sonrasında, Claude çağrısından önce ([chatbot/route.ts](../../app/api/chatbot/route.ts) POST girişi).

## Doğrulama
Gerçek Bearer ile 3 yol test edildi: `{}` → 400, `{messages:[]}` → 400, `bozuk` → 400 (önceden üçü de Anthropic 400'ü → 500 idi). Kota düşmüyor (artış zaten başarı yolundaydı).
