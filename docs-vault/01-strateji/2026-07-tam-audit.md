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
