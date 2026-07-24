# Hisse Listesi Denetimi + Halka Arz Takvimi — İmplementasyon Logu

**Durum:** DEVAM EDİYOR · Başlangıç: 24 Tem 2026
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
- [ ] Kaynak adayları: SPK bülten, KAP halka arz duyuruları, BIST yeni kotasyon, aracı kurum sayfaları (≥2-3 karşılaştır)
- [ ] Birincil + yedek kaynak seçimi ve gerekçesi
- [ ] Takip edilecek alan listesi (tarih, fiyat/aralık, dağıtım, pay, aracı kurum, kod, pazar, arz şekli, fon kullanımı, tahsisat, dağıtım tahminleri, finansal özet, fiyat istikrarı, lock-up, açıklık oranı, iskonto, büyüklük, başvuru yerleri, şirket özeti)
- [ ] Alan bazında yapısal-çekilebilir vs manuel ayrımı

### FAZ 4 — Şema
- [ ] `halka_arzlar` tablosu (tüm alanlar + status lifecycle: talep_toplaniyor → arz_tamamlandi → islem_goruyor)
- [ ] Migration idempotent olarak `supabase/migrations.sql`'e (Barış SQL Editor'de çalıştırır)
- [ ] Checkpoint: commit + log

### FAZ 5 — Menü + UI
- [ ] Nav'a "Halka Arz" menü öğesi (mevcut pattern, tema uyumlu)
- [ ] Liste sayfası (durum rozetli kartlar)
- [ ] Detay sayfası (Halka Arz Bilgileri sekmesi + Forum placeholder — kapsam kararını logla)
- [ ] Mobil uyum
- [ ] Kaynak dipnot pattern'i (uygulanabilirse)

### FAZ 6 — Cron + otomatik lifecycle
- [ ] Cron: yeni arz tespiti → tabloya insert (talep_toplaniyor)
- [ ] Durum takibi → islem_goruyor geçişi
- [ ] islem_goruyor → hisse evrenine otomatik aktarım (FAZ 1 ekleme akışıyla ORTAK fonksiyon)
- [ ] Fiyat cron'una dahil olma + takvimden arşive düşme
- [ ] Hata durumları loglanır (silent fail yok)

### FAZ 7 — Test
- [ ] Gerçek arz örneğiyle alan doğrulama
- [ ] Lifecycle simülasyonu (status elle değiştir → aktarım + menüden kalkma)
- [ ] Mobil test
- [ ] FAZ 1-2 düzeltmelerinin sitede doğrulanması

### FAZ 8 — Obsidian kapanış
- [ ] Bu dosya TAMAMLANDI + açık riskler bölümü
- [ ] Geçmiş log senkronunun tamamlığı
- [ ] `.claude/CLAUDE.md`'ye modül + denetim sonucu

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

## ŞU AN NEREDEYİM

**24 Tem 2026 — FAZ 0+1+2 bitti; FAZ 3'e geçiliyor.** Evren 614 (8 yeni, prod'da doğrulandı: hem API hem snapshot cron yazımı), veri altyapısı denetlendi ve sağlıklı; tek yapısal not GH cron throttling (offset mitigasyonu uygulandı, kadans sonraki oturumda ölçülecek). KARCL işlem görmeye başlayınca evrene `sync-bist-companies.mjs` ile girecek; FAZ 6 lifecycle bunu otomatikleştirecek. Sıradaki iş: **FAZ 3 halka arz veri kaynağı araştırması** (SPK bülten / KAP duyuru / BIST kotasyon duyuruları / aracı kurum sayfaları; ≥2-3 karşılaştır, birincil+yedek seç; alan listesinin yapısal-mı-manuel-mi ayrımı). Dikkat: izleme çok-varlık hâlâ `watchlist.tur` migration'ını bekliyor (Barış).
