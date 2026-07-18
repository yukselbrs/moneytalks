# Döviz + Kıymetli Maden Modülü — İmplementasyon Logu

**Durum:** KOD TAMAMLANDI (18 Tem 2026) — migration + prod doğrulaması bekliyor (bkz. AÇIK KALANLAR) · Başlangıç: 17 Tem 2026
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
- [x] `enstruman_snapshots` (ortak döviz+maden) migration
- [x] `enstruman_fiyat_gecmisi` (günlük kapanış, 400 gün saklama)
- [x] `enstruman_analiz_cache` (AI analiz 15 dk server cache)
- [x] `alarmlar.tur` + `portfoy.tur`'a 'doviz' genişletmesi
- [ ] Migration SQL hazır → **Barış SQL Editor'de çalıştıracak (manuel adım — deploy'dan bağımsız, ne kadar erken o kadar iyi)**

### FAZ 4 — İsimlendirme + sayfa
- [x] `data/doviz-ciftleri.json` (9 çift, K2 yönleri) + `data/madenler.json`'a ons-paladyum
- [x] `lib/enstruman-pricing.ts` — ortak fiyatlama (15 enstrüman, 6A getiri, query2 host yedeği, Frankfurter döviz fallback'i)
- [x] `/api/cron/enstruman-snapshot` — çift-yazım köprüsü + fiyat geçmişi arşivi + 400 gün temizlik
- [x] `/api/doviz-maden` + `/api/doviz-maden/[kod]` (dual-read köprülü)
- [x] Workflow: maden-snapshot-cron.yml → enstruman-snapshot-cron.yml
- [x] `/doviz-maden` hub: kategori filtresi (Tümü/Döviz/Kıymetli Maden) + G/H/1A/3A/6A/1Y kolonları
- [x] Mobil: yatay scroll + sticky ilk kolon (canlıda doğrulandı: 864px içerik / 375px ekran, ad kolonu sabit)
- [x] `/doviz-maden/[kod]` detay sayfası (6A kartı + döviz/maden etiket ayrımı + gecikmeli rozeti)
- [x] `/maden` → `/doviz-maden` redirect (curl testi: 308, kök + alt yol tek kuralla)
- [x] AppShell nav: label "Döviz ve Kıymetli Maden", href `/doviz-maden`, banknot ikonu (index 5 SABİT kaldı)
- [x] Eski dosyalar silindi: app/maden/*, /api/madenler, /api/maden, /api/cron/maden-snapshot, lib/maden-pricing.ts

### FAZ 5 — İkonlar
- [x] Bayrak SVG seti (TR/US/EU/GB/JP) + kompozit çift ikonu — `components/EnstrumanIkon.tsx`, kendi çizimimiz (K7: lisans/CDN riski sıfır)
- [x] Metal külçe SVG ikonları (altın/gümüş/platin/paladyum renk varyantı)
- [x] Reusable component (tablo + detayda kullanılıyor; alarm + portföy Checkpoint D'de aynı bileşeni alacak)

### FAZ 6 — Cron
- [x] Cron endpoint: birincil→ikincil fallback (Yahoo query1→query2→Frankfurter) + son bilinen değeri koruma (upsert per-kod; başarısız enstrüman eskisini ezmez) + hata loglama (hataYakala, sessiz yutma yok)
- [x] GitHub Actions workflow (*/15) — maden-snapshot-cron.yml → enstruman-snapshot-cron.yml
- [x] "15 dk gecikmeli" delay-pill hub'da + bayat veri (>60 dk) amber uyarı bandı + detayda "gecikmeli" rozeti

