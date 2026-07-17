# "VİOP Nedir?" — UX / Görsel Tasarım Planı

**Tarih:** 16 Temmuz 2026 · **Durum:** PLAN — onay bekliyor
**Kardeş notlar:** [[viop-nedir-icerik-plani]] · [[viop-nedir-teknik-plan]]

## FAZ 1 keşif özeti (tasarım dili envanteri)
- **Renkler** (`app/globals.css` CSS değişkenleri + `lib/design-tokens.ts`): zemin `#0B1220`/`#0F172A`, kart `card-glass` (rgba beyaz 0.02 + mavi border), birincil mavi `#3B82F6`, **kâr `--success #10B981` / zarar `--error #EF4444`** (BIST konvansiyonu sitede yerleşik), uyarı `--warning #F59E0B` (teminat çağrısı için doğal renk), Pako moru `#818CF8` (AI vurgusu — bu sayfada kullanılmayacak, karışıklık olmasın).
- **Tipografi:** Manrope (başlık, `--font-manrope`) + Geist; yerleşik hiyerarşi: uppercase-tracking mini etiket (11px/700/0.14em) → bold başlık (24-28px) → gövde (13-15px, slate).
- **Animasyon altyapısı:** framer-motion/GSAP/Lottie **YOK** — tümü CSS keyframes (`animate-fade-up`, spin, shimmer, ai-pulse, risk-draw) + `requestAnimationFrame` sayaçlar (dashboard skor sayacı deseni). Bu sayfa da aynı felsefeyle: **sıfır yeni bağımlılık.**
- **Eğitici sayfa emsali:** scroll-hikaye yok; en yakınlar landing `HowItWorks` (section akışı) ve `/kap` anlatım tonu. Bu sayfa sitenin ilk scroll-driven deneyimi olacak — desen sonrası başka eğitimlere (ör. "Bedelsiz nedir?") şablon olur.
- **Soru/quiz emsali:** `RiskProfilWidget` — `soru/secenekler[]` + adım state + seçenek butonları. Simülasyon ve ara sorular bu görsel dili genişletir.
- **Breakpoint stratejisi:** responsive (inline `@media 640/900px` + Tailwind `sm:`), <768'de bottom-nav. Mobil ağırlıklı persona.
- **Ton:** sen-dili, kısa cümle, ölçülü emoji, her sayfada disclaimer.

## Sayfa yapısı kararı: **section-scroll "sahne" akışı** (tam-ekran scrolljack DEĞİL)
Her bölüm `min-height: 100svh` bir "sahne"; normal scroll akışı korunur, scroll kaçırılmaz (scrolljack yok). Gerekçe: (a) sitede yerleşik desen section akışı (landing), scrolljack yabancı ve mobilde riskli; (b) erişilebilirlik/iOS momentum sorunları yok; (c) IntersectionObserver ile sahne-aktifleşme animasyonları scrolljack hissinin %90'ını verir. Sağ kenarda 11 noktalı ilerleme rayı (aktif sahne dolu nokta; tıklayınca sahneye smooth-scroll).

## Scroll-animasyon stratejisi (kütüphanesiz)
- **Tetikleme:** `IntersectionObserver` (threshold ~0.5) → sahneye `data-aktif` → CSS transition'lar oynar. Tek yardımcı hook: `useSahneAktif`.
- **Sahne içi sıralama:** CSS `transition-delay` kademeleri (E1→E4 metin satırları 80-120ms arayla fade-up — mevcut `animate-fade-up` genişletilir).
- **Sayı sayaçları:** dashboard'daki rAF ease-out deseni (`DashboardAiPanel` skor sayacı) ortak `useSayac` hook'una çıkarılır — 33.000→34.650 gibi tüm geçişlerde.
- **Parallax:** kullanılmayacak (değer katmıyor, mobilde jank riski). Derinlik hissi `dot-grid` zemin + sahne başına hafif renk tonu değişimiyle (arka plan radial glow: nötr mavi → bölüm 6-7'de kırmızı/amber tona kayar → 10'da yeşile döner).

