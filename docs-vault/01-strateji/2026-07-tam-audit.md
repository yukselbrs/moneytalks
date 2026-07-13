# FAZ 3 — Tam Ürün Auditi ve Yenilikçi Yol Haritası

**Tarih:** 13 Temmuz 2026
**Kapsam:** Track 1 sonrası production kod tabanı (`main` @ `295c553` + v10 docs) — fonksiyonel denetim, özellik yükseltmeleri, radikal beyin fırtınası, teknik borç, vault bakımı.
**Kapsam dışı (bilinen açık işler):** CRON_SECRET Vercel/GitHub ayağı, Cloudflare purge, KAP production geçişi, Premium Pass 2, kayıp bilanço route'u.
**Yöntem:** Canlı dev server (`npm run dev`) + gerçek Supabase/TEFAS/KAP-demo/Anthropic servisleriyle uçtan uca test; throwaway test kullanıcısı (`faz3.audit.test@example.com`, audit sonunda silinecek); masaüstü 1280×720 + mobil 375×812.

> Kaan'ın Track 1 sonrası 2 yeni özelliği (8-12 Temmuz) bu audit'e dahil: **makro/siyasi risk radarı** (`f1ee2f5`) ve **TEFAS fon kaşifi** (`295c553`).

---

## BÖLÜM A — Uçtan Uca Fonksiyonel Denetim

### A.0 Test kapsamı

