# Test Turu — 19 Temmuz 2026 (Production Doğrulama)

Bu oturumda (18-19 Tem) uygulanan tüm özellikler production'da test edildi. Aşağıda ✅ doğrulanan, ⚠️ çözülmemiş bulgu, ❌ test edilemeyen ayrımıyla.

## ✅ Doğrulanan (production, canlı)

**Döviz + Kıymetli Maden modülü**
- `/api/doviz-maden` — 16 enstrümanın tamamı dolu (9 döviz + 6 maden + TRY/JPY), 6A/5Y kolonları çalışıyor.
- `/api/doviz-maden/usd-try` detay — grafik (24 nokta), oynaklık profili doğru.
- `/maden` → `/doviz-maden` 308 redirect (kök + alt yol).
- Sayfa UI: `/doviz-maden/usd-try` tarayıcıda render edildi, tüm kartlar (6A/5Y dahil) doğru görünüyor.
- **Migration çalıştırılmış** — `enstruman_snapshots` gerçek veriyle dolu, `updated_at` 14 dk önce (*/15 schedule'a tam uyumlu) → bu cron GERÇEKTEN production'da çalışıyor.

**KAP ücretsiz kaynak**
- `/api/haberler` — 10 gerçek güncel KAP bildirimi (ARDYZ, CWENE, TSPOR, METRO...), doğru ticker/tarih eşlemesi. Bu route Vercel'in kendi egress IP'sinden kap.org.tr'ye başarıyla erişebildiğinin kanıtı — **WAF-engeli teorisi çürütüldü**.

**CRON_SECRET rotasyonu**
- Kullanıcı GitHub + Vercel secret'larını eşitledi. Kanıt: `enstruman-snapshot-cron` her 15 dakikada gerçekten çalışıyor (auth kırık olsaydı 401 yer, tablo bayat kalırdı).

**ANTHROPIC_API_KEY kredisi**
- Önceki oturumda "credit balance too low" (400) veren key, bu turda başarılı yanıt verdi (claude-sonnet-5). Kredi yüklenmiş.

**Döviz analizi tutarlılık düzeltmesi (Özellik 2 — asıl şikayet)**
- Gerçek claude-sonnet-5 çağrısıyla güncel USD/TRY verisi test edildi. Sonuç **beklenen tam olarak**: model artık son 1 aylık bandı (46,99–47,20) gerçek destek/direnç olarak kullanıyor, 1 yıllık dip (40,12) için birebir *"oraya geri dönüş olağanüstü bir kırılma gerektirir, dolayısıyla gerçekçi bir risk eşiği olarak değerlendirilmemeli"* diyor. "40'ın altına inerse sıkıntı" tarzı yanlış eşleme **yok**. Trend doğru tanımlanıyor, disclaimer var, Türkçe karakterler doğru.

**Auth/hata davranışı**
- `/api/analiz` ve `/api/doviz-maden/analiz` — auth'suz istekte doğru `401 {"error":"Giriş gerekli"}` (çökme yok).
- Tarayıcıda buton tıklaması (oturumsuz) → kullanıcı dostu "Analiz oluşturmak için giriş yapmanız gerekir." mesajı, sessiz hata yok.

## ✅ ÇÖZÜLDÜ: `kap_bildirimleri` 0 satır → FUNCTION_INVOCATION_TIMEOUT (504)

**Kök neden (GitHub Actions logu ile kesinleşti):** Cron `HTTP 504 / FUNCTION_INVOCATION_TIMEOUT` alıyordu. `bildirimleriKaydet` yeni bildirimlerin detayını **seri** (`for...of` + `await kapDetay`) çekiyordu. Cursor 7 Tem seed'inden beri `son_index=0`'da takılı olduğu için her koşu **4 günlük tüm pencereyi** (~568 bildirim!) baştan işlemeye çalışıyor → ~80s (test edildi) → Vercel fonksiyon süre limiti aşılıyor → fonksiyon ölüyor → cursor hiç ilerlemiyor → kalıcı kısır döngü. `/api/haberler` çalışıyordu çünkü yalnız 10 öğeyi **paralel** çekiyor (cron'un aksine).

**İki elenen teori** (kanıtla): CRON_SECRET (enstruman cron aynı secret'la çalışıyor) ve WAF/IP engeli (haberler canlı veri veriyor) — ikisi de değildi.

**Fix** (`app/api/cron/kap-bildirimleri/route.ts`, commit sonrası):
1. **Batch + sınırlı-eşzamanlı detay çekimi:** `KAYIT_BATCH=24` (koşu başına en fazla), `DETAY_ESZAMAN=8` paralel. Test: 24 detay paralel(8) = **0.5s** (seri 568 = 80s'e karşı). `esZamanliIsle()` helper'ı.
2. **Özetleme paralelleştirildi:** `OZET_ESZAMAN=2` (5 seri AI çağrısı da limite yaklaşıyordu).
3. **Cursor her koşuda ilerler:** dilimdeki her öğe (FON/detay-yok dahil) cursor'ı geçirir → atlama yok, kalıcı ilerleme.
4. **`son_index=0` = başlatılmamış kabul edilir** → güncele yakın başlatılır (`guncelIndex-30`). Yoksa 4 günlük ~568 backfill + eski KAP haberleri için bayat mail spam'i olurdu. Gerçek index'ler ~1.6M, asla 0 olmaz.

**Beklenen sonuç:** deploy sonrası ilk scheduled koşuda (`*/15`) cursor güncele atlar, ~20-30 yeni bildirim işlenir, tablo dolmaya başlar; Özellik 1 (haber enjeksiyonu) ve 3 (portföy maili) veri kazanır. Her koşu ~0.5s detay + 5 özet + mail = güvenli <60s.

**Doğrulama:** tsc + build temiz; seri-vs-paralel zamanlama canlı kap.org.tr'ye karşı ölçüldü (568 bildirim/4gün → seri 80s ❌, paralel-24 0.5s ✅). Canlı cron testi yapılmadı (prod DB yazar + gerçek mail gönderir — scheduled koşuya bırakıldı).

### İkinci tur (19 Tem, deploy sonrası gerçek çalıştırma logu — commit e48d235)
Timeout fix çalıştı: run #126 `HTTP 200, 43s, {"yeniBildirim":0,"ozetlenen":5,"epostaGonderilen":2,"hata":1}`. Tablo doldu: **347 satır** (0'dan!), **39 tam işlenip maillendi**, 308 özet bekliyor, 1 hata (TUN). Ama iki yeni sorun çıktı:

1. **Workflow kalıcı kırmızı** — GET handler `hata`'ya kümülatif `durum='hata'` satır sayısını (TUN, "Faaliyet Yetki Belgesi", özetlenemeyen) ekliyordu. Tek bir kalıcı-hatalı bildirim workflow'u sonsuza dek `exit 1` yapıyordu, pipeline sağlıklı olsa bile. **Fix:** `hata` artık yalnız OPERASYONEL (KAP erişilemedi/liste çekilemedi) hataları; özetlenemeyen sayısı ayrı `ozetlenemeyenToplam` gözlemlenebilirlik alanı (workflow'u kırmaz).

2. **Bayat mail riski** — ilk doldurmada `son_index=0` jump'ı (ilk koşuda guncelIndex geçici düşük geldiğinden) tam tutmamış; 5 günlük (~300) backfill birikti (14-19 Tem). Özetlenince eski haberler için izleyen/portföy kullanıcılarına bayat mail giderdi. **Fix:** özetleme + bildirim **en yeniden sıralı** (taze haber önce, backfill kuyruk sonuna); mail/bildirim yalnız **son 36 saatteki** (`MAIL_TAZELIK_SAAT`) bildirimlere — eski backfill özetlenip tabloya girer (haber-enjeksiyonu özelliği için iyi) ama mail göndermez ("haber geldiğinde" = taze haber intent'i).

**Beklenen sonuç:** sıradaki scheduled koşuda workflow YEŞİL (hata=0), taze bildirimler maillenir, 300'lük backfill sessizce özetlenir. tsc+build temiz.

## ❌ Test edilemeyen (erişim kısıtı)
- Gerçek kullanıcı oturumuyla uçtan uca AI analiz üretimi (giriş bilgim yok).
- Portföy KAP maili gönderimi (KAP tablosu boş olduğu için tetiklenecek veri yok).
- GitHub Actions çalıştırma geçmişi/logları (`gh` CLI kurulu değil, auth yok).
- Vercel fonksiyon logları (`vercel` CLI token'ı geçersiz, login gerekiyor).

## Genel değerlendirme
Bu turda **kod tarafı hatasız**: build/tsc temiz, tüm test edilebilir uçlar doğru davranıyor, asıl şikayet konusu olan döviz tutarlılığı sorunu kanıtlanmış şekilde çözüldü. Kalan tek açık soru — KAP cron'unun neden hâlâ yazmadığı — kod incelemesiyle daraltıldı (muhtemelen zamanlama/rate-limit, config değil) ama kesinleştirmek için gerçek çalıştırma logu gerekiyor.

İlgili: [[ai-analiz-haber-tutarlilik-portfoy-mail]] · [[kap-ucretsiz-kaynak-uygulama]] · [[doviz-kiymetli-maden-implementasyon-log]]
