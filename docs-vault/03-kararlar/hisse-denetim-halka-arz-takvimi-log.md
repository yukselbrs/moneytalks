# Hisse Listesi Denetimi + Halka Arz Takvimi — İmplementasyon Logu

**Durum:** DEVAM EDİYOR · Başlangıç: 24 Tem 2026
Bu dosya resume protokolünün tek kaynağıdır: yeni oturum önce en alttaki **ŞU AN NEREDEYİM** paragrafını okur.

Görev tanımı (kullanıcı, 24 Tem 2026): (1) sitedeki hisse listesi denetlenip eksik/yeni kotasyonlar eklenecek + genel veri güncelliği kontrol edilecek; (2) Halka Arz Takvimi modülü — arz süreci boyunca ayrı menüde, işlem görmeye başlayınca otomatik Hisseler'e geçiş. HalkArz.com görselleri YALNIZ bilgi mimarisi referansı (içerik/tasarım kopyalanmaz, scrape edilmez).

## TODO

### FAZ 0 — Resume protokolü
- [x] Log dosyası oluşturuldu (bu dosya)
- [x] Geçmiş log taraması + senkronizasyon (aşağıdaki bölüm)

### FAZ 1 — Hisse listesi denetimi
- [ ] Sitedeki mevcut hisse dökümü (kaynak dosyalar + adet + kod listesi)
- [ ] Resmi kaynaktan güncel BIST kotasyon listesi (KAP şirketler / BIST — Yahoo'ya güvenme)
- [ ] İki listeyi karşılaştır: eksikler + artık işlem görmeyenler (Nisan-Mayıs 2026 sonrası arzlara dikkat, KARCL dahil)
- [ ] Eksikleri mevcut ekleme akışına uygun ekle (şema + veri + sayfa)
- [ ] Her eklemede fiyat + (varsa) bilanço/KAP verisi doğrulaması
- [ ] Bulgular bu dosyaya

### FAZ 2 — Genel veri güncellik denetimi
- [ ] Tüm cron'ların son çalışma zamanları (Actions + tablo updated_at)
- [ ] Modül modül bayat veri taraması (hisse, fon, döviz/maden, bilanço, KAP, takvim, haberler)
- [ ] Silent-fail veri süreçleri
- [ ] Düzeltmeler + kalıcılık testi (sonraki cron koşusunda bozulmuyor)

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

## ŞU AN NEREDEYİM

**24 Tem 2026 — FAZ 0 bitti, FAZ 1'e geçiliyor.** 500 nav fix push'landı (`d130055`), geçmiş loglar senkron, prod cron altyapısı sağlıklı (401 dönemi kapandı). Sıradaki iş: FAZ 1 — sitedeki hisse evreni dökümü (`data/bist-companies.json` 607 + `lib/bist-hisseler.ts` + `hisse_snapshots` 606 tutarlılığı) çıkarılacak, KAP/BIST resmi listesiyle karşılaştırılacak, Nisan-Mayıs 2026 sonrası yeni kotasyonlar (KARCL vb.) tespit edilip eklenecek. Dikkat: izleme çok-varlık hâlâ `watchlist.tur` migration'ını bekliyor (Barış) — bu görevden bağımsız ama hatırlatılmalı.
