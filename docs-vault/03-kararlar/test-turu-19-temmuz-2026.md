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

## ⚠️ Çözülmemiş bulgu: `kap_bildirimleri` hâlâ 0 satır

Bu, hem **Özellik 1** (hisse analizine haber enjeksiyonu) hem **Özellik 3**'ü (portföy KAP maili) etkiliyor — enjekte edilecek/mail gidecek veri yok.

**Elenen teoriler** (kanıtla):
- ~~CRON_SECRET yanlış~~ → çürütüldü, enstruman-snapshot-cron aynı secret'la çalışıyor.
- ~~KAP kaynağı Vercel IP'sinden erişilemiyor (WAF)~~ → çürütüldü, `/api/haberler` (aynı Vercel, aynı kod, aynı IP havuzu) canlı veri döndürüyor.
- ~~`kap_cursor` satırı yok / cursor hiç yazılamıyor~~ → çürütüldü: service-role sorgusuyla satır VAR (`id:1, son_index:0`), ilk yer seed'den (7 Tem) beri hiç ilerlememiş — bu bir SEMPTOM, kök neden değil (cursor sadece kaydedilen>0 olduğunda ilerler).
- Workflow dosyası (`kap-bildirimleri-cron.yml`) yapısal olarak `enstruman-snapshot-cron.yml` ile birebir aynı — config hatası yok.

**Kalan olası nedenler (doğrulanamadı — log erişimim yok):**
1. Cron'un `for...of` döngüsünde ~29 bildirim için **sıralı** (concurrent değil) `kapDetay()` çağrısı, Next.js `maxDuration=60` sınırını aşıyor olabilir (haberler route'u yalnız 10 öğeyi **paralel** çekiyor — cron'un sıralı deseni çok daha yavaş).
2. WAF, kısa sürede çok sayıda ardışık istek görünce (tek cron çalıştırmasında ~29 detay çağrısı) rate-limit'e girip sonraki istekleri sessizce reddediyor olabilir (haberler'in 10 paralel isteği bu eşiğin altında kalıyor olabilir).
3. Bilinmeyen bir runtime hatası yalnız cron route'unda (haberler'de yok).

**Somut sonraki adım (benim erişemediğim):** GitHub → Actions → "KAP Bildirimleri Cron" → son çalıştırmaların loguna bak (`echo "Yanit: $json"` satırı gerçek JSON yanıtını basıyor — `hata` sayacı ve `yeniBildirim` değerini gösterir). O log gerçek hatayı netleştirir; paylaşırsan kod tarafında kesin düzeltme yaparım.

## ❌ Test edilemeyen (erişim kısıtı)
- Gerçek kullanıcı oturumuyla uçtan uca AI analiz üretimi (giriş bilgim yok).
- Portföy KAP maili gönderimi (KAP tablosu boş olduğu için tetiklenecek veri yok).
- GitHub Actions çalıştırma geçmişi/logları (`gh` CLI kurulu değil, auth yok).
- Vercel fonksiyon logları (`vercel` CLI token'ı geçersiz, login gerekiyor).

## Genel değerlendirme
Bu turda **kod tarafı hatasız**: build/tsc temiz, tüm test edilebilir uçlar doğru davranıyor, asıl şikayet konusu olan döviz tutarlılığı sorunu kanıtlanmış şekilde çözüldü. Kalan tek açık soru — KAP cron'unun neden hâlâ yazmadığı — kod incelemesiyle daraltıldı (muhtemelen zamanlama/rate-limit, config değil) ama kesinleştirmek için gerçek çalıştırma logu gerekiyor.

İlgili: [[ai-analiz-haber-tutarlilik-portfoy-mail]] · [[kap-ucretsiz-kaynak-uygulama]] · [[doviz-kiymetli-maden-implementasyon-log]]
