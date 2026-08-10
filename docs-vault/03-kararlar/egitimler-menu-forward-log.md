# Eğitimler Menüsü + Forward Nedir — İmplementasyon Logu

**Durum:** TAMAMLANDI · 9 Ağu 2026
Tek kaynak: yeni oturum önce en alttaki **ŞU AN NEREDEYİM** paragrafını okur.

**Görev:** (1) Blog sekmesini gizle, (2) VİOP Nedir'i Eğitimler → Türev Araçlar altına taşı,
(3) aynı yapıda Forward Nedir eğitimi ekle.

## TODO

### FAZ 1 — Blog'u gizle ✅
- [x] 1.1 Nav'dan kaldır (kod silinmeden, bayrakla)
- [x] 1.2 Route'u 404'e düşür (kod korunur)
- [x] 1.3 sitemap'ten çıkar (posts zaten sitemap'te değildi)
- [x] 1.4 Geri açma talimatı loga

### FAZ 2 — Keşif
- [x] 2.1 VİOP sayfası: route, component ağacı, state, animasyon altyapısı
- [x] 2.2 Referans veren tüm linkler
- [x] 2.3 Bulgular loga

### FAZ 3 — Eğitimler menüsü + Türev Araçlar kategorisi ✅
- [x] 3.1 Nav'a "Eğitimler" öğesi
- [x] 3.2 Genişletilebilir kategori config'i
- [x] 3.3 Türev Araçlar altında iki alt sekme
- [x] 3.4 Route şeması
- [x] 3.5 Eski URL → yeni URL 301 + iç linkler
- [x] 3.6 sitemap
- [x] 3.7 Tema uyumlu sekme UI'ı

### FAZ 4 — VİOP Nedir'i taşı ✅
- [x] 4.1 Birebir taşıma (yeniden yazım DEĞİL)
- [x] 4.2 Taşıma sonrası doğrulama

### FAZ 5 — Forward içerik planı ✅
- [x] 5.1 `forward-nedir-icerik-plani.md` (VİOP planının formatında)

### FAZ 6 — Forward implementasyon ✅
- [x] 6.1 Ortak component/animasyon reuse
- [x] 6.2 Yeni metafor SVG'leri (OTC, karşı taraf riski)
- [x] 6.3 Mobil + prefers-reduced-motion
- [x] 6.4 Disclaimer

### FAZ 7 — Test ve kapanış ✅
- [x] 7.1-7.6

---

## FAZ 2 — KEŞİF BULGULARI (9 Ağu 2026)

### Mevcut VİOP Nedir yapısı — `app/viop-nedir/`

| Dosya | Satır | İçerik |
|---|---|---|
| `page.tsx` | 308 | 11 bölüm (B1-B11), içerik planından birebir metinler |
| `parcalar.tsx` | 200 | **Ortak sahne kiti** — asıl reuse hedefi |
| `svg.tsx` | 150 | Metafor SVG'leri (kapora halkası, teminat kartı, direksiyon, su bardağı, asansör, buğday) |
| `Simulasyon.tsx` | 184 | B11 mini simülasyon, `useReducer` 5 aksiyon, `next/dynamic` ile lazy |
| `layout.tsx` | 32 | SEO metadata + `LearningResource` JSON-LD |

