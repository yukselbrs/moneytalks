# "VİOP Nedir?" — Teknik Mimari Planı

**Tarih:** 16 Temmuz 2026 · **Durum:** PLAN — onay bekliyor
**Kardeş notlar:** [[viop-nedir-icerik-plani]] · [[viop-nedir-ux-plani]]

## Route
- **`/viop-nedir`** — `app/viop-nedir/page.tsx` (client) + `layout.tsx` (server: generateMetadata "VİOP Nedir? Kaldıraç, Teminat ve Long/Short Basit Anlatım" + Article/LearningResource JSON-LD + canonical). Eğitim içeriği konvansiyonunun İLKİ — ileride `/egitim/*` altına taşınabilir; v1'de kök path SEO için daha güçlü ("viop nedir" araması yüksek hacimli).
- AppShell İÇİNDE değil, KAP SEO sayfaları gibi hafif kabuk: auth'suz, hızlı ilk yük; üstte mini breadcrumb + sonda kayıt/keşfet CTA. Sitemap'e eklenir (priority 0.8). Navigasyon girişleri: /kap deseni gibi ayrı; ayrıca Keşfet menüsüne link (implementasyon turunda karar).

## Bağımlılık kararı
**Sıfır yeni paket.** IntersectionObserver + CSS keyframes/transitions + rAF sayaç — mevcut kod tabanının bire bir deseni (dashboard sayacı, risk-draw halkası). framer-motion eklemek reddedildi: tek sayfa için ~35KB+ bundle, mevcut sitede emsalsiz desen, bakım yükü.

## Component ağacı (hepsi `app/viop-nedir/` altında yerel; genele terfi sonra)
```
page.tsx                       — sahne listesi + ilerleme rayı + reduced-motion kapısı
├── Sahne.tsx                  — min-h-100svh sarmalayıcı; useSahneAktif ile data-aktif
├── IlerlemeRayi.tsx           — 11 nokta nav (aria-label, smooth-scroll)
├── SoruKarti.tsx              — RiskProfilWidget deseninden uyarlama (soru/секenekler/geri bildirim)
├── Sayac.tsx                  — rAF ease-out sayı animasyonu (dashboard deseninin genelleştirilmişi)
├── svg/                       — DireksiyonSVG, SuBardagiSVG, AsansorSVG, BugdaySVG, HalkaSVG (saf fonksiyonel SVG'ler, props: durum/oran)
└── Simulasyon.tsx             — Bölüm 11 durum makinesi + alt bileşenleri (SecimKarti, SenaryoKarti, CagriEkrani, KarneKarti)
```
**Reuse:** `card-glass`/`dot-grid`/`animate-fade-up` global sınıfları, `lib/formatters` (₺/%), design token'lar, Toast (gerekirse). `HisseGrafik` KULLANILMAZ (recharts bu sayfaya ağır; sparkline'lar el SVG'si).

## State yönetimi
- **Scroll/sahne:** `useSahneAktif` (yerel hook): IntersectionObserver, `once: true` varsayılan (animasyonlar bir kez oynar — geri scroll'da tekrar patlamaz), ilerleme rayı için ayrıca "en görünür sahne" state'i.
- **Sorular:** her `SoruKarti` kendi `useState`'i; cevaplar `sessionStorage`'a yazılır (sayfa yenilenince akış korunur; kalıcı analitik YOK — KVKK sade).
- **Simülasyon:** tek `useReducer` — içerik planındaki akış şeması birebir reducer aksiyonları: `SEC`, `ZAR_AT`, `TEMINAT_YATIR`, `POZISYON_KAPAT`, `SIFIRLA`. `Math.random` yalnız `ZAR_AT` aksiyonunda (event handler) → SSR/hydration sorunu yok.
- Global store/context GEREKMEZ.

## Performans
- Sayfa statik prerender (client component ama veri fetch'i yok) — TTFB mükemmel; JS yükü tek route chunk'ı.
- SVG'ler inline JSX (~2-4KB/adet, toplam <25KB) — ayrı istek yok, `currentColor` ile tema uyumlu. Lottie/video yok.
- `Simulasyon` `next/dynamic` ile lazy (viewport'a yaklaşınca) — ilk yükte sadece sahne 1-2 kritik.
- Görsel yok denecek kadar az (THYAO logosu `StockLogo` fallback'i yeter) → LCP = başlık metni.
- `content-visibility: auto` alt sahnelerde (uzun sayfa render maliyeti düşer) — implementasyonda ölçülüp karar.

## Aşamalı implementasyon sırası (onay sonrası tur)
1. İskelet: route + layout(SEO) + Sahne/IlerlemeRayi/useSahneAktif + 11 boş sahne + reduced-motion altyapısı — *yarım gün*
2. Bölüm 1-6 içerik + Sayac + ikiz kart + halka/direksiyon SVG'leri — *1 gün*
3. Bölüm 7 su bardağı set-piece + SoruKarti (3 soru yerleşimi) — *yarım gün*
4. Bölüm 8-10 (asansörler, buğday) — *yarım gün*
5. Simulasyon reducer + UI (seçim/zar/çağrı/karne) — *1 gün*
6. Mobil ince ayar + a11y denetimi (reduced-motion, aria, kontrast) + sitemap/nav bağlantıları + docs/karar notu — *yarım gün*
Toplam ~4 iş günü part-time. Her aşama ayrı commit; 5'ten sonra canlı doğrulama (dev server + mobil viewport + reduced-motion emülasyonu).

## Riskler / açık sorular
- `100svh` eski tarayıcılarda `100vh` fallback (CSS `@supports`).
- İçerikteki teminat oranı/rakamlar eğitseldir — hukuki gözden geçirme (SPK eğitim çerçevesi) yayın öncesi önerilir; "örnek rakamlar temsilidir" kutusu her sayısal sahnede var.
- Sayfa sitenin ilk scroll-hikayesi: desen tutarsa `SoruKarti`/`Sayac`/`Sahne` genele (`components/egitim/`) terfi ettirilir — v1'de yerel kalsın (erken soyutlama yapma).
