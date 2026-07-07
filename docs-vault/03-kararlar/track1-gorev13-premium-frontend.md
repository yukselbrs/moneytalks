# Track 1 / GÖREV 13 — Premium Frontend Geçişi (Pass 1)

**Tarih:** 6 Temmuz 2026
**Durum:** Tamamlandı (bilinçli kapsam sınırıyla — "fırsatçı geçiş", toptan değil)
**Referans:** 2026-07-analiz-raporu.md Görev C/F/G; brainstorm-2026-07.md

## Amaç
Kullanıcı siteye girdiğinde amatör değil profesyonel bir finansal ürün hissetsin. Mevcut design system (card-glass, dot-grid, hover-glow, animate-fade-up, StockLogo, AppShell) **taban alındı, kaldırılmadı** — üstüne inşa edildi.

## Yapılanlar
1. **Landing / Hero derinliği** (`components/Hero.tsx`): grain doku overlay (`.grain`) + ikincil radial depth glow (mor, sol-alt). Sticky-scroll kaldırma kararına (v8) sadık kalındı; görsel yoğunluk arttı. Preview'da doğrulandı — hero + güven sinyali satırı ("600+ BIST HİSSE · 15 DK GECİKMELİ VERİ · YATIRIM TAVSİYESİ DEĞİLDİR") premium duruyor.
2. **Güven sinyalleri** (`.delay-pill` globals.css): "15 dk gecikmeli veri" rozeti hisseler ve izleme başlıklarına eklendi. Disclaimer'ı "küçük yazı" değil bilinçli şeffaflık olarak sunma (rapor F.7). KAP sayfalarındaki disclaimer zaten bu çizgide.
3. **Markaya uygun yükleme durumu** (`.skl` shimmer + izleme loading): jenerik "Yükleniyor..." metni → card-glass + dot-grid iskeletli skeleton (5 placeholder satır, tabular hizalı). `prefers-reduced-motion` saygılı.
4. **Boş durum** (izleme): tek satır "liste boş" → ikonlu, KAP e-posta değer önerisini anlatan boş durum.
5. **Veri hiyerarşisi / tabular-nums** (izleme fiyat): sayısal hizalama için `.tabular`.
6. **Mobil + a11y** (`components/DashboardMarketFocus.tsx`): "Neden düştü/çıktı" chip'lerine `aria-label`, dokunma hedefi 24px min-height + padding artışı (10px→11px font, tap target).
7. **Yeni yüzey tutarlılık turu** (Bölüm II çıktıları): `app/kap/page.tsx` ve `app/kap/[index]/page.tsx` (GÖREV 10) denetlendi — zaten Tailwind-native, design-system tutarlı (dot-grid, card-glass, animate-fade-up, StockLogo, gradient CTA, disclaimer, iyi boş durum). Bu sayfalar premium hedefin referansı; değişiklik gerekmedi.

## Bilinçli kapsam dışı (bu pass'te dokunulmadı)
- **Toptan inline-style → Tailwind migration:** 25 component inline style kullanıyor. Görev "fırsatçı geçiş" diyor, toptan değil. Push öncesi 25 dosyanın toptan dönüşümü yüksek regresyon riski taşır ve talimatla çelişir → ayrı bir temizlik turuna bırakıldı. Bu pass yeni eklenen yüzeylerde Tailwind kullandı, mevcut çalışan ekranları riske atmadı.
- **Görev talimatındaki açık kapsam-dışılar korundu:** Pro CTA metin/sayı/dağılımı, polling sıklığı, fiyat flash animasyonları — hiçbiri değiştirilmedi (davranışsal/performans kararları, ayrı ele alınacak).

## Doğrulama
- `npx tsc --noEmit` temiz (0 hata, iki kez — skeleton eklemeden önce ve sonra).
- Dev server hatasız; `/` (landing) ve `/izleme` (200, login redirect) preview'da render edildi; console error yok.
- Landing screenshot: grain + depth glow + trust-signal satırı premium görünüyor.

## Not
Bu "Pass 1" — coherent, shippable bir premium temel. Sonraki turlar: toptan inline→Tailwind temizliği, dashboard/portföy sayı hiyerarşisi derinleştirme, KAP e-posta şablonlarının görsel cilası.
