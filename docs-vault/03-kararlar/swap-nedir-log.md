# Swap Nedir — İmplementasyon Logu

**Durum:** DEVAM EDİYOR · Başlangıç: 9 Ağu 2026
Tek kaynak: yeni oturum önce en alttaki **ŞU AN NEREDEYİM** paragrafını okur.

**Görev:** Türev Araçlar kategorisine üçüncü interaktif eğitim: "Swap Nedir".
**Referans kararlar:** [[egitimler-menu-forward-log]] · [[forward-nedir-icerik-plani]] · [[viop-nedir-uygulama]]

## TODO

### FAZ 1 — Menü/kategori entegrasyonu
- [ ] 1.1 Config'e yeni alt sekme
- [ ] 1.2 Route `/egitimler/turev-araclar/swap-nedir`
- [ ] 1.3 sitemap

### FAZ 2 — İçerik planı
- [ ] 2.1 `swap-nedir-icerik-plani.md` (Forward planının formatında)

### FAZ 3 — İmplementasyon
- [ ] 3.1 Component/animasyon reuse
- [ ] 3.2 Yeni metafor görselleri (ev takası, faiz swap'ı)
- [ ] 3.3 Mobil + prefers-reduced-motion
- [ ] 3.4 Disclaimer
- [ ] 3.5 Kategori sayfasında üç eğitim doğru sırayla

### FAZ 4 — Çapraz tutarlılık
- [ ] 4.1 Terminoloji (karşı taraf riski, teminat, OTC)
- [ ] 4.2 Forward → Swap atıf cümlesi

### FAZ 5 — Test ve kapanış
- [ ] 5.1-5.5

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

## ŞU AN NEREDEYİM

FAZ 0 bitti. Sıradaki: FAZ 1 (config entegrasyonu).