| Akış | Yöntem | Sonuç |
|---|---|---|
| Landing + demo widget | UI | ✅ THYAO fiyat/aralık/DEMO rozeti/disclaimer |
| Kayıt/Giriş sayfaları | UI render + kod (form submit güvenlik kuralı gereği canlı denenmedi) | ✅ 200 render |
| Dashboard (özet, grafik, AI panel, rejim, movers, KAP feed, yan paneller) | UI + network | ⚠️ bulgular aşağıda |
| Hisse detay (THYAO/ASELS) | UI + network | ⚠️ bulgular aşağıda |
| AI analiz (gerçek Claude çağrısı) | UI tık + sunucu log | ✅ 5.4s'de üretildi |
| İzleme yıldızı | UI + DB doğrulama | ❌ A.3/A.4 |
| Alarm CRUD | API (Bearer) | ✅ create/list/patch/delete (`kosul: yukari/asagi`) |
| Portföy ekleme | REST (RLS, user token) | ✅ 201 |
| Pako AI chatbot | API (SSE, gerçek tool-use) | ⚠️ A.2, A.10 |
| KAP Tercümanı boru hattı | DB + canlı KAP-demo çağrısı | ❌ A.1 (kritik) |
| /kap, /kap/[index] | UI + curl | ✅ boş durum + 404 doğru; içerik yok (A.1'in sonucu) |
| Fon kaşifi (/api/fonlar, /fon/AAL) | API + UI | ✅ canlı TEFAS verisi, grafik, getiriler |
| Takvim | API | ✅ 23 Tem PPK / 29 Tem FOMC hardcode dönüyor |
| Haftalık karne | `?dry=1` gerçek veriyle | ✅ 6 kullanıcı, sektör/beta/risk hesapları tutarlı |
| Neden kartı / chip'ler | UI (Düşenler sekmesi) + API | ✅ çalışıyor; kalite notu A.8 |
| Makro risk radarı | API | ✅ çalışıyor; tasarım notu A.9 |
| Hesap silme | Kod okuması | ✅ `requireUser` → `admin.deleteUser(auth.user.id)` — token'dan, body'den değil |
| Mobil (dashboard, fon) | UI 375×812 | ⚠️ A.6 |

### A.1 🔴 KRİTİK — KAP Tercümanı hiç veri toplamıyor (sessiz, 6 gündür)

**Belirti:** `kap_bildirimleri` **0 kayıt**; `/kap` boş durumda; KAP chip'i hiç çıkmıyor; izleme e-postası hiç gitmedi; karnede KAP olayları hep boş.

**Kök neden zinciri (canlı repro ile doğrulandı):**
1. Migration seed'i cursor'u 0 ile oluşturuyor: `INSERT INTO kap_cursor (id, son_index) VALUES (1, 0)` ([migrations.sql:669](../../supabase/migrations.sql)).
2. `fetchSonIndex` satır varsa değeri aynen kullanıyor — 0'ı "başlangıç yok" saymıyor ([kap-bildirimleri/route.ts:41-44](../../app/api/cron/kap-bildirimleri/route.ts)); `guncelIndex - 30` fallback'i yalnız satır hiç yokken çalışıyor (migration yüzünden asla).
3. KAP API `disclosures?disclosureIndex=0` → **HTTP 400 "ER005 Bildirim bulunamadı"** (canlı doğrulandı); route `if (!listRes.ok) return []` ile bunu sessizce boş listeye çeviriyor ([route.ts:49-50](../../app/api/cron/kap-bildirimleri/route.ts)).
4. Boş liste → kayıt yok → cursor güncellenmiyor → **her 15 dk'da aynı 400, sonsuza dek**. `kap_cursor.updated_at = 2026-07-07T16:36` (migration anı) bunu kanıtlıyor.

**Etki:** Track 1'in omurga özelliği (KAP Tercümanı) ve ona bağlı 4 yüzey (SEO envanteri, chip, e-posta, karne-KAP) production'da fiilen ölü. GitHub Actions log'ları 200 döndüğü için fark edilmiyor — görev tanımındaki "sessiz başarısızlık" tam olarak bu.

**Önerilen fix (Faz 4):** `fetchSonIndex`'te `son_index === 0 → guncel - 30`; ayrıca 400'lü liste yanıtını loglayıp run özetinde `hata` sayacına yazmak (sessizliği kır). Prod'da tek seferlik `UPDATE kap_cursor SET son_index = <lastDisclosureIndex - 30>`.

### A.2 🔴 Chatbot: gövde doğrulaması yok → boş istek Anthropic'e gidiyor → 500

`{ messages: [...] }` beklenirken farklı/boş gövde gelirse `chatMessages = []` ile doğrudan `anthropic.messages.create` çağrılıyor → Anthropic 400 `messages: at least one message is required` → kullanıcıya jenerik 500, boş gövde ([chatbot/route.ts:2693-2695](../../app/api/chatbot/route.ts), hata sunucu logunda doğrulandı). Kota **düşmüyor** (artış başarı yolunda, :2833) — ama Anthropic'e çöp istek gidiyor ve client'a işlenebilir hata dönmüyor. Fix: `messages` boş/geçersizse 400 + Türkçe mesaj, Claude'a hiç gitme.

### A.3 🟠 İzleme yıldızı: hata sessizce yutuluyor

`toggleIzleme` insert/delete hatasında **hiçbir şey yapmıyor** — state değişmiyor, toast yok, `console.error` bile yok ([hisse/[ticker]/page.tsx:100-106](../../app/hisse/[ticker]/page.tsx)). Kullanıcı yıldıza basar, hiçbir şey olmaz, nedenini asla bilemez. (Testte RLS/token sağlamken bile A.4'teki oturum sorunu yüzünden sessizce no-op oldu.) Fix: error'da görünür geri bildirim + retry.

### A.4 🟠 ŞÜPHELİ (repro gerekli) — Hard-load'da oturum yarışı: sayfa "çıkışlı" davranıyor

Aynı geçerli localStorage session'ıyla: dashboard ve mobil dokümanlarda `getSession()` kullanıcıyı döndürdü (selamlama + Bearer'lı API çağrıları çalıştı), THYAO dokümanında ise iki ayrı yüklemede + hard reload'da header e-postasız kaldı, `supabase.co`'ya tek REST çağrısı yapılmadı (fetch hook ile doğrulandı) → izleme select/insert, analiz cache okuma sessizce atlandı. **Uyarı:** Bu gözlem sentetik session enjeksiyonu (test harness) altında yapıldı; auth-js'in enjekte session'ı bazı dokümanlarda geç/hiç initialize etmemesi harness artefaktı olabilir. **Yapılacak:** Gerçek login ile (Kaan/Barış hesabı) `/hisse/X` sayfasına direkt URL'den hard giriş yapıp yıldız + "Son analiz" davranışını doğrulamak. Reprodüklenirse bu, SEO'dan gelen oturumlu kullanıcının sayfayı "çıkış yapılmış" görmesi demek — öncelik yükselir. Kod tarafında güçlendirme her durumda ucuz: sayfa bileşenlerinde tek seferlik `getSession()` yerine `onAuthStateChange` aboneliği (AppShell'deki desen, [AppShell.tsx:174](../../components/AppShell.tsx)).

### A.5 🟠 KAP akışında tarih yok — 2023 bildirimi "bugün 17:42" gibi görünüyor

Dashboard sağ panel KAP feed'i yalnız **saat** basıyor; 29 Aralık 2023 tarihli demo bildirimi (KARYE) "17:42" olarak bugünmüş gibi listeleniyor. Production'da da Cuma akşamı bildirimi Pazartesi hâlâ "17:42" görünecek. Fix: bugünse saat, değilse "29 Ara" + saat (dashboard KAP feed render'ı — `/api/haberler` `tarih` ISO döndürüyor, veri hazır).

### A.6 🟡 Mobil: yüzen Pako "N" butonu alt navigasyonla çakışıyor

375px genişlikte sol-alt yüzen buton, alt nav'daki "Dashboard" öğesinin üstüne biniyor (dokunma hedefi çakışması, ekran görüntüsüyle sabit). Fix: mobilde butonu alt nav'ın üstüne kaydır (`bottom: calc(nav + 8px)`) veya alt nav'a entegre et.

### A.7 🟡 `/api/analiz` veri-polling endpoint'i olarak kullanılıyor

Hisse sayfası açık kaldıkça 15 sn'de bir `POST /api/analiz {veriOnly:true}` atılıyor ([hisse/[ticker]/page.tsx:162](../../app/hisse/[ticker]/page.tsx)); her çağrı sunucuda Yahoo 5d fetch'i (~250-450ms). LLM maliyeti yok ama: ağır route'un ısınması, Vercel invocation sayısı, `/api/fiyatlar`'ın 15s TTL cache'inin devre dışı kalması. Fix: veriOnly ihtiyacını `/api/fiyatlar?extra=` veya hafif `/api/hisse-ozet` endpoint'ine taşı.

### A.8 🟡 Endeks chip'i büyüklüğe kör

Endeks -%1,6 iken -%9,97'lik tavan-taban hareketine de "Endeks yönlü" chip'i basılıyor (yalnız yön eşleşmesi kontrol ediliyor). -%10 hareketi endeksle açıklamak yanlış-atıf riski taşıyor — tam da neden-kartının kaçınmak istediği şey. Fix: `|hisse| ≤ k×|endeks|` (ör. k=2.5) şartı; aşan hareketlerde chip'i hiç gösterme veya "endeksten sert" varyantı (B.9'da detay).

### A.9 🟡 Makro taban skoru tüm risk skorlarını eziyor (bugün canlıda gözlendi)

Makro skor 88 ("Kritik") → tüm hisselere taban 52, endekse 58 basılıyor ([risk/route.ts, makroTaban](../../app/api/risk/route.ts)). Karne dry-run'da düşük-betalı (0.47) portföyün risk skoru tam 52 = taban; yani bugün beta 0.4 ile beta 1.8 hisse aynı skora yaslanıyor, "AI Skoru" ayırt ediciliğini kaybediyor. Yüksek makro riskte *tüm* skorların yükselmesi savunulabilir bir tasarım — ama taban yerine **harman** (ör. `max` değil ağırlıklı ortalama zaten var; taban ayrıca vurulmuş) ve UI'da "skorun X puanı makro ortamdan" şeffaflığı olmadan, kullanıcı dünkü 25'lik hissenin bugün 52 olmasını anlayamaz. B.1'de ürünleştirme önerisi.

### A.10 🟡 Chatbot çıktısında bozuk markdown artefaktı

SSE yanıtında `\n\n****\n\n` (boş bold bloğu) üretildi — muhtemelen modelin boş başlık kalıbı. Render'da çirkin. Fix: stream sonrası `\*{3,}` temizliği veya prompt'a "boş vurgu bloğu üretme" satırı.

### A.11 Olumlu doğrulamalar

- Landing demo widget'ı kayıtsız fiyat gösterip AI için kayıt CTA'sı veriyor (dönüşüm hunisi sağlam).
- Alarm API'si doğru koşul adlarıyla tam CRUD; portföy RLS'i user-token'la 201.
- Karne hesapları gerçek veriyle tutarlı (değer-ağırlıklı getiri, sektör dağılımı, beta, %100 risk kapsaması); `?dry=1` yan etkisiz çalışıyor.
- Chatbot doğru şemayla: 27 sn'de tool-use'lu (fiyat+teknik veri çekti), sektör bağlamlı, SPK disclaimer'lı yanıt; `kalanHak` sayacı doğru düştü (3→2).
- Fon kaşifi uçtan uca canlı (TEFAS bugünün verisi, grafik, gider oranları); takvim PPK/FOMC hardcode'u dönüyor; `/kap/[index]` yokken temiz 404.
- Mobil dashboard yerleşimi (A.6 dışında) düzgün; sparkline'lı özet kartları, KAPALI rozeti, gecikme etiketleri tutarlı.

### A.12 Test artıkları (temizlik durumu)

Test kullanıcısı `faz3.audit.test@example.com` (7671479e…): portföyde 1 THYAO satırı + 1 pasif-hedefli alarm duruyor — audit sonunda kullanıcıyla birlikte silinecek (FK cascade). Watchlist satırı silindi.

---

## BÖLÜM B — Özellik Bazlı Yükseltme Fırsatları

Rakip kıyasının tabanı (13 Temmuz 2026 araştırması): **Fintables** Evo'yu her sayfaya gömdü (sayfa-bağlamlı soru önerileriyle, mesaj kotalı; paketler Trade/Fon ₺149, Pro ₺699, Evo ₺999 — [fintables.com/uyelik-paketleri](https://fintables.com/uyelik-paketleri), [fintechtime](https://fintechtime.com/2026/06/fintablestan-yatirim-odakli-yapay-zeka-asistani-evo/)). **Midas** Mayıs'ta 5 ürün duyurdu: Atlas masaüstü, Avrupa borsaları, VİOP, DeFi ve ücretsiz AI Piyasa Rehberi (~4M kullanıcı — [webrazzi](https://webrazzi.com/2026/05/11/midas-in-yeni-ozelliklerini-midas-ceo-su-egem-eraslan-ile-konustuk)). **Robinhood** Cortex Digests ile kişisel portföy özetlerini Gold'a bağladı (1M+ kullanıcı, Gold +%76 YoY — [robinhood newsroom](https://robinhood.com/us/en/newsroom/robinhood-presents-yes-no-event/)). **eToro** "ajanlar yılı" diyerek Agent Portfolios'u açtı ([yahoo finance](https://finance.yahoo.com/news/etoro-group-ltd-etor-q1-230229243.html)).

| # | Özellik | Mevcut durum (kod) | Rakibe göre | Somut öneri |
|---|---|---|---|---|
| B.1 | **Makro risk radarı** (yeni, Kaan) | Keyword-ağırlıklı GDELT+RSS skoru; skor ≥85'te tüm risk skorlarına taban 52/58 ([risk/route.ts](../../app/api/risk/route.ts)); AI panel + chatbot'a bağlı | Benzersiz — hiçbir TR rakipte yok. Ama bugünkü haliyle skor ezici (A.9) | (a) Taban yerine görünür ayrıştırma: "Teknik 28 + Makro 24 = 52" çift çubuk (`teknikSkor` API'de zaten dönüyor, UI kullanmıyor); (b) chip: "skor makro ortam nedeniyle yükseldi"; (c) keyword listesi tek dosyada — yanlış pozitif ölçümü için son 30 günün skor zaman serisini logla |
| B.2 | **Risk skoru** | 12 bileşen + makro; Wilder RSI; EMA momentum | Fintables'ta karşılığı skor değil veri; Midas'ta yok | "Neden bu skor?" açılır satırı: en yüksek katkılı 3 bileşeni cümleyle göster (`bilesenler` dizisi API'de hazır — saf UI işi). Robinhood'un "custom indicator via NL" örneğine karşılık, chatbot'a `get_teknik_analiz` zaten bağlı — chatbot'tan "risk skorumu açıkla" akışını önerilen soru chip'i yap |
| B.3 | **AI hisse analizi** | Tek seferlik üretim + `analizler` cache + "Son analiz" rozeti; veriOnly polling aynı route'ta (A.7) | Evo sayfa-bağlamlı ve her yerde; Midas özet otomatik | (a) veriOnly'yi hafif endpoint'e ayır (A.7); (b) analiz çıktısının altına "bu analizle ilgili soru sor" → Pako'ya ticker bağlamıyla köprü (Evo'nun her-sayfa deseninin bizdeki karşılığı, HisseChatbot zaten sayfada) |
| B.4 | **Pako AI chatbot** | 6 tool'lu, SSE, kota (3/gün ücretsiz), SPK filtresi, 27 sn tam yanıt | Evo kotalı ama anlık his veriyor; 27 sn sessizlik uzun | (a) Tool-round'lar arasında SSE status event'i ("fiyat verisi çekiliyor…") — client zaten SSE parse ediyor; (b) boş-gövde 400 fix'i (A.2); (c) `alarmTaslak` SSE'de dönüyor ama UI'da "alarmı kur" butonuna bağlanmamışsa bağla — chatbot→alarm dönüşümü bedava retention |
| B.5 | **Alarmlar** | Tam CRUD, 15dk cron, atomic claim, hedefe-uzaklık göstergesi | Midas anlık bildirimli; bizde 15 dk tarama + e-posta | (a) Web push (PWA) — e-postadan hızlı, native gerektirmez; (b) alarm tetiklenince "neden" bağlamı: tetik anındaki KAP eşleşmesini bildirime iliştir (neden-motoru hazır) |
| B.6 | **İzleme listesi** | Tek liste; dashboard paneli; KAP e-posta eşleşmesi (A.1 fix'ine bağlı) | Fintables çoklu liste + radar taraması | (a) İzleme sayfasına kişisel KAP akışı sekmesi (`kap_bildirimleri` GIN sorgusu hazır, SELECT anon açık); (b) sessiz yıldız hatası fix'i (A.3) |
| B.7 | **Portföy** | Kâr/zarar, dağılım, senaryo, radar; karne cron'u | Fintables portföy analizi Pro'da; Robinhood Digests kişisel özet veriyor | En büyük fırsat C.1'de (kişisel gün sonu özeti). Kısa vadede: portföy sayfasına karne dry-run'ının web görünümü ("karnemi şimdi gör" — cron beklemeden, `?dry=1` verisi UI'a bağlanır) |
| B.8 | **KAP Tercümanı** | Boru hattı yazık ki A.1 nedeniyle hiç akmadı; özet kalitesi kanıtlı (Track 1 testleri) | Kimsede yok — ama Evo KAP dokümanlarına soru-cevap veriyor (pull). Bizim push+cache modelimiz maliyet avantajlı | (a) A.1 fix (cursor + sessizlik); (b) prod geçişinde ilk 24 saat "geri doldurma" modu: son 200 bildirimi tek seferde işle ki /kap envanteri boş açılmasın; (c) `presentation` alanı parse'ı (kap-explainer notlarındaki açık iş) |
| B.9 | **Neden kartı / chip** | Dashboard mover'larında KAP+endeks chip'i | Robinhood Digests bunu kişisel yapıyor | (a) Büyüklük şartı (A.8); (b) sektör karşılaştırması: `bist-companies.json.sektor` artık var — "sektör ortalaması -%4,2" chip'i eklenebilir (snapshot'lardan hesaplanır, ek fetch yok); (c) chip'i hisse detay sayfasına da koy |
| B.10 | **Haftalık karne** | Cron + e-posta, idempotent, teşhis dili onaylı | Kimsede yok (Fintables'ta rapor yok, Midas'ta yok) | (a) Karneye hafta-üstü-hafta delta ("risk skorun 46→52"); (b) karne e-postasındaki KAP bölümü A.1'e bağlı — fix sonrası gerçek içerik; (c) web arşivi: `/karne` sayfası (e-postayı kaçıranlar + paylaşılabilirlik) |
| B.11 | **Programatik SEO** | Şablonlar hazır, envanter 0 (A.1) | Fintables'ın KAP sayfaları indeksli ama ham; anlatım farkımız duruyor | A.1 fix + geri doldurma sonrası sitemap zaten son 500'ü alıyor. Ek: `/kap` hub'ına tip filtreleri (sermaye artırımı / temettü / geri alım sekmeleri) — long-tail aramaları yakalar |
| B.12 | **Fon kaşifi** (yeni, Kaan) | Liste + detay + günlük snapshot cron'u canlı | Fintables Fon ₺149/ay; TEFAS ham | C.4'te büyütme planı. Kısa vadede: fon detayına kategori-medyanı gider oranı kıyası (tek sorgu) + "yüksek gider" nötr etiketi |

Öncelik önerisi (Bölüm B içinden): **B.8a (A.1 fix) > B.4b (A.2 fix) > B.1a (makro şeffaflık) > B.9b (sektör chip) > B.7 (karne web görünümü)** — ilk ikisi bug, sonraki üçü mevcut veriyle saf UI/mantık işi.

---

## BÖLÜM C — Radikal Beyin Fırtınası (ana odak)

Beş fikir, öncelik sırasıyla. Ortak zemin: MKK'ya göre pay senedi yatırımcısı **6.819.248** (3 Temmuz 2026, [borsagundem](https://www.borsagundem.com.tr/mkk-pay-senedi-yatirimci-sayisi-6-milyon-819-bine-ulasti)) — Haziran'a göre +400 bin; kitle büyümeye devam ediyor. "AI özet" artık masa bahsi (Midas ücretsiz, Fintables Evo, Robinhood Cortex); savunulabilir alan **kişiselleştirilmiş, olay-tetiklemeli, kaynak-şeffaf anlatım** — Track 1'in kurduğu boru hattının üstü.

### C.1 ⭐ "Akşam Raporu" — kişisel gün sonu portföy atıf özeti

- **Ne:** Her işlem günü kapanıştan sonra (18:30) portföy+izleme listesine özel tek kart: "Portföyün bugün %-2,1 (≈-8.400₺). Bunun yaklaşık yarısı endeks düşüşü (XU100 %-1,6); THYAO'daki ekstra düşüş şu KAP bildirimiyle zamansal örtüşüyor [link]; USD/TRY etkisi sınırlı." İn-app bildirim + isteğe bağlı e-posta; her cümlenin kaynağı tıklanabilir.
- **Neden şimdi (veri):** Robinhood **Cortex Digests** tam bu ürünle Gold aboneliğini yıllık +%76 büyüttü ve 1M+ kullanıcıya ulaştı ([robinhood](https://robinhood.com/us/en/newsroom/robinhood-presents-yes-no-event/), [investmentnews](https://www.investmentnews.com/transformation/robinhood-brings-ai-powered-cortex-to-rias-on-tradepmr/266861)) — model kanıtlı. Türkiye'de karşılığı yok: Midas Rehberi geneldir ve yalnız Midas müşterisine; Fintables Evo pull-based (soru sormalısın). Bizim farkımız push + broker-bağımsız + kaynak linki.
- **Altyapı bağlantısı (~%70 hazır):** atıf sinyalleri `/api/neden` + endeks/sektör verisi (GÖREV 11-12), portföy değer-ağırlıklı hesaplar `haftalik-karne` route'unda, teşhis dili kalıpları kap-explainer notlarında, gönderim idempotency deseni `karne_gonderim`'de. Eksik: günlük cron + kart şablonu + (isteğe bağlı) 2-3 cümlelik Claude harmanı — bildirim başına değil **kullanıcı başına günlük tek** üretim; 1.000 aktif kullanıcıda ≈ günde 1.000 kısa çağrı, cache'lenemez ama kısa (maliyet tavanı ~₺1-2K/ay, Plus'a kota ile bağlanır).
- **Efor:** 1–1,5 hafta net (takvimde 2-3 hafta).
- **Etki:** Günlük geri-gelme ritüeli (retention'ın en zayıf halkası) + Plus'ın çapa özelliği ("kişisel akşam raporu" tek başına ₺129/ay gerekçesi) + her kart sonundaki "arkadaşına gönder" ile organik yayılım.
- **Kapattığı boşluk:** Strateji raporu Boşluk 2'nin (atıf) kişiselleştirilmiş hali; Boşluk 3'ün (karne) günlük frekansa inmesi.

### C.2 "Halka Arz Tercümanı" — izahname AI özeti + katılım rehberi

- **Ne:** Her yeni halka arz için otomatik sayfa: (1) şirket ne iş yapıyor (tek paragraf), (2) arz koşulları (fiyat, lot, tarih — tablo), (3) izahname risk faktörlerinin sade Türkçe özeti (kaynak sayfa numaralı), (4) arz sonrası "ilk gün ne oldu" güncellemesi. Al/katıl önerisi asla yok — "izahnamede şirket şu riskleri sayıyor" teşhis dili.
- **Neden şimdi (veri):** Yalnız 2026 2. çeyrekte **16 halka arz, 13,28 milyon katılım, 26,1 milyar TL** ([borsamatik](https://www.borsamatik.com.tr/261-milyar-tl-halka-arz-geliri-elde-edildi-haber-179588), [kulisborsa](https://www.kulisborsa.com/ikinci-ceyrekte-halka-arzlar-261-milyar-tl-kaynak-sagladi)) — Türkiye'nin en kitlesel perakende yatırım olayı ve tam hedef persona (ilk kez yatırım yapan). Mevcut kaynaklar (halkarz.com vb.) takvim/lot listesi veriyor; **izahnameyi anlatan yok**. Her arz, "X halka arz ne zaman / değer mi" tipi yüzbinlerce aramalık sezonluk SEO dalgası.
- **Altyapı bağlantısı (~%60 hazır):** KAP boru hattı (bildirim tipleri arasında izahname/sirküler CA/DUY tipleriyle geliyor), kap-ozet.ts'e tek yeni tip şablonu, SEO sayfa şablonu GÖREV 10'dan kopyalanır, takvim sayfasına arz satırı. İzahname PDF'i için `downloadAttachment` endpoint'i biliniyor (uzun PDF → bölümlü özet: yalnız "risk faktörleri" bölümü işlenir, maliyet sınırlı).
- **Efor:** 1 hafta pilot (takvim + özet sayfası); PDF risk-bölümü özeti +3-4 gün.
- **Etki:** Sezonluk viral edinim motoru — her arz dönemi yeni kullanıcı zirvesi; SEO envanterine yüksek-niyetli sayfa türü. Monetizasyon değil edinim oynar.
- **Kapattığı boşluk:** Strateji raporu Boşluk 5'in halka arz yarısı (fon yarısını Kaan açtı) — raporda Faz 4'e ertelenmişti, KAP boru hattı kurulunca efor 3'te 1'e düştü.

### C.3 "Temettü & Vergi Rehberi" — kimsenin girmediği alan

- **Ne:** Portföye özel temettü takvimi (KAP `temettu` tipli bildirimlerden), brüt→net stopaj hesabı, yıl sonunda "beyan eşiği taraması": "2026'da net X₺ temettü aldın; GVK 22/2 istisnası sonrası kalan tutar beyan eşiğinin altında/üstünde görünüyor — kesin durum için mali müşavire danış." Kesinlikle vergi tavsiyesi değil; mevzuat linkli bilgilendirme + hesaplayıcı.
- **Neden şimdi (veri):** Temettü stopajı %10'a güncellendi (22.12.2024 CB Kararı), yarı istisna + ikinci dilim beyan eşiği kombinasyonu bireysel yatırımcı için fiilen anlaşılmaz ([istanbulmalimusavirlik](https://www.istanbulmalimusavirlik.net/borsa-mevduat-yatirim-fonlari-vergi-rehberi-2026/), [kpmgvergi](https://kpmgvergi.com/blog/borsada-islem-goren-hisse-temettuleri-gelir-idaresi-nin-takibinde/1349) — GİB'in temettüleri takibe aldığı haberi farkındalığı büyüttü); 27 Mart 2026'da serbest fonlara %14,5 stopaj kararı vergi gündemini ısıttı. **Fintables, Midas, Matriks, İdeal — hiçbirinde vergi katmanı yok.** "Temettü vergisi hesaplama" araması her Şubat-Mart zirve yapan, sahipsiz bir SEO alanı.
- **Altyapı bağlantısı (~%55 hazır):** `portfoy` tablosu + KAP sınıflandırıcının `temettu` tipi + `caEventStatus` endpoint'i (hak kullanım tarihleri) + karne e-posta altyapısı. Eksik: stopaj/istisna hesap motoru (saf, deterministik kod — LLM yok) + yıllık özet raporu.
- **Efor:** 1,5–2 hafta (hesap motoru + takvim UI + yıl sonu raporu). Hukuki metin gözden geçirmesi şart (bilgilendirme çerçevesi).
- **Etki:** Kategoriye "ciddi araç" sinyali veren benzersiz özellik; Şubat-Mart beyan sezonunda edinim; temettü yatırımcısı (uzun vadeli, düşük churn) segmentini kilitler. Yıllık plan satışına doğal gerekçe ("vergi yılın tamamını kapsar").
- **Kapattığı boşluk:** Hiçbir strateji dokümanında olmayan, rakipsiz açı — "borsayı anlatan platform"un vergiye uzanması.

### C.4 Fon Karnesi — Kaan'ın kaşifinin anlatım katmanı

- **Ne:** (1) Fon detayına kategori kıyası: "gider oranı %1,65 — kategori medyanı %1,2'nin üstünde; 1Y getiri kategori ortalamasının X puan altında/üstünde" (nötr, teşhis dili); (2) portföye fon pozisyonu ekleme (kod+adet) → haftalık karneye fon satırı; (3) "hisse mi fon mu" eğitim sayfası değil — aynı sektöre maruz kalmanın iki yolu karşılaştırması.
- **Neden şimdi (veri):** Fon yatırımcısı **5,89 milyon**, toplam büyüklük ~10 trilyon ₺ ve rekor kırıyor ([bigpara](https://bigpara.hurriyet.com.tr/haberler/ekonomi-haberleri/yatirim-fonlarinda-rekor-uzerine-rekor_ID1462560/)); Fintables fon analizini ₺149/ay'a ayrı paket olarak satıyor — ödeme istekliliği kanıtlı. Kaan'ın explorer'ı (12 Temmuz) ham veriyi getirdi; anlatım katmanı (bizim farkımız) henüz yok. TEFAS verisi elimizde günlük snapshot olarak duruyor.
- **Altyapı bağlantısı (~%65 hazır):** `fon_snapshots` dolu ve günlük cron'lu; kategori medyanı tek SQL; karne cron'u genişletilebilir. Eksik: portföyde fon tipi pozisyon (şema: `portfoy`'a `tur` kolonu veya ayrı tablo — supabase-schema ajanına), kıyas UI'ı.
- **Efor:** 3–5 gün (kıyas + karne satırı); portföy-fon entegrasyonu +1 hafta.
- **Etki:** Fintables'ın ₺149'luk ürününün çekirdeğini Plus'a katmak → paket değer algısı; fon yatırımcısı segmenti (hisseden daha muhafazakâr, karne ritüeline daha yatkın).
- **Kapattığı boşluk:** Boşluk 5'in fon yarısının anlatım katmanı; Kaan'ın hamlesiyle ürün bütünlüğü.

### C.5 "Bilanço Günü Tercümanı" — FR bildiriminden dakikalar içinde karne kartı

- **Ne:** `finansal_rapor` tipli KAP bildirimi düşünce: satış, net kâr, marj değişimini çıkar (çeyreklik + yıllık kıyas), sade Türkçe "karne günü" kartı üret, hisseyi izleyenlere anında bildir. "Beklentinin altı/üstü" deme (konsensüs verimiz yok) — "geçen yılın aynı çeyreğine göre net kâr %X" nesnel kıyas dili.
- **Neden şimdi (veri):** 2Ç 2026 bilanço sezonu **Temmuz sonunda başlıyor** — yılın en yoğun trafik dalgası kapıda. Fintables bilançoyu tablo olarak anında verir ama anlatmaz; Midas Rehberi genel özet. Strateji raporu bunu Faz 4'e koymuştu; KAP sınıflandırıcı + özet boru hattı kurulduğu için giriş maliyeti düştü.
- **Altyapı bağlantısı (~%50 hazır):** sınıflandırıcı FR'yi ayırıyor; `disclosureDetail.flatData` FR'lerde özet finansal kalemler taşıyabiliyor (demo veride doğrulanmalı — data-pipeline ajanına ilk iş); tam tablo gerekiyorsa `downloadAttachment` + sınırlı parse (ilk 100 likit hisse pilotu). Özet şablonu kap-ozet.ts'e yeni tip.
- **Efor:** 2 hafta pilot (100 hisse, yalnız gelir tablosu 3 kalemi). Tam normalizasyon bilinçli olarak kapsam dışı (Fintables'ın hendeğine girmiyoruz — sadece anlatıyoruz).
- **Etki:** Bilanço haftalarında izleme-bildirim döngüsünün en güçlü hali; "karne günü" kavramı markalaşabilir. Sezon Ağustos'ta — pilot yetişirse gerçek trafik testi.
- **Kapattığı boşluk:** Boşluk 1'in en derin katmanı (strateji raporu 4.2'de skor 17 ile "bilanço dönemi AI özeti").

### Bilinçli girilmeyen radikal yönler (değerlendirildi, elendi)

- **Sosyal/copy-trading** (eToro modeli): moderasyon + SPK riski strateji raporundaki gerekçelerle güncelliğini koruyor; Robinhood'un sosyal platform verisi bile regülasyonu bizden hafif bir pazarda. Girilmiyor.
- **AI ajan portföyleri** (eToro "Agent Portfolios"): Türkiye'de III-37.1 kapsamında lisanssız savunulamaz — kategorik hayır.
- **VİOP/opsiyon eğitimi:** Midas VİOP'u açtı, eğitim boşluğu gerçek; ama persona'mız (yeni başlayan) için kaldıraçlı ürüne köprü kurmak güven konumlandırmasıyla çelişiyor. İzlemede.
- **Yabancı yatırımcı için İngilizce KAP özeti:** boru hattına çeviri katmanı eklemek ucuz; ama dağıtım kanalımız yok ve persona dışı. Backlog'a not (B2B API'nin — strateji raporu 4.3 — bir müşteri segmenti olabilir).

---

## BÖLÜM D — Teknik Borç (Track 1 sonrası; bilinen açık işler hariç)

Tarama: 13 Temmuz 2026, `main` @ `295c553`. Temiz çıkanlar: TypeScript `strict: true` ve kodda sıfır `any` ✅; sıfır `console.log` kalıntısı, sıfır TODO/FIXME ✅; `npm run build` başarılı (tüm route'lar derleniyor, ISR yapılandırmaları doğru) ✅.

### D.1 🔴 Test altyapısı hiç yok
`package.json`'da test script'i yok, repoda tek test dosyası yok. Finansal hesap yoğunluğu (risk faktörleri, Wilder RSI, değer-ağırlıklı karne, KAP sınıflandırıcı, rate-limit penceresi) göz önünde — regresyonlar ancak kullanıcıda patlayınca görünüyor (A.1 bunun kanıtı). **Öneri:** Vitest + yalnız saf fonksiyon testleri (route testi değil): `lib/kap-ozet.ts siniflandir()` için agent-memory'deki 9 gerçek kalibrasyon vakası hazır fixture; RSI/beta için GÖREV 8 doğrulama tablosundaki 8 hisse değeri; `rate_limit_hit` pencere mantığı. ~1 gün, en yüksek getirili borç ödemesi.

### D.2 🔴 Hata gözlemlenebilirliği yok (A.1'in kök nedeni)
Sentry/log-drain hâlâ kurulu değil; cron'lar `if (!res.ok) return []` deseniyle hatayı yutuyor ([kap-bildirimleri/route.ts:49](../../app/api/cron/kap-bildirimleri/route.ts) dahil). KAP boru hattının 6 gün ölü kalması bu yüzden görünmez kaldı. **Öneri:** (a) Sentry (ücretsiz katman yeterli) yalnız API route'lara; (b) cron yanıtlarına `hata` sayacı + GitHub Actions'ta yanıt gövdesinde `"hata":[1-9]` grep'iyle kırmızı işaretleme — sıfır bağımlılıkla "sessiz başarısızlık" sınıfını bitirir.

### D.3 🟡 Repoda unutulmuş yedek dosyalar
`app/profile/page.tsx.bak` ve `app/hisseler/page.tsx.bak` commit'lenmiş durumda (ikincisi `as any` içeriyor — kod taramalarında gürültü). `components/WaitlistCTA.tsx` hiçbir yerden import edilmiyor (landing'den Mayıs'ta kaldırılmıştı). **Öneri:** üçünü sil; `.gitignore`'a `*.bak` ekle.

### D.4 🟡 Bağımlılık güncelliği
- `@anthropic-ai/sdk` 0.90.0 → 0.111.0 (21 minor geride; yeni model/feature parametreleri için güncellenmeli — düşük risk).
- `next` 16.2.3 → 16.2.10 (patch serisi; güvenlik yamaları içerebilir, alınmalı).
- `@supabase/supabase-js` 2.103 → 2.110, `resend` 6.12 → 6.17: rutin minor.
- `sanity` 5 → 6 major: **dokunma** (studio çalışıyor; major migration ayrı iş).
- `styled-components` yalnız Sanity studio zinciri için duruyor (uygulama kodu Tailwind) — kaldırılamaz, not olarak kalsın.

### D.5 🟡 Mimari küçük borçlar (Track 1'de doğan)
- Cron tetikleyici tutarsızlığı yeniden başladı: GÖREV 7 "tek tetikleyici GitHub Actions" demişti; fon-snapshot Vercel cron'a kondu (`vercel.json`). Çift tetikleme yok (tek kaynak) ama iki ayrı zamanlama düzlemi yönetim yükü. Karar netleşmeli: ya hepsi GH Actions ya `vercel.json` yorumla gerekçelendirilsin.
- `components/lib/supabase.ts` düz `createClient` (localStorage) kullanıyor; `.claude/CLAUDE.md` client için `createBrowserClient` diyor — OAuth callback SSR cookie yazarken client localStorage okuyor (iki ayrı oturum deposu). A.4'teki oturum yarışı şüphesiyle birlikte ele alınmalı: `@supabase/ssr` browser client'a geçiş tek dosyalık değişiklik ama tüm oturumları bir kez düşürür — planlı yapılmalı.
- `/api/analiz`'in veri-servisi olarak kullanımı (A.7) — endpoint sorumluluk ayrımı.

### D.6 Bundle gözlemi
Turbopack build sorunsuz; en ağır client sayfaları portföy (1200+ satır, recharts) ve dashboard. `recharts` tek grafik kütüphanesi olarak makul; ek grafik kütüphanesi eklenmemeli (mevcut tutarlılık iyi). Acil bundle borcu yok.
