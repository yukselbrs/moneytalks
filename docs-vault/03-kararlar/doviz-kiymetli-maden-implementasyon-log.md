# Döviz + Kıymetli Maden Modülü — İmplementasyon Logu

**Durum:** DEVAM EDİYOR · Başlangıç: 17 Tem 2026
Bu dosya resume protokolünün tek kaynağıdır: yeni oturum önce en alttaki **ŞU AN NEREDEYİM** paragrafını okur.

## TODO

### FAZ 1 — Keşif
- [x] Hisseler sayfası tablo/tema/tipografi incelemesi
- [x] Kolon seti kararı (6A durumu)
- [x] AI analiz pattern keşfi (tetikleme + model + cache)
- [x] Alarm + portföy entegrasyon pattern keşfi

### FAZ 2 — Veri kaynağı
- [x] Yahoo 9 döviz çifti canlı test + yön kontrolü (GBPEUR dahil)
- [x] ≥3 sağlayıcı karşılaştırması (Yahoo / Stooq / TCMB / Frankfurter / AlphaVantage)
- [x] Birincil + ikincil (fallback) kararı ve gerekçesi (K6)

### FAZ 3 — Şema
- [ ] `enstruman_snapshots` (ortak döviz+maden) migration
- [ ] `enstruman_fiyat_gecmisi` (günlük kapanış, 400 gün saklama)
- [ ] `enstruman_analiz_cache` (AI analiz 15 dk server cache)
- [ ] `alarmlar.tur` + `portfoy.tur`'a 'doviz' genişletmesi
- [ ] Migration SQL hazır → Barış SQL Editor'de çalıştıracak (manuel adım!)

### FAZ 4 — İsimlendirme + sayfa
- [ ] `data/doviz-ciftleri.json` + ortak fiyatlama lib'i
- [ ] `/doviz-maden` hub: kategori filtresi (Tümü/Döviz/Kıymetli Maden) + G/H/1A/3A/6A/1Y kolonları
- [ ] Mobil: yatay scroll + sticky ilk kolon
- [ ] `/doviz-maden/[kod]` detay sayfası
- [ ] `/maden` → `/doviz-maden` redirect (next.config)
- [ ] AppShell nav: label "Döviz ve Kıymetli Maden", href güncelle (index 5, index SABİT kalacak)

### FAZ 5 — İkonlar
- [ ] Bayrak SVG seti (TR/US/EU/GB/JP) + kompozit çift ikonu component
- [ ] Metal külçe SVG ikonları (altın/gümüş/platin/paladyum renk varyantı)
- [ ] Reusable component (tablo + detay + alarm + portföyde aynı ikon)

### FAZ 6 — Cron
- [ ] Cron endpoint: birincil→ikincil fallback + son bilinen değeri koruma
- [ ] GitHub Actions workflow (*/15)
- [ ] "15 dk gecikmeli" delay-pill mevcut component ile

### FAZ 7 — AI Analiz
- [ ] `/api/doviz-maden/analiz` endpoint (claude-sonnet-5, teknik+temel prompt, SPK disclaimer)
- [ ] 15 dk server-side cache (enstruman_analiz_cache)
- [ ] Detay sayfasında "AI Analiz" butonu + loading + sonuç

### FAZ 7.5 — Alarm + Portföy
- [ ] AlarmModal'a enstrüman desteği (tur'lu) + alarm cron'unda enstrüman fiyat çözümü
- [ ] Portföye döviz/maden ekleme + kâr/zarar (adet × güncel − maliyet)

### FAZ 8 — SEO + Test
- [ ] sitemap: /doviz-maden + enstrüman detayları; eski /maden URL'leri kaldır
- [ ] Meta tag'ler yeni isimlendirmeyle
- [ ] 9 çift + madenler uçtan uca doğrulama (fiyat yönü >1, kolonlar, ikon, AI, alarm, portföy)
- [ ] Mobil sticky kolon testi + redirect testi
- [ ] Log kapanışı ("TAMAMLANDI" + açık borçlar)

---

## FAZ 1 Bulguları (17 Tem 2026)

**Hisseler tablosu** (`app/hisseler/page.tsx`): grid-tabanlı satırlar (`gridTemplateColumns` string), başlıklar tıklanınca URL param ile sort (desc→asc→reset), kâr `#10B981` / zarar `#EF4444`, `fontVariantNumeric: tabular-nums`, `card-glass` kap, hover `inset 3px 0 0` accent. Mobilde hisse tablosu KART düzenine dönüyor (kolon gizleme + `hisse-mobile-returns` chip şeridi) — ama **fon tablosu `fon-table-shell { overflow-x: auto }`** ile yatay scroll pattern'ine sahip. Yeni modül fon'un scroll pattern'ini alıp ilk kolonu `position: sticky; left: 0` yapacak (sitede hazır sticky-column yok, CSS ile kurulacak).