### FAZ 7 — AI Analiz
- [x] `/api/doviz-maden/analiz` endpoint (claude-sonnet-5 ✓ API'de doğrulandı, teknik+temel prompt, "rakam uydurma" guardrail'i, SPK teşhis dili + zorunlu disclaimer)
- [x] 15 dk server-side cache (enstruman_analiz_cache; migration öncesi cache'siz ama ÇALIŞIR) + hisse ile ORTAK 10/saat kota (`analiz:` key)
- [x] Detay sayfasında "AI Analiz" butonu + loading + bölümlü render (oturumsuz akış canlıda doğrulandı: 401 → "giriş yapmanız gerekir")

### FAZ 7.5 — Alarm + Portföy
- [x] AlarmModal birleşik autocomplete (hisse + enstrüman, Döviz/Maden rozetli — canlıda doğrulandı: "USD"→3 çift, "ALTIN"→2 maden+hisseler)
- [x] `/api/alarmlar` POST: tur sunucuda türetilir, gösterge alarmı enstrümanda reddedilir, bildirim/e-posta metinleri enstrüman-farkındalıklı
- [x] Alarm cron: tur'a göre fiyat kaynağı (hisse→/api/fiyatlar, enstrüman→enstruman_snapshots), sayı/string parse ayrımı, ₺ eki ve e-posta linki tur'lu
- [x] Alarmlar sayfası: enstrüman alarmında EnstrumanIkon + görünen ad + /api/doviz-maden fiyat merge
- [x] Portföy: `usePortfolioData` tur'lu fiyat bölme (enstrüman→/api/doviz-maden), risk skoru yalnız hisselerden, ekleme modalı birleşik autocomplete + tur insert, satır ad/link/⚡ tur'lu
- [x] **K8:** Portföye yalnız TL bazlı enstrümanlar eklenebilir (usd-try, eur-try, gbp-try, gram-altin, gram-gumus) — USD/EUR cinsi pozisyonlar ₺ toplamlarını bozacağından modal reddeder
- [x] Karne + akşam raporu cron'ları enstrüman pozisyonlarını filtreler (hisse verisiyle çalışırlar; boş satır riski kapatıldı)

### FAZ 8 — SEO + Test
- [x] sitemap: /doviz-maden + 15 enstrüman detayı; eski /maden URL'leri kaldırıldı
- [x] Meta tag'ler yeni isimlendirmeyle (hub + detay generateMetadata + JSON-LD: döviz ExchangeRateSpecification, maden Product)
- [x] 9 çiftin fiyat yönü >1 canlı doğrulandı (FAZ 2 testi); UI akışları lokalde doğrulandı — **tam 15-enstrüman prod doğrulaması migration sonrası ilk cron'a bağlı (aşağıda AÇIK KALANLAR)**
- [x] Mobil sticky kolon testi (864/345px, ad sabit) + redirect testi (308, kök+alt yol)
- [x] Log kapanışı ("KOD TAMAMLANDI" + açık borçlar aşağıda)

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

**18 Tem 2026 (aynı oturum devamı)** — FAZ 3: migration bloğu `supabase/migrations.sql` sonuna eklendi (enstruman_snapshots + fiyat_gecmisi + analiz_cache + alarmlar.tur + portfoy 'doviz'). Lokal ortamda psql/supabase CLI yok, DATABASE_URL yok → **çalıştırma Barış'ın SQL Editor adımı** (maden v1'deki akışın aynısı). Geçiş güvenliği kararı: yeni cron enstruman_snapshots'a yazarken maden kodları için maden_snapshots'a da ÇİFT-YAZAR; liste API'si dual-read yapar (önce yeni tablo, boşsa eski) — böylece migration gecikse bile maden tarafı bayatlamaz/kırılmaz. Çift-yazım + eski tablo DROP'u FAZ 8 borcuna yazıldı.

**18 Tem 2026 (devam)** — FAZ 4 Checkpoint A (backend) bitti: doviz-ciftleri.json + ons-paladyum, lib/enstruman-pricing.ts, cron endpoint (çift-yazım + arşiv), /api/doviz-maden liste+detay (dual-read), workflow yeniden adlandırıldı. tsc temiz. **Geçiş davranışı:** migration çalışana kadar yeni cron `hata:1` döner (enstruman upsert fail, legacy maden yazımı başarılı) → **Actions kırmızı görünür, bu BEKLENEN — Barış migration'ı çalıştırınca yeşile döner.**

