# Faz 4 / Görev 14 — Risk Kartında "Neden bu skor?" (B.2)

**Tarih:** 15 Temmuz 2026 · **Durum:** Tamamlandı

Hisse sayfası risk kartına native `<details>` ile açılır satır eklendi: risk×ağırlık katkısına göre ilk 3 bileşen ("1 Haftalık Trend: -4,2% · Volatilite: 62% · RSI: 78") + makroKatki ≥2 ise "Makro ortam +X puan" + getiri-tahmini-değildir cümlesi. Veri zaten `/api/risk.bilesenler`'deydi — saf UI işi, ek istek yok.
