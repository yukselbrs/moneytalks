# Faz 4 / Görev 5 — Makro Riskin Skora Harmanlanması (A.9 + B.1/13'ün skor ayağı)

**Tarih:** 15 Temmuz 2026 · **Branch:** `fable-faz4` · **Durum:** Tamamlandı

## Sorun
Makro skor ≥85 iken tüm hisselere risk tabanı (52; endeks 58) basılıyordu (`Math.max`): beta 0.4 ile 1.8 aynı skora yaslanıyor, ayırt edicilik ölüyordu. Dashboard client'ında da ikinci bir cap kopyası vardı (`aiPanelSkoruHesapla` içindeki `Math.min`).

## Kararlar
1. **API ([risk/route.ts](../../app/api/risk/route.ts)):** taban kaldırıldı; makro ağırlığı kademeli: ≥35 → 0.14, ≥65 → 0.19, ≥85 → 0.24 (endeks: 0.28/0.30/0.34). `makroKatki` (bileşik − teknik risk puanı) payload'a eklendi.
2. **Client ([dashboard/page.tsx](../../app/dashboard/page.tsx)):** cap kopyası silindi; bileşik skor artık doğrudan API'den (`100 − risk.skor`). Tek doğruluk kaynağı API.
3. **UI ([DashboardAiPanel.tsx](../../components/DashboardAiPanel.tsx)):** Teknik/Makro chip'lerinin yanına "Makro ortam bileşik skoru −X puan etkiledi" satırı (X ≥ 2 iken).

## Doğrulama (canlı, makro=88 gününde)
THYAO: eski taban 52 → yeni bileşik **40** (teknik 28 + makroKatki 12). Teknik 60'lı bir hisse ~65'e düşer — ayrışma korunuyor, makro baskı hâlâ görünür.