## Metaforların görsel karşılıkları (hepsi el yazımı SVG + CSS — Lottie yok)
| Metafor | Teknik | Gerekçe |
|---|---|---|
| THYAO fiyat kartı (B1,5,6) | Mevcut kart stili + rAF sayaç + mini sparkline SVG (`stroke-dashoffset` çizim — risk-draw deseni) | Sıfır yeni desen |
| Ev/kapora halkası (B2) | SVG halka, `stroke-dasharray` %10 dolum (risk skoru halkasıyla aynı teknik) | Kod hazır |
| Teminat kartı küçülmesi (B3) | CSS `transform: scale` + hayalet kart (`border-dashed`, opacity .3) | Basit |
| Direksiyon/kaldıraç (B4) | SVG direksiyon `rotate(5deg)` ↔ tekerlek `rotate(50deg)` senkron CSS animasyonu + 1x/10x bar | Kavramı tek bakışta verir |
| **Su bardağı (B7)** — set-piece | SVG bardak; su = `<rect>` height transition; sürdürme çizgisi `stroke-dasharray`; kritik seviyede `animation: shake .3s` + amber glow; "su ekle" butonunda seviye dolumu | Sayfanın hero animasyonu; saf SVG+CSS yeterli |
| Asansörler (B8-9) | İki SVG şaft; kabin `translateY` scroll-progress'e değil sahne-aktifliğe bağlı keyframe; kat göstergesi = fiyat sayacı; short şaftında kabin inerken sayaç yeşil (vurgulu ters-sezgi anı) | Kavram çifti simetrik görselle |
| Buğday/takvim (B10) | SVG başak + dalgalı fiyat çizgisi vs düz sabitlenmiş çizgi (iki `<path>` çizimi) | Sade |

## Renk/vurgu stratejisi
- Kâr anları: `--success` sayaç + hafif yeşil glow; zarar: `--error` + halka erime. Asla ikisi aynı anda parlamaz (tek odak).
- **Teminat çağrısı ekranı = amber (`--warning`) rejimi**, kırmızı değil: kırmızı "zarar gerçekleşti", amber "karar anı" — semantik ayrım bilinçli. Buton çifti: [Yatır] mavi birincil, [Yatırma] nötr gri (yönlendirme yok — ikisi de eşit meşru).
- Bölüm 9 short-yeşili: "fiyat düşerken yeşil sayaç" anında tek cümlelik altyazı: "Evet, doğru gördün — pozisyon düşüş yönündeydi."

## Mobil deneyim
- Sahneler `100svh` (adres çubuğu güvenli); animasyonlar aynı, yoğunluk düşürülmüş (glow'lar hafif).
- **Swipe YOK** — doğal dikey scroll tek jest; tüm etkileşim tap (soru şıkları, zar butonu, karar butonları). Dokunma hedefleri ≥44px (mevcut chip standardı 24px'ten büyütülür — buton stilleri zaten uygun).
- İkiz kartlar (B5-6) mobilde alt alta; simülasyon seçim kartları tek kolon.
- Sticky alt bar: aktif sahnede "↓ devam" ipucu (ilk 2 sahnede görünür, sonra kaybolur).

## Mini simülasyon UI
- Seçim kartları: `card-glass` 3'lü; seçilende mavi border + ✓; kartta pozisyon/teminat rakamları önceden yazılı (sürpriz yok).
- "Zarı at" butonu: birincil mavi, basınca kısa shimmer → senaryo kartı flip (CSS `rotateY`).
- Sonuç: büyük rAF sayaç (₺ ve teminat-%'si ikili satır) + ikiz kıyas satırı ("hisse yatırımcısı aynı senaryoda: X").
- Çağrı ekranı: su bardağı yeniden sahneye girer (B7'den tanıdık) — öğrenme kancası.
- Karne: tek kart özet + [Baştan dene] (state reset, sayfa scroll'u simülasyon başına döner) + [Hisseleri keşfet →] (/hisseler).

## Erişilebilirlik
- `prefers-reduced-motion: reduce` → tüm transition/keyframe kapalı, sayaçlar son değeri anında basar, sahneler statik görünür (içerik kaybı sıfır). Global tek CSS bloğu + `useSayac` içinde media-query kontrolü.
- Sorular gerçek `<button>`; ilerleme rayı `nav[aria-label="Bölümler"]`; sayaçlar `aria-live="polite"` tek seferlik duyuru; SVG'lere `role="img"` + `aria-label` (ör. "Teminat seviyesi azalıyor").
- Renk tek başına anlam taşımaz: kâr/zarar her zaman +/− işareti ve metinle birlikte.
