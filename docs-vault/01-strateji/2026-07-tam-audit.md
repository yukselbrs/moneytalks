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