**18 Tem 2026 (devam 2)** — Checkpoint B (frontend): hub + detay + ikonlar + redirect + nav + sitemap; eski maden dosyaları silindi. Canlı doğrulama: 15 satır tablo, kategori filtresi, gram-altin/usd-try detayları, 308 redirect, mobil sticky (864/345px). Checkpoint C (FAZ 7): AI analiz endpoint'i + buton; `claude-sonnet-5` model adı gerçek API çağrısıyla doğrulandı; 401/400 akışları + oturumsuz buton mesajı canlıda test edildi. Checkpoint D (FAZ 7.5): alarm zinciri (API tur türetme → cron tur'lu fiyat → modal birleşik autocomplete → alarmlar sayfası ikon+fiyat) + portföy (hook tur'lu fiyat bölme, K8 TL-bazlı kısıtı, modal autocomplete, satır tur'lu ad/link, risk/senaryo/karne/rapor hisse-only filtreleri). Autocomplete canlıda doğrulandı ("USD"→3 çift rozetli, "ALTIN"→2 maden+hisseler). Final: build temiz (5 yeni route), vitest 21/21. Not: dev server açıkken `rm -rf .next` YAPMA — Turbopack cache'i gidince server FATAL çöküyor (bir kez yaşandı, yeniden başlatıldı).

---

## AÇIK KALANLAR (kod dışı adımlar + bilinçli borçlar)

1. **[BARIŞ — BLOKER] Migration'ı SQL Editor'de çalıştır:** `supabase/migrations.sql` dosyasının "DOVIZ+MADEN v1 (17 Tem 2026)" bloğu (dosya idempotent, tamamını da çalıştırabilirsin). Bu çalışana kadar: döviz fiyatları boş, Actions'ta enstruman-snapshot kırmızı (hata:1 — beklenen), AI analiz cache'siz çalışır, enstrüman alarm/portföy insert'leri `tur` kolonu hatası verir.
2. **Migration sonrası doğrulama (ilk cron'dan sonra, ben ya da Barış):** 15 enstrümanın fiyat/kolonlarının dolduğu, bir döviz alarmı + bir gram-altin portföy pozisyonunun uçtan uca çalıştığı, AI analizin cache'lendiği (ikinci istek `cached:true`) kontrol edilmeli.
3. **Cloudflare Purge Everything** (deploy sonrası, Barış).
4. Borç: `maden_snapshots` çift-yazımı + dual-read köprüleri + eski tablonun DROP'u — migration + 1 hafta sorunsuz koşu sonrası kaldırılacak.
5. Borç: karne/akşam raporu enstrüman pozisyonlarını kapsamıyor (bilinçli filtre); istenirse ayrı iş.
6. Borç: GitHub↔Vercel CRON_SECRET uyuşmazlığı sürüyorsa (16 Tem notu) TÜM cron'lar 401'lidir — Barış'ın secret güncellemesi hâlâ bekliyorsa önce o.

---

## ŞU AN NEREDEYİM

**KOD TAMAMLANDI (18 Tem 2026)** — FAZ 0-8'in kod tarafı bitti, `main`'e push edildi. Görevin kapanması iki manuel adıma bakıyor: (1) Barış'ın SQL Editor migration'ı, (2) migration sonrası prod doğrulaması (yukarıdaki AÇIK KALANLAR 2). Bir sonraki oturum "continue" derse: önce AÇIK KALANLAR'ı kontrol et — migration çalıştıysa prod doğrulamasını yap ve 4. maddedeki köprü temizliğini planla; çalışmadıysa kullanıcıya hatırlat, kod işi YOK.
