# "VİOP Nedir?" — Uygulama Kaydı (devam-noktası dosyası)

**Durum: TAMAMLANDI (16 Tem 2026)** — tüm aşamalar ✓; sayfa /viop-nedir canlı koda girdi.

**Plan:** [[viop-nedir-icerik-plani]] · [[viop-nedir-ux-plani]] · [[viop-nedir-teknik-plan]]

## AŞAMA DURUMU (kesintide buradan devam et)
- [x] **Aşama 1 — iskelet:** `/viop-nedir` route + layout (SEO metadata + LearningResource JSON-LD) + `parcalar.tsx` (Sahne/Satir/Sayac/SoruKarti/IlerlemeRayi/IkizKart + useSahneAktif) + reduced-motion + 11 sahne
- [x] **Aşama 2 — Bölüm 1-6 tam:** içerik planından birebir metinler; Sayac (rAF), KaporaHalka/TeminatKart/Direksiyon SVG'leri, ikiz kâr/zarar kartları, 2 soru kartı (B1 devam kapısı + B4 tahmin)
- [x] **B7-B10 metinleri tam** (içerik planından) + B7/B9 soru kartları — set-piece SVG'ler eksik (aşama 3-4'e)
- [x] **Aşama 3:** Su bardağı SVG'si (B7) — rect height animasyonu + titreme + sürdürme çizgisi; reduced-motion içinde
- [x] **Aşama 4:** Asansör çifti (B8 long ↑ / B9 short ↓ — iki yönde de yeşil "pozisyon +%" rozeti) + Buğday dalgalı-vs-sabit çizgi (B10)
- [x] **Aşama 5:** `Simulasyon.tsx` — useReducer 5 aksiyon, plandaki tablo değerleri birebir; çağrı yalnız long+B; lazy (next/dynamic); canlıda uçtan uca tıklanarak doğrulandı (Long→B→çağrı→yatır→karne→sıfırla)
- [x] **Aşama 6:** sitemap (priority 0.8) + AppShell KEŞFET nav ("VİOP Nedir?", index-güvenli sona ekleme — NAV_GROUPS index kayması tuzağına dikkat, [8,7,13,10]) + build yeşil. Kalan: gerçek cihazda mobil tur + hukuki gözden geçirme (yayın öncesi, Barış)

## Önemli teknik karar (plandan sapma — kalıcı)
**IntersectionObserver KULLANILMIYOR.** Gömülü pane ortamında IO callback'lerinin hiç gelmediği izole testle kanıtlandı (threshold:0, element tam viewport'ta, 800ms sessiz). `useSahneAktif` ve `IlerlemeRayi` **rect-tabanlı** (passive scroll + getBoundingClientRect, sahne için once-true): her ortamda deterministik, eski WebView'larda da sağlam. Plan dokümanındaki IO referansları bu kararla geçersiz.

## Doğrulama (16 Tem 2026)
tsc temiz, 21 test yeşil. Canlı (taze sekme): giriş sahnesi + 11 noktalı ray render; B4'e scroll → `data-aktif=true`, satırlar opacity:1 (fade-up oynadı), soru kartı 3 buton, direksiyon SVG yerinde. Bilinen pane sınırı: bayat sekmede handler'lar ölü + screenshot scroll'u yansıtmıyor (Faz 3 A.4 sendromu) — gerçek tarayıcıda sorun beklenmiyor ama Barış'ın bir kez gerçek Chrome'da kaydırması önerilir.