**Kolon seti kararı:** Hisseler 1G/1H/1A/3A/1Y gösteriyor (6A YOK — `hisse_snapshots`ta `getiri_6a` kolonu yok). Fonlar 6A gösteriyor. **Karar: yeni modül tam seti (G/H/1A/3A/6A/1Y) gösterir; hisse tarafına DOKUNULMAZ.** Gerekçe: hisse tarafına 6A eklemek şema+cron+API değişikliği ister, bu görevin kapsamı dışında; fon sayfası zaten 6A içerdiği için site içi tutarsızlık yaratmıyor.

**AI analiz pattern** (`app/hisse/[ticker]/page.tsx` + `/api/analiz`): buton tetiklemeli (otomatik değil), Bearer auth + `rateLimitHit` 10/saat, model her yerde `claude-sonnet-4-6`, client-side localStorage cache (timestamp'li). Yeni modülde model **claude-sonnet-5** (prompt talimatı) ve cache **server-side** olacak (kullanıcılar arası paylaşımlı 15 dk — maliyeti asıl düşüren bu; localStorage yalnız tek kullanıcıyı korur).

**Alarm pattern:** `components/AlarmModal.tsx` ticker input + BIST_HISSELER autocomplete; `/api/alarmlar` CRUD; cron (`/api/cron/alarmlar`) fiyatı `/api/fiyatlar?extra=` üzerinden çekiyor (hisse-özel). Döviz/maden alarmı için `alarmlar.tur` kolonu + cron'da tur'a göre fiyat kaynağı ayrımı gerekecek.

**Portföy pattern:** `portfoy.tur` kolonu var, CHECK ('hisse','fon','maden') — maden UI'si hiç bağlanmamış. Kâr/zarar `fiyatlar[ticker]` map'inden; döviz/maden pozisyonları için enstrüman fiyat map'i ayrıca beslenecek. CHECK'e 'doviz' eklenecek.

**Mevcut maden modülü:** `data/madenler.json` (5 enstrüman) + `lib/maden-pricing.ts` (Yahoo futures + USDTRY tarih-hizalı gram türetme) + `maden_snapshots` tablosu + `/api/madenler`, `/api/maden/[kod]`, `/maden` sayfaları + */15 cron. Hisse pattern'ini izliyor; yeni modülün tabanı bu.

**Nav:** `NAV_ITEMS[5]` = "Kıymetli Madenler" → label+href değişecek; **index'ler NAV_GROUPS'ta sabit kodlu, sıra BOZULMAYACAK** (bilinen tuzak — viop-nedir'de yaşandı).

---

## Kararlar

### K1 — Route adı: `/doviz-maden`
"Döviz ve Kıymetli Maden" tam slug'ı (`/doviz-ve-kiymetli-maden`) uzun ve URL'de hantal; `/doviz-maden` kısa, iki kategoriyi de taşıyor. Detay: `/doviz-maden/[kod]` (kod: `usd-try`, `gram-altin`...). Eski `/maden` ve `/maden/[kod]` → next.config `redirects()` `permanent: true` (Next 308 döner; Google 308'i 301 ile eşdeğer kalıcı sayar).

### K2 — Döviz evreni ve yön (prompt sabit kuralı)
9 çift, güçlü önce / sayı >1: USD/TRY, EUR/TRY, EUR/USD, GBP/USD, GBP/TRY, GBP/EUR, USD/JPY, EUR/JPY, GBP/JPY. Kod formatı: `usd-try`. API ters yönde dönerse 1/x normalize edilir (FAZ 2 testinde yön doğrulanacak).

### K3 — Maden evreni
Mevcut 5 + `ons-paladyum` (PA=F) = 6 maden. Prompt "varsa platin/paladyum" diyor; Yahoo PA=F mevcut, ekleme maliyeti sıfıra yakın.

### K4 — Fiyat gösterim hassasiyeti
Kur fiyatları: <10 → 4 ondalık (EUR/USD 1,0842), <100 → 3, ≥100 → 2 (USD/JPY 150,23). Madenler mevcut 2 ondalık kalır.

### K5 — Şema: yeni ortak tablo, maden_snapshots deprecate
`enstruman_snapshots` (kod PK, tur 'doviz'|'maden', ad, birim, para_birimi, fiyat, degisim_yuzde, gunluk_yuksek/dusuk, getiri_1h/1a/3a/6a/1y, kaynak, usdtry_kur, updated_at). Maden cron'u da buraya yazar; `/api/madenler` geçiş köprüsü olarak dual-read yapar (yeni tablo boş/yoksa eskiden okur) — Barış migration'ı çalıştırana kadar regresyon olmaz. `maden_snapshots` DROP edilmez, "ileride drop" borcu FAZ 8'de listelenir. KAP/disclosure alanları YOK (hisseden fark — prompt netleştirmesi).

### K6 — Veri kaynağı: birincil Yahoo, ikincil Frankfurter (döviz) + query2 host yedeği (metal)

**Canlı test sonuçları (17 Tem 2026):**

| Sağlayıcı | Durum | Not |
|---|---|---|
| Yahoo `query1` chart API | ✓ | 9 çift de doğru yönde (>1) döndü: `USDTRY=X` 47.15, `GBPEUR=X` 1.176, `USDJPY=X` 162.4... `PA=F` (paladyum) da mevcut. Intraday ~15 dk gecikme, `range=1y` historical, keyless. Maden modülü 2 haftadır bu API'de sorunsuz. |
| Frankfurter (ECB) | ✓ | Keyless, ücretsiz, resmi ECB referans kuru. Her `base` ile çapraz destekli (`base=GBP&symbols=EUR` ✓), tek gün + tarih aralığı historical ✓. TRY dahil. Frekans: günde 1 (16:00 CET). Metal YOK. |
| TCMB today.xml | ✓ | Resmi ama günde 1, yalnız TRY çiftleri, JPY 100'lük birim tuhaflığı, metal yok. Pipeline'a girmiyor; FAZ 8 çapraz doğrulama referansı. |
| Stooq | ✗ ELENDİ | Anti-bot JS proof-of-work doğrulaması eklemiş — server-side fetch imkânsız. |
| AlphaVantage / metals-api / TwelveData | ✗ ELENDİ | Key ister; AlphaVantage free 25 req/gün (15 enstrüman × 96 koşu/gün ile uyumsuz). Keyless mimari korunuyor. |

**Karar:** Birincil **Yahoo** (15 enstrümanın tamamı, tek fetch pattern'i, mevcut `maden-pricing` altyapısı üstüne). İkincil: **döviz için Frankfurter** (günlük ECB — fallback'te "gecikmeli" etiketiyle kabul edilebilir, prompt 2.4 bunu öngörüyor); **metal için `query2.finance.yahoo.com` host yedeği** (canlı test ✓). Metal için keyless bağımsız ikinci sağlayıcı pratikte yok (Stooq anti-bot, LBMA lisanslı, metals-api ücretli) — üçüncü basamak her enstrümanda aynı: ikisi de düşerse **son bilinen snapshot korunur, UI "gecikmeli" gösterir, hata loglanır** (sessiz yutma yok). Kendi `enstruman_fiyat_gecmisi` tablomuz zamanla sağlayıcı-bağımsız historical yedek biriktirir.

**Çapraz doğrulama:** USDTRY — Yahoo 47.153 / ECB 47.142 / TCMB ✓ tutarlı (<%0.03 sapma).

---

## Kronoloji

**17 Tem 2026** — Görev başladı. FAZ 1 keşif tamamlandı (bulgular yukarıda), K1-K5 kararları verildi. FAZ 2 canlı API testleri yapıldı: 9 çift Yahoo'da doğru yönde ✓, Stooq elendi (anti-bot), Frankfurter döviz ikincili seçildi (K6). Sıra FAZ 3 şemada.

---

## ŞU AN NEREDEYİM

FAZ 1 + FAZ 2 bitti (bulgular ve K1-K6 kararları bu dosyada). Sıradaki iş: FAZ 3 — `supabase/migrations.sql`'e `enstruman_snapshots` + `enstruman_fiyat_gecmisi` + `enstruman_analiz_cache` tabloları, `alarmlar.tur` kolonu ve `portfoy_tur_check`'e 'doviz' eklemesi yazılacak (K5 tasarımı). Migration'ı Barış SQL Editor'de manuel çalıştıracak — kod tarafı dual-read köprüsüyle migration öncesi de kırılmayacak. Henüz kod dosyasına dokunulmadı.