**`parcalar.tsx` ihraçları (Forward'da aynen kullanılacak):**
`azaltilmisHareket()` · `useSahneAktif()` · `Sahne` · `Satir` · `Sayac` · `SoruKarti` · `IlerlemeRayi` · `IkizKart`

### KRİTİK GEÇMİŞ KARARI — bozulmamalı
**IntersectionObserver KULLANILMIYOR.** [[viop-nedir-uygulama]] kaydında: gömülü pane
ortamlarında IO callback'leri hiç gelmiyor (izole testle kanıtlanmış). `useSahneAktif` ve
`IlerlemeRayi` **rect-tabanlı** (passive scroll + `getBoundingClientRect`, sahne için
once-true). Forward sayfası da aynı altyapıyı kullanacak — IO'ya dönülmeyecek.

Diğer kararlar: sıfır yeni bağımlılık (Lottie yok, saf SVG + CSS transition), rAF sayaç,
`prefers-reduced-motion` her animasyonda kontrol ediliyor.

### Referans veren yerler (taşımada güncellenecek)
- `components/AppShell.tsx:25` — nav öğesi (indeks 13, "VİOP Nedir?")
- `app/sitemap.ts:54` — `/viop-nedir` priority 0.8
- `app/viop-nedir/layout.tsx:7` — `alternates.canonical`
- Başka iç link YOK (ana sayfa CTA'sı, blog linki vb. yok)

### Blog referansları (FAZ 1'de kapatılacak)
- `components/AppShell.tsx:20` — uygulama içi nav (indeks 8)
- `components/Navbar.tsx:13` — pazarlama navbar'ı
- `app/sitemap.ts:60` — `/blog`
- Sayfalar: `app/blog/page.tsx` + `app/posts/[slug]/` (Sanity)

---

## FAZ 1 — BLOG GİZLENDİ (9 Ağu 2026)

### 🔓 GERİ AÇMA TALİMATI (tek işlem)
`lib/ozellik-bayraklari.ts` → `BLOG_AKTIF = true`. **Başka hiçbir değişiklik gerekmez.**
Bu bayrağı okuyan dört yer otomatik açılır:

| Dosya | Etki |
|---|---|
| `components/AppShell.tsx` | Sidebar KEŞFET grubu + mobil "Daha Fazla" menüsü |
| `components/Navbar.tsx` | Pazarlama navbar'ı |
| `app/sitemap.ts` | `/blog` URL'i |
| `app/blog/page.tsx`, `app/posts/[slug]/page.tsx` | `notFound()` guard'ı kalkar |

### Uygulama notu — indeks kayması tuzağından kaçınıldı
Blog `NAV_ITEMS` dizisinden **silinmedi**. `NAV_GROUPS` indeks tabanlı çalışıyor; diziden öğe
çıkarmak sonraki tüm indeksleri kaydırıp AppShell'i kırıyor (bu oturumda bir kez yaşandı).
Bunun yerine `GIZLI_INDEKSLER` seti grup indekslerinden eliyor, `NAV_ITEMS` bozulmadan duruyor.

Kod hiçbir yerde silinmedi: sayfa bileşenleri, Sanity sorguları, `app/posts/[slug]` hepsi yerinde.
Build yeşil; `/blog` ve `/posts/[slug]` route olarak derleniyor ama çalışma anında 404 veriyor.

---

## FAZ 3 + 4 — MENÜ KURULDU, VİOP TAŞINDI (9 Ağu 2026)

### Route şeması
```
/egitimler                                   kategori listesi (AppShell'li)
/egitimler/turev-araclar                     kategori sayfası, eğitim kartları
/egitimler/turev-araclar/viop-nedir          taşındı (git mv, geçmiş korundu)
/egitimler/turev-araclar/forward-nedir       FAZ 6'da
/viop-nedir  →  308 kalıcı yönlendirme (next.config.ts)
```

### Genişletilebilirlik — `lib/egitimler.ts` TEK kaynak
Kategori/eğitim listesi config'ten geliyor. Yeni kategori eklemek için **yalnız bu dizi**
değişir; nav, kategori sayfası, sekme şeridi ve sitemap otomatik beslenir. `hazir: false`
işaretli eğitim kartta "Yakında" rozetiyle çıkar, route'u olmaz.

### Nav — indeks kayması yine önlendi
Yeni öğe **eklenmedi**: mevcut "VİOP Nedir?" (indeks 13) → "Eğitimler" (`/egitimler`)
olarak yerinde dönüştürüldü. Böylece `NAV_GROUPS` indeksleri ve `navItems[0/3/6/1]`
doğrudan erişimleri hiç etkilenmedi.

### Ortak kit ayrıştırıldı
`app/viop-nedir/parcalar.tsx` → `components/egitim/parcalar.tsx`. İçerik/davranış **birebir**
aynı, sadece konum değişti — Forward Nedir de aynı kiti kullanacak. Yeni ortak bileşenler:
`components/egitim/UstBar.tsx` (sticky logo + kategori sekmeleri, config'ten) ve
`components/egitim/Kartlar.tsx` (kategori/eğitim kartları).

### VİOP sayfasında tek değişiklik
Sayfanın kendi sticky header'ı `<EgitimUstBar kategoriSlug="turev-araclar" />` ile
değiştirildi — alt sekme gezinmesi (FAZ 3.3 gereği) buradan geliyor.
**İçerik, animasyon, sahne mantığı, SVG'ler, simülasyon: hiçbirine dokunulmadı.**

---

## FAZ 5-7 — FORWARD NEDİR EKLENDİ (9 Ağu 2026)

İçerik planı: [[forward-nedir-icerik-plani]] — VİOP planının formatı birebir takip edildi.

### Reuse oranı yüksek, sıfırdan yazım yok
| Öğe | Kaynak |
|---|---|
| Sahne/Satır/Sayaç/SoruKartı/İlerlemeRayı/İkizKart | `components/egitim/parcalar.tsx` (ortak) |
| `useSahneAktif` (rect-tabanlı) | ortak — IO'ya dönülmedi |
| AsansorSVG (long/short), BugdaySVG (neden var) | `components/egitim/ortak-svg.tsx`'e taşındı, iki eğitim de kullanıyor |
| Simülasyon deseni (useReducer + karne + lazy) | VİOP `Simulasyon.tsx` yapısı |
| Sayfa iskeleti, CSS, disclaimer, üst bar | VİOP ile aynı |

**Yalnız forward'a özgü yeni SVG'ler:** `FiyatKilidiSVG` (B2), `BorsaOtcSVG` (B3),
`KarsiTarafRiskiSVG` (B4 — kopan el sıkışma + VİOP tarafında takas kurumu kalkanı).

### Bölüm haritası: 11 → 7
Forward'da teminat/kaldıraç/teminat tamamlama zinciri yok (teminat zorunlu değil), bu yüzden
7 bölüm. Şablon aynı: tanıdık zemin → metafor → kavram → risk → yön → gerekçe → simülasyon.
VİOP'un B7 "teminat tamamlama" konumuna forward'ın B4 "karşı taraf riski" oturdu.

### Simülasyona forward'a özgü adım
Akış: TARAF SEÇ → VADE GELDİ → *(karşı taraf zarardaysa)* KARŞI TARAF KARARI → KARNE.
3. adım **yalnızca sen kârdayken** çıkar — karşı taraf riski ancak o zaman anlamlıdır.

### Doğrulama (9 Ağu 2026)
- Build yeşil, tsc temiz. Dört route derleniyor.
- Route'lar: `/egitimler` `/egitimler/turev-araclar` + iki eğitim → 200. `/blog`, `/posts/[slug]` → 404.
- `/viop-nedir` → **308** → `/egitimler/turev-araclar/viop-nedir` ✓
- VİOP taşıma sonrası: hero, disclaimer, 11 noktalı ray, sekme şeridi — hepsi yerinde.
- Forward simülasyonu uçtan uca tıklanarak doğrulandı:
  nötr senaryo (100 ₺ → +0 ₺, karşı taraf adımı çıkmadı — doğru) ve
  karşı taraf dalı (130 ₺ → +15.000 ₺ kâğıt üstü → "Kaçar" → **Gerçekleşen +0 ₺** + doğru ders).
  Matematik doğrulandı: (130−100) × 500 = 15.000.
- Mobil (375px): 7 bölüm render, ray gizli, İkizKart tek sütun, yatay taşma YOK.

### Bilinen sınır (yeni değil, VİOP'ta da kayıtlı)
Gömülü pane scroll'u sıfırlıyor (`window.scrollTo` sonrası `scrollY: 3`), bu yüzden
**scroll-tetiklemeli sahne animasyonları pane'de doğrulanamıyor**. Doküman kaydırılabilir
(5962px, iç konteyner yok, `overflow: hidden` yok) — sorun sayfada değil. VİOP kaydında
aynı sınır "Faz 3 A.4 sendromu" olarak geçiyor. **Barış'ın bir kez gerçek Chrome'da her iki
eğitimi de kaydırması önerilir.**

---

## ŞU AN NEREDEYİM

**TAMAMLANDI.** Üç iş de bitti: Blog gizlendi (bayrakla, kod duruyor), VİOP Nedir
Eğitimler → Türev Araçlar altına taşındı (301'li), Forward Nedir aynı yapıda eklendi.

### Açık riskler
1. **Gerçek tarayıcıda scroll turu yapılmadı** (yukarıdaki pane sınırı). Animasyonların
   gerçek cihazda aktığı teyit edilmeli.
2. **Forward içeriği hukuki gözden geçirmeden geçmedi** — VİOP'ta da aynı madde açıktı.
   Disclaimer'lar yerinde ve SPK dili korundu, ama yayın öncesi Barış'ın okuması iyi olur.
3. Blog geri açılınca sitemap'e `/blog` döner; blog yazıları (`/posts/[slug]`) zaten
   sitemap'te değildi — istenirse ayrıca eklenmeli.
