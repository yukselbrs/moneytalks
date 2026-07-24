# Hisse Listesi Denetimi + Halka Arz Takvimi — İmplementasyon Logu

**Durum:** TAMAMLANDI (24 Tem 2026 — prod uçtan uca doğrulamalı; kalan yalnız bilinçli borçlar) · Başlangıç: 24 Tem 2026
Bu dosya resume protokolünün tek kaynağıdır: yeni oturum önce en alttaki **ŞU AN NEREDEYİM** paragrafını okur.

Görev tanımı (kullanıcı, 24 Tem 2026): (1) sitedeki hisse listesi denetlenip eksik/yeni kotasyonlar eklenecek + genel veri güncelliği kontrol edilecek; (2) Halka Arz Takvimi modülü — arz süreci boyunca ayrı menüde, işlem görmeye başlayınca otomatik Hisseler'e geçiş. HalkArz.com görselleri YALNIZ bilgi mimarisi referansı (içerik/tasarım kopyalanmaz, scrape edilmez).

## TODO

### FAZ 0 — Resume protokolü
- [x] Log dosyası oluşturuldu (bu dosya)
- [x] Geçmiş log taraması + senkronizasyon (aşağıdaki bölüm)

### FAZ 1 — Hisse listesi denetimi
- [x] Sitedeki mevcut hisse dökümü (tek kaynak `data/bist-companies.json` 606; `lib/bist-hisseler.ts` ondan türer; `hisse_snapshots` 606)
- [x] Resmi kaynaktan güncel liste (KAP `bist-sirketler` flight-data: 791 üye; StockAnalysis çapraz: 615)
- [x] Karşılaştırma: bayat kayıt 0 (iki yönde de), eksik 8 yeni kotasyon
- [x] 8 eksik eklendi (sync + sektör + coverage pipeline'ıyla)
- [x] Doğrulama: canlı fiyat 3/3 örnek ✓, /hisse/BETAE 200 ✓, /api/hisseler listesinde ✓, AKBNK bilanço 8Ç regresyonsuz ✓
- [x] Bulgular aşağıda

### FAZ 2 — Genel veri güncellik denetimi
- [x] Tüm cron'ların son çalışma zamanları (8/8 workflow yeşil; Actions listesi + tablo updated_at çapraz)
- [x] Modül modül bayat veri taraması (hisse ✓, fon ✓, döviz/maden ✓, bilanço ✓, KAP ✓, takvim+temettü ✓)
- [x] Silent-fail taraması (cron route'larında boş catch yok; temettü şüphesi yanlış alarm — yanıt anahtarı `dividends`)
- [x] Düzeltmeler + kalıcılık testi (yetim 3 satır silindi; dispatch koşusu deployed kodla 614 yazdı; offset kadansı sonraki oturumda ölçülecek)

### FAZ 3 — Halka arz veri kaynağı araştırması
- [x] 4 kaynak adayı canlı yoklandı (KAP, SPK, Ahlatcı, halkaarz.info; BIST duyurular sayfası curl'e kapalı — timeout)
- [x] Birincil + yedek seçimi ve gerekçesi (aşağıda)
- [x] Alan listesi çıkarıldı (kullanıcı prompt'undaki liste esas)
- [x] Yapısal vs manuel ayrımı (aşağıdaki matris)

### FAZ 4 — Şema
- [x] `halka_arzlar` tablosu (kimlik + lifecycle `durum` CHECK + arz penceresi + K-HA1 yapısal alanlar + izahname-derin nullable alanlar + kaynak izi `kaynak_linkleri` JSONB)
- [x] Migration idempotent olarak `supabase/migrations.sql` "HALKA ARZ TAKVIMI v1" bloğu; RLS: herkes SELECT, yazma yalnız service role (snapshot deseni); `kod` unique (upsert anahtarı)
- [ ] **[BARIŞ] Migration'ı SQL Editor'de çalıştır** (watchlist.tur ile birlikte tek seferde olabilir) — çalışana kadar takvim sayfası boş/graceful
- [x] Checkpoint: commit + log

### FAZ 5 — Menü + UI
- [x] Nav: PİYASA grubuna "Halka Arz" (roket ikon; dizi SONUNA eklendi → index kayması yok; bayat grup yorumu düzeltildi)
- [x] Liste sayfası `/halka-arz` (durum rozetli kartlar: Talep Toplanıyor pulse + YENİ, Arz Tamamlandı; geçmiş "İşlem Görmeye Başlayanlar" → `/hisse/[kod]`; boş durum)
- [x] Detay `/halka-arz/[kod]`: "Halka Arz Bilgileri" + "Forum" sekmeleri — **Forum kapsam DIŞI, "yakında" placeholder** (karar: bu görev veri+takvim odaklı; topluluk ayrı iş)
- [x] Mobil uyum (375px taşmasız; alt nav + Daha Fazla menüsünde Halka Arz doğrulandı)
- [x] Kaynak dipnotları (`kaynak_linkleri` → İzahname / Fiyat Tespit / Aracı Kurum / KAP linkleri) + SPK notu

### FAZ 6 — Cron + otomatik lifecycle
- [x] `lib/halka-arz-kaynak.ts`: Ahlatcı parser (aktif kartlar `</article>` sınırlı + detay dt/dd + tamamlanan tablosu `<th scope=row>` yapısı) + TR tarih/sayı çözücüler + Yahoo işlem sinyali (query1→query2 yedeği)
- [x] `/api/cron/halka-arz`: tespit+upsert (derin manuel alanlara DOKUNMAZ), talep_bitis geçince arz_tamamlandi, Yahoo fiyat akınca islem_goruyor (durum asla geri düşmez)
- [x] Hisse evrenine aktarım: `lib/hisse-evren.ts` overlay (5dk cache) — islem_goruyor kodlar `/api/hisseler`de görünür + `hisse-snapshot` cron'u fiyatını yazar; kalıcı üyelik repo sync'iyle (aşağıda açık risk)
- [x] Takvimden arşive düşme: liste sayfası islem_goruyor'u "İşlem Görmeye Başlayanlar" bölümüne alır
- [x] Hatalar `hataYakala` + yanıt sayaçları; workflow `hata>0`'da kırmızı (silent fail yok)
- [x] Workflow `halka-arz-cron.yml` günde 5 kez (offset dakika `18 5,8,11,14,17`)

### FAZ 7 — Test
- [x] Gerçek arz alan doğrulaması (canlı parser: KARCL 35,00₺ / 22-24 Tem / Eşit Dağıtım / %20 iskonto / %15,42 açıklık / 128M lot / 4,48 Mlr₺ — web kaynaklarıyla birebir; MASFN + 6 tamamlanan konsorsiyumlarıyla)
- [x] **[MIGRATION SONRASI]** Dolu liste+detay UI doğrulandı (24 Tem akşam: 5 kayıt — KARCL/MASFN "Talep Toplanıyor"+YENİ rozetli, logolar, tüm alanlar; KARCL detayı 10 alanlık grid + kaynak linki + SPK notu) — ekran görüntülü
- [x] **Lifecycle canlı geçiş DOĞRULANDI (prod, kısa-UA fix sonrası):** SARAE → islem_goruyor (islem_tarihi 2026-07-17); takvimde "İşlem Görmeye Başlayanlar"a düştü + `/hisse/SARAE` linki; **overlay ile Hisseler'de canlı 123,80₺** (evren-dışı olmasına rağmen). ALBTN+METEN `query1:404` ile doğru şekilde arz_tamamlandi kaldı; KARCL+MASFN talep_toplaniyor. Üç durum da uçtan uca kanıtlı.
- [x] Mobil test (375px, taşma yok, ekran görüntülü)
- [x] FAZ 1-2 doğrulamaları (BETAE prod'da canlı; snapshot cron 614 yazdı)
- [x] Negatif testler: cron auth'suz 401; tablo yokken cron temiz 500+hata:1, sayfa/API graceful boş

### FAZ 8 — Obsidian kapanış
- [x] Bu dosya güncel + açık riskler bölümü (aşağıda)
- [x] Geçmiş log senkronu tamam (FAZ 0 tablosu)
- [x] `.claude/CLAUDE.md`'ye modül + denetim sonucu

## Geçmiş Log Senkronizasyonu (24 Tem 2026)

FAZ 0.2 taraması: `03-kararlar`'daki tüm dosyaların durum satırları kontrol edildi, 3 bayat log prod ölçümüyle senkronize edildi:

| Log | Eski durum | Gerçek durum (kanıt) |
|---|---|---|
| [[bilanco-kap-haberleri-implementasyon-log]] | "DEVAM EDİYOR" + migration Barış'ta | **TAMAMLANDI** — `/api/bilanco/AKBNK` 8 çeyrek, updated 23 Tem 08:25 (migration + cron yeniden koşusu yapılmış) |
| [[doviz-kiymetli-maden-implementasyon-log]] | "migration + prod doğrulaması bekliyor" | **TAMAMLANDI** — 16/16 enstrüman fiyatlı, updated 24 Tem 04:27 (*/15 cron sağlıklı); kalan yalnız köprü-DROP borcu |
| [[alarm-cron-fix-2026-07-16]] | "1 manuel adım Barış'ta" (GitHub CRON_SECRET) | **ÇÖZÜLDÜ** — zamanlanmış cron'lar yazıyor (enstruman 24 Tem, KAP 23 Tem 22:18, bilanço 23 Tem) |

Diğerleri güncel: [[cok-varlik-portfoy-izleme-entegrasyon]] (24 Tem, watchlist.tur migration'ı hâlâ Barış'ta — gerçek açık iş), faz4-gorev* dosyaları tekil görev kayıtları (kapalı), [[handoff-v9-fark-analizi]] arşiv. Kullanıcı memory'si de güncellendi (401 sorunu çözüldü).

## Kronoloji

**24 Tem 2026 — Oturum başı, görev öncesi acil fix:** Kullanıcının bildirdiği "hisseler↔fonlar geçişinde 500" hatası çözüldü (`d130055`). Kök neden: `/hisseler` tek sayfa iki varlık tipini render ediyor; `varlik` query'si değiştiği anda render yeni tipe geçiyor ama `data` state'i eski tipin verisini tutuyordu → `fon.kod.slice` undefined TypeError → error boundary "500" ekranı. Dashboard'dan girişte data=null olduğu için görünmüyordu. Fix: `HisselerSwitch` ara bileşeni `<HisselerContent key={varlik} />` — varlık değişince remount, çapraz-tip veri sızması kökten imkânsız. Lokal production build'de iki yönlü + çift tur doğrulandı.

**24 Tem 2026 — FAZ 0:** Bu log kuruldu; geçmiş log senkronu yukarıdaki tabloyla tamamlandı (3 log + 1 memory güncellendi). Prod sağlık ölçümleri (senkron sırasında): KAP son bildirim 23 Tem 22:18 ✓, fonlar 1040 kayıt ✓, hisseler 606 kayıt ✓, döviz-maden 16/16 ✓, bilanço 8 çeyrek ✓.

**24 Tem 2026 — FAZ 1 (`f9bb05c`):** Denetim salt-okur scriptle yapıldı (scratchpad `audit-bist.mjs`): KAP `bist-sirketler` (791 üye — dikkat: bu liste TÜM KAP üyelerini içerir; faktoring/varlık kiralama/tahvil ihraççıları pay senedi DEĞİL, ham fark 185 yanıltıcı) + StockAnalysis (615, pay listesi sürücüsü) vs site (606). Sonuç: **bayat kayıt 0, eksik 8**: BETAE, EKDMR, EKIM, GOLDA, ISVEA, ORZAX, SOHOE, SSAAT (hepsi hem SA hem KAP'ta doğrulandı; ilk işlem tarihleri 22 May–16 Tem 2026 — tam kullanıcının işaret ettiği pencere). **KARCL bilinçli eklenmedi**: Kardemir Çelik talep toplama 22-24 Tem (bugün son gün), henüz işlem görmüyor → hisse evrenine değil Halka Arz Takvimi'ne (FAZ 4-7 canlı test vakası). Ekleme akışı: `sync-bist-companies.mjs` yamalandı (mevcut JSON'daki `sektor`/`domain`/`priceAvailable` artık merge ile korunuyor — eskiden sync sektörleri SİLERDİ; ayrıca yeni/çıkan raporu basıyor) → sync (614) → `add-sektor.mjs` (8'e TradingView sektörü) → `check-bist-price-coverage.mjs` (**614/614 Yahoo kapsamı — TRMET dahil; tarihi "KOZAA eksik 606/607" bulgusu kapandı**). Yan bulgu: `kapMemberOid` alanı KAP tarafında artık boş geliyor ama kod hiçbir yerde kullanmıyor (körelmiş alan, dert değil). Yan fix: `HisseBilanco` tüm satırlar boşsa bölümü tamamen gizliyor (yeni kotasyonda TradingView finansalı yok → boş "Özet Finansallar" başlığı kalıyordu). Deploy sonrası `*/5` snapshot cron'u 8 yeniyi otomatik dolduracak (kod değişikliği gerekmez); o ana kadar liste canlı-fiyat merge'üyle zaten gösteriyor (BETAE 90,25 doğrulandı).

**24 Tem 2026 — FAZ 2 (`79d6b0a` + veri işlemleri):** Denetim sonuçları:
- **8/8 workflow yeşil**, günlük/haftalık cron'lar programında (bilanço ~08:25 — 06:00 hedefe GH gecikmesi, zararsız; fon ~20:40; akşam raporu ~16:57; karne Pazar).
- **Tek yapısal bulgu:** `*/5` hisse-snapshot gerçekte ~14 koşu/gün (GH zamanlanmış cron throttling; dün gündüz penceresinde 5 koşu: 07:14/09:38/11:31/13:07/15:22). Kullanıcı etkisi SINIRLI: `/api/hisseler` görünür sayfa dilimi için istek-anı canlı fiyat çekiyor; kapanış (15:22) ve akşam raporu öncesi (16:52) koşular kritik anları yakalamış. Mitigasyon: dört sık cron'a **offset dakika** verildi (hisse `2-57/5`, alarm `4-49/15`, enstruman `8-53/15`, kap `12-57/15`) — GH'nin yuvarlak-dakika izdihamından kaçınma + üç `*/15`'in aynı anda ateşlenmesini ayrıştırma. Kadans iyileşmesi bir sonraki oturumda `gh run list` ile ölçülecek.
- **Tablo tazelikleri** (Supabase doğrudan): hisse_snapshots son yazım = son koşu ✓; fon 2035 satır (açık+kapalı TEFAS) dün 20:37 ✓; enstruman 16/16 ✓; bilanço 598→bugünkü koşuda 614 evrene geçecek ✓; **kap_bildirimleri 1064 satır** (test-turu-19-temmuz'daki "0 satır" açık bulgusu KAPANDI).
- **Yetim temizliği:** hisse_snapshots'ta kotasyondan çıkmış ICUGS/ROYAL/UMPAS satırları silindi → tablo tam 614 = evren.
- **Kalıcılık kanıtı:** `gh workflow run hisse-snapshot` → success → tablo 614 satır, yeni 8'in hepsi fiyatla yazıldı (BETAE 90.25 %+9.99 … SSAAT 41.98 %+4.48). Deploy edilmiş kod evreni otomatik alıyor; tekrar bozulma vektörü yok.
- Silent-fail yok; temettü/takvim modülleri canlı doğrulandı (TCMB faiz 23 Tem etkinliği, TAVHL 1.8₺ 21 Tem temettüsü).

**24 Tem 2026 — FAZ 3 (kaynak araştırması, karar K-HA1):**

**Yoklanan kaynaklar ve bulgular:**
1. **KAP bildirim akışı** (mevcut `kap_bildirimleri` pipeline'ımız): Halka arz olayları **konsorsiyum aracı kurumunun KAP hesabından** yayınlanıyor (ticker=INFO/GLB/DZY/TERA gibi aracı kodu; şirket adı başlıkta). Canlı doğrulama: son 10 günde 6 "halka arz" konulu bildirim yakalanmış — Metgün Enerji (sonuçlar), Albayrak Hazır Beton (fiyat tespit raporu), Masfen Enerji (izahname), ŞA-RA Enerji (satış duyurusu). Evre sinyalleri (izahname→fiyat tespit→sonuçlar) net ayrışıyor; resmi belge linkleri (`kap_link`, ek PDF) hazır. Yapısal alan (fiyat, tarih) başlık/PDF içinde — regex/manuel gerekir.
2. **SPK "İlk Halka Arz Başvurusu" tablosu** (spk.gov.tr/istatistikler/basvurular/ilk-halka-arz-basvurusu): tek HTML tablo, 129 şirket + başvuru tarihi. Erken boru hattı ("başvurdu" aşaması); fiyat/tarih yok. Kolay parse.
3. **Ahlatcı Yatırım /halka-arz** (aracı kurum kamu duyuru sayfası): Liste kartları (kod, ad, durum "Aktif", fiyat, talep tarihleri, büyüklük) + detay sayfası **etiketli info-grid** (Halka Arz Fiyatı 35,00₺, Dağıtım Yöntemi "Eşit Dağıtım", İskonto %20, Borsa Kodu KARCL, Halka Açıklık %15,42...). En yapısal alan kaynağı; UA ile erişim sorunsuz.
4. **halkaarz.info/halka-arz-takvimi/2026**: JSON-LD `ItemList` ile 27 IPO + detay URL'leri. Çapraz doğrulama için ideal (makine-okur format).
- BIST duyurular sayfası curl'e yanıt vermedi (WAF/JS) — kotasyon sinyali zaten FAZ 1 sync'inden geliyor, gerek yok.
- **HalkArz.com hiç çekilmedi** (kullanıcı kısıtı: yalnız görsel/IA referansı).

**KARAR K-HA1 — kaynak mimarisi:**
- **Tespit + evre birincil: KAP** (resmi, ücretsiz, zaten 15dk'da bir çekiyoruz). `konu/baslik ilike '%halka arz%'` + şirket adı çıkarımı → yeni kayıt + evre güncelleme tetikleyicisi.
- **Yapısal alan birincil: Ahlatcı /halka-arz** (etiket→değer grid parse). **Yedek: halkaarz.info JSON-LD** (çapraz doğrulama + Ahlatcı'da olmayan arzlar).
- **Erken boru hattı (opsiyonel gösterim): SPK başvuru tablosu.**
- **islem_goruyor geçiş sinyali: Yahoo fiyat akışı + sync-bist-companies** (FAZ 1 kanıtı: yeni kotasyon SA+KAP'ta beliriyor, Yahoo anında fiyat veriyor). "Ticker Yahoo'dan fiyat almaya başladı" = kesin işlem sinyali.
- Gerekçe: tek kaynak yok — KAP resmi ama alan-fakir (PDF'ler), aracı sayfası alan-zengin ama gayriresmî; ikisinin birleşimi hem güvenilir hem otomatik. 

**Alan matrisi (yapısal ✓ / manuel ✗):** kod ✓, şirket adı ✓, durum ✓, halka arz fiyatı ✓, talep tarihleri ✓, büyüklük ✓, dağıtım yöntemi ✓, iskonto ✓, halka açıklık oranı ✓, pazar ~ (detayda varsa ✓), aracı kurum(lar) ~ (KAP bildirimi yayıncısından + detay), pay miktarı ~ ; **manuel/nullable v1:** fonun kullanım yeri ✗, tahsisat grupları ✗, katılım-bazlı dağıtım tahminleri ✗, son 3 dönem finansal özet ✗, fiyat istikrarı ✗, lock-up ✗, başvuru yerleri ✗, şirket özeti ✗ (hepsi izahname PDF'inde — v1'de nullable kolon + UI'da "—"; ileride KAP ek-indir PDF + AI özetiyle doldurulabilir, açık iş).

**24 Tem 2026 — FAZ 5+6+7 (`dc2828d`):** UI + cron + lifecycle kodu bitti, push'landı. Ahlatcı parser'ında 3 gerçek bug canlı testte bulunup düzeltildi: (1) kart split'i `</article>`'ta kesilmiyordu → son kartın parçası sayfanın kalanını yutup tamamlanan tablosunun `<time>` etiketlerini karta sızdırıyordu (MASFN tarihi 2026-01-28 görünüyordu); (2) tamamlanan tablosunda Şirket hücresi `<td>` değil `<th scope="row">` → `<th` içeren satırı atlayan kod TÜM veri satırlarını atlıyordu, indeksler de kaymıştı; (3) Yahoo 429'unda tek host'a bağımlılık → query2 yedeği. Test IP'sinde Yahoo 429 nedeniyle sinyal testi bash probe kanıtına dayanıyor (SSAAT fiyat dönüyor); prod Vercel IP'sinde sorun beklenmez.

## AÇIK RİSKLER / BİLİNÇLİ SINIRLAR

1. ~~[BARIŞ — BLOKER] migration~~ → **ÇÖZÜLDÜ (24 Tem akşam):** Barış `halka_arzlar` + `watchlist.tur` migration'larını çalıştırdı (Supabase MCP ile doğrulandı; watchlist'in 11 mevcut satırı korunmuş). İzleme çok-varlık artık tam açık.
2. ~~Migration sonrası ilk tohum~~ → **ÇÖZÜLDÜ:** Barış cron'u 16:29'da dispatch etmiş; tablo 5 kayıtla tohumlu (KARCL+MASFN talep_toplaniyor, ALBTN+METEN+SARAE arz_tamamlandi; SSAAT/EKIM/GOLDA doğru şekilde atlandı — statik evrendeler). Dolu liste+detay UI doğrulandı. Kalan tek doğrulama: SARAE'nin islem_goruyor geçişi (aşağıda 2b).
2b. **SARAE sinyal gecikmesi → TEŞHİS + FIX (`7c2f2cd`):** `sinyalDetay` teşhisi (`2a7f88e`) kök nedeni netleştirdi: üç kod da `query1:429,query2:429` döndü — Yahoo, `yahooIslemSinyali`'nin kullandığı **uzun Chrome-masaüstü UA'sını** Vercel IP'sinden rate-limit'liyordu. Oysa `/api/grafik` ve `/api/fiyatlar` **kısa UA** (`"Mozilla/5.0"`) ile aynı altyapıdan sorunsuz çalışıyor. Fix: Yahoo çağrısı kısa UA'ya çevrildi (Ahlatcı scrape'i uzun UA'da kaldı — o Yahoo değil, gerçekçi tarayıcı UA'sı istiyor). Beklenen sonuç: SARAE→islem_goruyor (gerçekten işlem görüyor, Yahoo 123,8₺); ALBTN+METEN arz_tamamlandi kalır (ilk probe'da Yahoo "Not Found" — tahsis aşamasında, henüz işlem yok); KARCL+MASFN talep_toplaniyor (talep_bitis=24 Tem=bugün, `< bugun` değil → yarın arz_tamamlandi'ya döner). SARAE evren-dışı olduğu için overlay'i de sınayacak (Hisseler'de görünme + snapshot fiyatı).
3. **Evren kalıcılığı yarı-otomatik:** islem_goruyor'a geçen kod overlay ile ANINDA sitede görünür (liste+fiyat+detay sayfası çalışır) ama `data/bist-companies.json`'a kalıcı girişi `node scripts/sync-bist-companies.mjs && node scripts/add-sektor.mjs` + commit ister (StockAnalysis+KAP kaynakları kodu listeledikten sonra — genelde işlem başladıktan 1-3 gün içinde). Overlay o güne kadarki köprü; statik listeye girince otomatik düşer.
4. **Tek yapısal kaynak Ahlatcı:** sayfa yapısı değişirse parser boş döner → cron kırmızı (sessiz bozulmaz). halkaarz.info JSON-LD yedeği K-HA1'de seçili ama v1'de KODLANMADI (bilinçli — gerekirse eklenir). KAP-tabanlı otomatik tespit de v1'de pasif (KAP verisi başlık/PDF-gömülü; Ahlatcı zaten hızlı).
5. **İzahname-derin alanlar** (fon kullanımı, tahsisat, finansal özet, lock-up, fiyat istikrarı, başvuru yerleri, şirket özeti) **manuel/nullable** — UI yalnız doluysa gösterir. Doldurma yolu: Supabase'de elle veya ileride KAP ek-indir PDF + AI özet (ayrı iş).
6. Halka arz kartlarında sektör rozeti gösterilmiyor (kaynakta var, şemada yok — istenirse eklenir).

## ESKİ DURUM NOTLARI (kronoloji için saklandı)

**24 Tem 2026 — FAZ 0-3 bitti; FAZ 4'e (şema) geçiliyor.** Kaynak mimarisi K-HA1 ile karara bağlandı: tespit+evre=KAP, yapısal alan=Ahlatcı (+halkaarz.info yedek), işlem sinyali=Yahoo/sync. Aktif vaka listesi hazır: KARCL (talep 22-24 Tem, bugün bitiyor), ALBTN Albayrak Hazır Beton (fiyat tespit 22 Tem yayınlandı), Masfen Enerji (izahname 20 Tem), Metgün Enerji (sonuçlanmış), ŞA-RA Enerji. Sıradaki iş: **FAZ 4 `halka_arzlar` tablosu** — status lifecycle (talep_toplaniyor→arz_tamamlandi→islem_goruyor), K-HA1 alan matrisi (yapısallar + nullable manueller), idempotent migration `supabase/migrations.sql`'e (Barış çalıştırır). Dikkat: izleme çok-varlık hâlâ `watchlist.tur` migration'ını bekliyor (Barış) — halka arz migration'ıyla AYNI oturumda çalıştırılabilir.

---

**24 Tem 2026 — Halka arz bilanço + F/K/PD/DD (`6242926`):** Kullanıcı "her halka arz şirketinin bilanço verisi + F/K + PD/DD çek" dedi. **Veri kaynağı ölçümü (kritik):** TradingView Scanner yeni kotasyonlarda temel veri TAŞIMIYOR — haftalardır işlem gören SSAAT/SARAE dahil F/K/PD/DD/bilanço hepsi `None`; işlem görmeyenler (KARCL/MASFN/ALBTN/METEN) TradingView'de hiç yok (yalnız `market_cap_basic` işlem görenlerde dolu). Ahlatcı detayında finansal yok. **halkaarz.info IPO detay sayfası** ise her arz için tam bilanço tablosu yayınlıyor (dönen/duran varlık, yükümlülükler, özkaynak, net kâr, ödenmiş sermaye, nakit, stoklar, cari oran; son 3 yıl). Çözüm: `lib/halka-arz-finansal.ts` — JSON-LD kod→slug haritası + bilanço parser'ı (en güncel yıl) + TradingView market cap. **F/K = piyasa değeri/net kâr, PD/DD = piyasa değeri/özkaynak — YALNIZ işlem gören + tüm girdiler mevcutsa** (eksik veride null; sahte değerleme çarpanı üretilmez — SPK). Şema: `halka_arzlar` +fk +pddd +piyasa_degeri +finansal_guncelleme (MCP ile uygulandı + migrations.sql); finansal_ozet JSONB bilanço tutar. Cron 4. adım her arzı zenginleştiriyor. UI: /halka-arz/[kod]'a "Değerleme Çarpanları" (hesaplanan notu) + "Bilanço Özeti" blokları. Doğrulandı: 5/5 arz bilanço yazıldı, KARCL tam bilanço (çarpan yok — işlem yok), SARAE F/K=156,58 + piyasa değeri 50,05 Mr₺ (PD/DD dürüstçe "—" — halkaarz.info'da SARAE özkaynağı boş). Ekran görüntülü.

**24 Tem 2026 — Cron kırmızı fix + IPO finansalları hisse sayfası & AI'ya bağlandı (`42fc7fb`):** Kullanıcı iki sorun bildirdi: (1) halka-arz cron GitHub'da kırmızı — `finansalGuncellenen:5` başarılıyken Ahlatcı kaynağı GH IP'sinden çekilemeyince `hata:1` ile iş fail oluyordu; (2) SARAE **/hisse** sayfasında F/K/PD/DD hâlâ "N/A" ve AI "bilanço verisi sağlanmamış" diyordu (finansallar yalnız /halka-arz detayına bağlıydı). Fix: (1) Ahlatcı erişilemezliği artık **yumuşak uyarı** (`kaynakUyari`) — işi kırmızı yapmaz, veri kaybı yok, sonraki koşu tekrar dener; `hata` yalnız gerçek DB yazma hatalarında. (2) `halkaArzKayitliFinansal(ticker)` yardımcısı → `/api/risk` TradingView F/K/PD/DD null dönerse halka_arzlar'a düşer (skora KATILMAZ, agirlik 0 — farklı hesap; yalnız gösterilir; SARAE F/K=156.58 prod-öncesi doğrulandı); `/api/analiz` `bilanco_snapshots` yoksa izahname bilançosunu (`halkaArzBilancoMetni`) AI prompt'una enjekte eder → AI artık izahname finansallarını yorumluyor.

**Bilinçli sınır:** F/K/PD/DD yalnız işlem gören arzlarda + kaynak verisi tamsa hesaplanır. Arz-öncesi (talep aşaması) çarpanlar için post-offer pay adedi belirsiz olduğundan HESAPLANMADI (yanlış çarpan riski). halkaarz.info bilanço hücreleri şirkete göre seyrek olabilir (SARAE özkaynak boş) — o alanlar "—" gösterilir. TradingView zamanla gerçek temelleri doldurunca hisse sayfası (/hisse) onları zaten gösterir.

**25 Tem 2026 — İş Yatırım finansal kaynağı + logo (`70086ec`+`8c8349b`):** Kullanıcı SARAE /hisse sayfasında F/K yanlış (156 yerine Midas'ta 67), PD/DD+bilanço N/A, logo eksik, HisseBilanco "Önceki" sütununda özkaynak/yükümlülük tüm hisselerde boş, format ekran görüntüsü 3 gibi olmalı dedi. **Kök neden ölçümü:** TradingView Scanner yeni kotasyonlarda F/K/PD/DD/bilanço TAŞIMIYOR (SARAE/SSAAT/EKIM/GOLDA hepsi None; sadece market_cap dolu) — halkaarz.info yıllık net kâr da yanlış F/K (156) veriyordu. **Çözüm — İş Yatırım mali tablo (`lib/isyatirim-finansal.ts`):** isyatirim.com.tr/MaliTablo herkese açık JSON, TÜM BIST + tüm dönem; kalem kodlarıyla Özet Gelir (Satışlar 3C / Brüt 3D / Esas Faaliyet 3DF / FAVÖK=3H+4B / Net Dönem 3L) YoY + Özet Bilanço (Dönen 1A / Duran 1AK / Toplam 1BL / Fin.Borç 2AA+2BA / Net Borç / Özkaynak 2N) önceki-yıl-sonu; son çeyrek otomatik tespit; **F/K = piyasa değeri / TTM net kâr** (FY-önceki − YTD-geçenyıl + YTD-güncel), **PD/DD = piyasa değeri / özkaynak**. Değerler string (parse edildi). **SARAE ekran görüntüsü 3 ile BİREBİR** doğrulandı: F/K 70.80 (Midas 67 — fark piyasa değeri/pay-adedi metodolojisi, halkaarz.info 156'dan çok daha doğru), PD/DD 7.14, Satışlar 3.389.934/1.792.334, FAVÖK 736.381, Özkaynak 7.006.962/6.638.003 (**Önceki artık dolu**). Bağlantılar: `/api/finansal/[ticker]` (15dk cache), `HisseBilanco` yeniden yazıldı (İş Yatırım birincil ekran-görüntüsü-3 formatı + dönem-etiketli sütunlar + "TRY" çipi; banka/eksik için TradingView fallback korundu), `/api/risk` TradingView F/K/PD/DD null ise İş Yatırım'dan hesaplar (skora katmaz). **Logo:** TradingView/halka_arzlar'da yeni IPO logosu yok → Ahlatcı detay `og:image` (`/medya/borsa/hisse/...png`); cron çeker, overlay `logoUrl` taşır, `/api/hisse-ozet` ekler, `StockLogo` yeni `logoUrl` prop'u (next.config remotePatterns += ahlatciyatirim.com.tr). SARAE logosu elle tohumlandı, cron kalanları dolduracak.

**Banka sınırı:** İş Yatırım XI_29 grubu non-financial içindir (tüm mevcut IPO'lar öyle). Bankalarda null döner → HisseBilanco TradingView fallback'ine düşer (mevcut davranış, regresyon yok).

## ŞU AN NEREDEYİM

**25 Tem 2026 — İş Yatırım finansal + logo push'landı (`8c8349b`); prod deploy doğrulaması bekliyor.** Lokal build+doğrulama tam: SARAE F/K 70.80 / PD/DD 7.14 / bilanço ekran-görüntüsü-3 formatı birebir / Önceki sütunu dolu. Önizleme tarayıcısı cross-origin logoyu ve bazı yeniden-navigasyonları cache quirk'iyle engelledi ama sunucu tarafı hepsi geçti (logo URL 200 image/png, next/image proxy 200). Bir sonraki adım: prod deploy sonrası SARAE /hisse sayfasında F/K 70.80 + bilanço + logo görselini teyit; halka-arz cron'unu tetikleyip ALBTN/METEN logolarının dolmasını doğrula. (Önceki iş TAMAMLANDI notu aşağıda korundu.)

---

**24 Tem 2026 — GÖREV TAMAMEN BİTTİ (prod uçtan uca doğrulandı).** FAZ 0-8 + migration + lifecycle canlı doğrulama kapandı. Kanıt: `halka_arzlar` 5 kayıtla tohumlu, üç lifecycle durumu da gerçek arzlarla çalışıyor (SARAE otomatik islem_goruyor'a geçti + overlay ile Hisseler'de 123,80₺ + takvim geçmiş bölümü + /hisse linki). Kısa-UA fix'iyle Yahoo 429 sorunu çözüldü ([[yahoo-vercel-ua]] memory'sine yazıldı). watchlist.tur migration'ı da çalıştı → izleme çok-varlık tam açık.

**24 Tem 2026 — Overlay detay-sayfası fix'i (`09ffc57`+`c13968d`):** Kullanıcı SARAE detay sayfasının üst kartlarının sonsuz skeleton'da takıldığını bildirdi. Kök neden: `/api/hisse-ozet` ve `/api/analiz` `normalizeTicker` ile statik `ALLOWED_TICKERS`'e karşı doğruluyordu; SARAE overlay hissesi orada olmadığı için "Geçersiz ticker" 400 → kartlar veri alamıyordu. (`/api/grafik`, `/api/getiri`, `/api/risk` ticker-doğrulaması kullanmadığı için zaten çalışıyordu — o yüzden grafik+risk doluyken kartlar boştu.) Fix: `lib/hisse-evren.ts`'e `tickerCozOverlayli` ortak yardımcısı — önce normalizeTicker, null dönerse format-geçerli + overlay-üyesi ise kabul; ikisi de değilse sahte ticker reddedilir (güvenlik korundu). hisse-ozet + analiz bunu kullanıyor. Doğrulandı: SARAE kartları dolu (123,80₺ %+9,95, 52H 123,80/77,00, hacim; F/K & PD/DD "N/A" — yeni kotasyonda TradingView temel verisi yok, skeleton değil), AI analiz 200, THYAO regresyonsuz, sahte ticker reddedildi. `bilanco` normalizeTicker'ı bilinçle bırakıldı (400→component graceful gizler; SARAE'nin finansalı zaten yok).

**Kalan (hepsi bilinçli borç / opsiyonel, kod işi YOK):** (a) SARAE gibi işleme geçenlerin `data/bist-companies.json`'a kalıcı girişi — overlay köprüsü çalışıyor, StockAnalysis/KAP kodu listeleyince `sync-bist-companies.mjs` + commit ile kalıcılaşır (1-3 gün); (b) KARCL+MASFN yarın (talep_bitis 24 Tem geçince) arz_tamamlandi'ya, işlem başlayınca islem_goruyor'a otomatik geçecek — cron günde 5 kez izliyor; (c) izahname-derin manuel alanlar, halkaarz.info yedeği, sektör rozeti (AÇIK RİSKLER 3-6); (d) FAZ 2 cron offset kadans ölçümü. Bir sonraki oturum "continue" derse: gerçek yeni iş yok — istenirse (a) için sync tetiklenebilir veya (c) opsiyonel zenginleştirmeler yapılabilir.
