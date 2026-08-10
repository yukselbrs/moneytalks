# Swap Nedir — İmplementasyon Logu

**Durum:** TAMAMLANDI · 9 Ağu 2026
Tek kaynak: yeni oturum önce en alttaki **ŞU AN NEREDEYİM** paragrafını okur.

**Görev:** Türev Araçlar kategorisine üçüncü interaktif eğitim: "Swap Nedir".
**Referans kararlar:** [[egitimler-menu-forward-log]] · [[forward-nedir-icerik-plani]] · [[viop-nedir-uygulama]]

## TODO

### FAZ 1 — Menü/kategori entegrasyonu ✅
- [x] 1.1 Config'e yeni alt sekme
- [x] 1.2 Route `/egitimler/turev-araclar/swap-nedir`
- [x] 1.3 sitemap

### FAZ 2 — İçerik planı ✅
- [x] 2.1 `swap-nedir-icerik-plani.md` (Forward planının formatında)

### FAZ 3 — İmplementasyon ✅
- [x] 3.1 Component/animasyon reuse
- [x] 3.2 Yeni metafor görselleri (ev takası, faiz swap'ı)
- [x] 3.3 Mobil + prefers-reduced-motion
- [x] 3.4 Disclaimer
- [x] 3.5 Kategori sayfasında üç eğitim doğru sırayla

### FAZ 4 — Çapraz tutarlılık ✅
- [x] 4.1 Terminoloji (karşı taraf riski, teminat, OTC)
- [x] 4.2 Forward → Swap atıf cümlesi

### FAZ 5 — Test ve kapanış ✅
- [x] 5.1-5.5

---

## FAZ 0 — DEVRALINAN KARARLAR (yeniden tartışılmadı)

[[egitimler-menu-forward-log]] ve [[viop-nedir-uygulama]] okundu. Aynen uygulanacaklar:

| Karar | Uygulama |
|---|---|
| **IntersectionObserver YOK** | `useSahneAktif` rect-tabanlı (passive scroll + `getBoundingClientRect`, once-true). Gömülü pane'de IO callback'leri gelmiyor — kanıtlanmış. |
| Sıfır yeni bağımlılık | Saf SVG + CSS transition, rAF sayaç. Lottie yok. |
| Config tek kaynak | `lib/egitimler.ts` — nav, kategori sayfası, sekme şeridi, sitemap oradan beslenir. **Sitemap otomatik**, kod değişikliği gerekmez. |
| Route şeması | `app/egitimler/turev-araclar/<slug>/` → `page.tsx` + `svg.tsx` + `Simulasyon.tsx` + `layout.tsx` |
| Ortak kit | `components/egitim/parcalar.tsx` (Sahne/Satır/Sayaç/SoruKartı/İlerlemeRayı/İkizKart) · `ortak-svg.tsx` (Asansör, Buğday) · `UstBar.tsx` |
| Sayfa iskeleti | AppShell YOK — tam ekran scroll deneyimi, `EgitimUstBar` + `IlerlemeRayi` + hero + bölümler + footer disclaimer |
| Simülasyon | `useReducer` + adım adım akış + karne, `next/dynamic` ile lazy, `Math.random` yalnız event handler'da (SSR güvenli) |

---

## FAZ 1-5 — TAMAMLANDI (9 Ağu 2026)

İçerik planı: [[swap-nedir-icerik-plani]] — Forward planının formatı birebir.

### FAZ 1: tek satırlık entegrasyon (yapının amacı buydu)
`lib/egitimler.ts` config'ine bir öğe eklendi; nav, kategori sayfası, sekme şeridi ve
**sitemap otomatik** beslendi — sitemap'te hiç kod değişmedi. Sıra önemli: swap forward'dan
sonra, çünkü B3 ve B5 forward bilgisinin üzerine kuruluyor.

### FAZ 3: reuse oranı
| Öğe | Kaynak |
|---|---|
| Sahne/Satır/Sayaç/SoruKartı/İlerlemeRayı/İkizKart | `components/egitim/parcalar.tsx` |
| `useSahneAktif` (rect-tabanlı, IO değil) | ortak kit |
| `KarsiTarafRiskiSVG` | forward'dan **ortak kite taşındı**, iki eğitim kullanıyor |
| `DalgaliSabitSVG` | `BugdaySVG`'den **genelleştirildi** — çizim/animasyon aynı, sol ikon prop oldu |
| Simülasyon deseni | Forward `Simulasyon.tsx` yapısı |

**`BugdaySVG` artık ince bir sarmalayıcı** ve buğday ikonunu prop olarak geçiyor; VİOP/Forward
çıktısı birebir değişmedi (doğrulandı). Swap aynı bileşeni faiz ikonuyla kullanıyor.

Yalnız swap'a özgü yeni SVG'ler: `EvTakasiSVG`, `ForwardDizisiSVG`, `FaizSwapSVG`.

### FAZ 4: çapraz tutarlılık — temiz
Üç eğitimde tek biçim kullanım; varyant bulunamadı (`counterparty`, `tezgah üstü` gibi):

| Kavram | VİOP | Forward | Swap |
|---|---|---|---|
| karşı taraf riski | 0 | 12 | 8 |
| tezgâh üstü / OTC | 0 | 7/14 | 7/7 |
| takas kurumu | 0 | 3 | 1 |
| teminat | 63 | 3 | 1 |
| nominal | 0 | 0 | 7 |

VİOP'ta karşı taraf riski/OTC'nin sıfır olması **doğru** — borsada işlem gören, takas kurumlu
bir üründür. "teminat" VİOP'ta 63 kez, çünkü ana konusu.

Forward → Swap atıf cümleleri (B3 ve B5) akıcı okunuyor, ikisi de "Forward Nedir'de öğrendiğin/
gördüğün…" kalıbıyla kuruldu.

### FAZ 5: doğrulama
- Beş eğitim route'u da 200; kategori sayfasında sıra **VİOP → Forward → Swap** ✓
- Swap: 7 bölüm, 7 noktalı ray, B2-B6'da SVG ✓
- **Simülasyon uçtan uca tıklandı, matematik teyitli:**
  sabit öderim · %42,0 → +5.000 · %37,5 → −6.250 · %42,0 → +5.000 · %32,7 → −18.250 ·
  yıl sonu net −14.500 · ortalama %38,6.
  Formül doğrulandı: (değişken − 40)/4 × 1.000.000/100.
- **Diğer iki eğitim bozulmadı:** VİOP 11 bölüm + buğday SVG'si yerinde, Forward 7 bölüm +
  buğday yerinde, üçünde de disclaimer ve 3 sekmeli şerit ✓
- Mobil (375px): 7 bölüm, ray gizli, İkizKart tek sütun, beş SVG de 335px'e sığdı, yatay taşma YOK ✓

---

## ŞU AN NEREDEYİM

**TAMAMLANDI.** Türev Araçlar kategorisi artık üç eğitim içeriyor: VİOP Nedir → Forward Nedir
→ Swap Nedir. Üçü ortak altyapıyı paylaşıyor, aralarında kavramsal köprüler kurulu.

### Açık riskler
1. **Gerçek tarayıcıda scroll turu yapılamadı** — gömülü pane scroll'u sıfırlıyor
   (VİOP/Forward kayıtlarında da aynı sınır). Scroll-tetiklemeli sahne animasyonları
   gerçek Chrome'da bir kez teyit edilmeli.
2. **Hukuki gözden geçirme yapılmadı** — disclaimer'lar yerinde ve SPK dili korundu,
   ama üç eğitim de yayın öncesi Barış'ın okumasından geçmedi (VİOP'tan beri açık madde).
