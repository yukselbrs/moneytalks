# Birleşik Takvim Modülü — İmplementasyon Logu

**Durum:** DEVAM EDİYOR · Başlangıç: 25 Tem 2026
Tek kaynak: yeni oturum önce en alttaki **ŞU AN NEREDEYİM** paragrafını okur.

**Görev:** Dört alt takvim tek sayfa/menü altında sekmeli sunulacak — Ekonomik, Bilanço, Temettü, Halka Arz (sonuncusu mevcut, yeniden yazılmayacak; entegre edilecek).

## TODO

### FAZ 0 — Resume protokolü
- [x] Bu log dosyası oluşturuldu
- [x] `hisse-denetim-halka-arz-takvimi-log` + `launch-checklist-2026` okundu (halka arz şema/cron/UI pattern'i REUSE edilecek)

### FAZ 1 — Keşif
- [x] 1.1 Halka Arz modülü: şema, cron, route, UI, lifecycle
- [x] 1.2 Menü yapısı + mevcut `/takvim` sayfası + redirect planı
- [x] 1.3 Hisse/bilanço/KAP veri kaynakları

### FAZ 2 — Veri kaynağı araştırması
- [x] 2.1 Ekonomik takvim: kaynak karşılaştırması + ToS + seçim (K-TK1)
- [x] 2.2 Bilanço açıklama tarihleri: **KAP "Finansal Takvim" konusu** bulundu ve canlı doğrulandı (K-TK2)
- [x] 2.3 Temettü: **KAP "Kar Payı Dağıtımı" konusu** bulundu ve canlı doğrulandı (K-TK3)
- [x] 2.4 Halka Arz — araştırma YOK (mevcut modül entegre edilecek)

### FAZ 3 — Şema
- [ ] 3.1 `sirket_takvim_etkinlikleri` (bilanço+temettü ortak, event_type ayrımı)
- [ ] 3.2 Ekonomik takvim tablosu
- [ ] 3.3 Migration + commit

### FAZ 4 — Birleşik UI
- [ ] 4.1 Nav: tek "Takvim" öğesi, Halka Arz onun altına + 301 redirect
- [ ] 4.2 Sekmeler + ortak tarih navigasyonu
- [ ] 4.3 Önem derecesi görsel vurgu
- [ ] 4.4 Satır→detay yönlendirmeleri (hisse / döviz-emtia)
- [ ] 4.5 Mobil
- [ ] 4.6 Tema uyumu

### FAZ 5 — Cron
- [ ] 5.1 Ekonomik (günlük + olay saatine yakın sık kontrol)
- [ ] 5.2 Bilanço/Temettü KAP cron + bilanço modülü tetikleme
- [ ] 5.3 Halka arz cron'una DOKUNMA
- [ ] 5.4 Hata loglama

### FAZ 6 — AI/KAP ilişkilendirme (opsiyonel)
- [ ] 6.1 Hisse AI analizine yaklaşan bilanço/temettü notu
- [ ] 6.2 Ekonomik olay → döviz/emtia AI context

### FAZ 7 — Test · FAZ 8 — SEO · FAZ 9 — Kapanış
- [ ] 7.1-7.5 · [ ] 8.1-8.2 · [ ] 9.1-9.3

---

## FAZ 1 — KEŞİF BULGULARI (25 Tem 2026)

### 1.1 Halka Arz modülü (REUSE edilecek pattern)
- **Tablo:** `halka_arzlar` — `kod` UNIQUE, `durum` lifecycle CHECK (`talep_toplaniyor` → `arz_tamamlandi` → `islem_goruyor`), yapısal alanlar + izahname-derin nullable alanlar + `kaynak_linkleri` JSONB. RLS: **herkes SELECT, yazma yalnız service role** (snapshot deseni).
- **Cron:** `/api/cron/halka-arz`, günde 5 kez (`18 5,8,11,14,17`), `verifyCronAuth`. Adımlar: kaynak→upsert / talep_bitis geçince arz_tamamlandi / Yahoo fiyat sinyaliyle islem_goruyor / finansal zenginleştirme. Kaynak erişilemezliği **yumuşak uyarı** (`kaynakUyari`), `hata` yalnız DB yazma hatasında.
- **Route/UI:** `/halka-arz` (liste, durum rozetli kartlar) + `/halka-arz/[kod]` (sekmeli detay: "Halka Arz Bilgileri" + "Forum" placeholder). API: `/api/halka-arz` (aktif/geçmiş ayrımı) + `/api/halka-arz/[kod]`.
- **Ders:** lifecycle + "kaynak erişilemezse yumuşak uyarı" + service-role-write/anon-read deseni yeni takvimlerde aynen kullanılacak.

### 1.2 Menü + MEVCUT `/takvim` sayfası — **KRİTİK BULGU**
`/takvim` sayfası **zaten var** (340 satır) ve şu an:
- Aylık takvim ızgarası (yıl/ay/seçili gün) + gün-detay paneli + mobil/masaüstü ayrımı var.
- **Dört sekme etiketi zaten yazılı** (satır 125): `["Ekonomik Takvim", "Bilanço Takvimi", "Temettü Takvimi", "Halka Arz Takvimi"]`.
- **AMA yalnız 2 sekmenin verisi var:**
  - `Ekonomik Takvim` → `/api/takvim` (Finnhub + hardcoded TCMB/FED listesi)
  - `Temettü Takvimi` → `/api/temettu` (Yahoo dividends, **50 hardcoded ticker**)
- 🐛 **BUG:** `Bilanço Takvimi` ve `Halka Arz Takvimi` sekmelerinin kendi veri yolu YOK → render `seciliEtkinlikler`'e düşüyor, yani **bu iki sekme ekonomik etkinlikleri gösteriyor** (kullanıcıyı yanıltır).
- 🐛 **BUG-2:** `FINNHUB_API_KEY` `.env.local`'de **YOK** → Finnhub çağrısı boş dönüyor; ekonomik takvim fiilen yalnız 20 satırlık hardcoded TCMB/FED listesinden besleniyor (canlı kanıt: 20-31 Tem aralığı için yalnız 2 etkinlik döndü).
- **Menü:** `AppShell` NAV_ITEMS'ta hem `Takvim` (`/takvim`, KİŞİSEL grubu) hem `Halka Arz` (`/halka-arz`, PİYASA grubu) ayrı öğeler. Görev gereği Halka Arz, Takvim'in altına taşınacak + `/halka-arz` → `/takvim?sekme=halka-arz` **301**.
- **Sonuç:** Sıfırdan sayfa kurulmayacak; mevcut ızgara/gün-detay iskeleti korunup 4 sekmeye gerçek veri bağlanacak.

### 1.3 Veri kaynakları (tutarlılık için)
- **KAP:** `lib/kap-kaynak.ts` — kap.org.tr açık JSON API (`byCriteria` + `attachment-detail`), tarayıcı UA + Referer zorunlu, WAF ~6sn'de bağlantı düşürüyor. `kap_bildirimleri` tablosu (1064 satır): `disclosure_index`, `ticker`, `tickerlar[]`, `bildirim_tipi`, `konu`, `ozet_tek_cumle`, `kap_zamani`, `ham_detay`. **Bilanço + temettü takvimleri bu akıştan beslenecek** (aynı kaynak = tutarlılık).
- **Bilanço:** `bilanco_snapshots` (TradingView, günlük cron) + `/api/finansal/[ticker]` (İş Yatırım MaliTablo — yeni kotasyonlar için). Bilanço Takvimi "açıklandı" durumuna geçince bu cron'u tetikleyecek.
- **Temettü:** şu an `/api/temettu` Yahoo `events=dividends`, 50 hardcoded ticker — kapsam dar, KAP'a taşınacak.

---

## FAZ 2 — VERİ KAYNAĞI KARARLARI (25 Tem 2026)

### 🔑 Ortak keşif: KAP konu (subject) filtresi
`kap.org.tr/tr/bildirim-sorgu` sayfasının flight payload'ında **199 konu → `subjectOid`** haritası var. `byCriteria` API'si `subjectList: [oid]` ile filtreleyebiliyor — yani KAP'tan **konu bazlı** çekim mümkün. İlgili OID'ler:

| Konu | class | subjectOid |
|---|---|---|
| **Finansal Takvim** (şirket-beyanlı bilanço tarihleri) | DG | `4028328c69a8545e0169ceb480335e5c` |
| **Kar Payı Dağıtımı** (temettü) | ODA | `4028328d5988e2630159d5fb51c81fe6` |
| Finansal Rapor (fiili açıklama) | FR | `4028328c594bfdca01594c0af9aa0057` |
| Kar Payı Avansı Ödemesi | ODA | `8aca490d4f64d803014f6523fdbd04c1` |

⚠️ **Sunucu limiti:** `byCriteria` geniş tarih aralığında **HTTP 500** veriyor (365 gün patladı, 30-180 gün çalıştı) → cron **pencereli** çekmeli (≤90 gün dilimler).

### K-TK2 — Bilanço Takvimi kaynağı: KAP "Finansal Takvim" ✅
- **Kanıt:** son 30 günde 27 bildirim (TATGD, TCELL, TKNSA, CIMSA…).
- **İçerik (TCELL idx=1636239):** tablo satırları `dönem sonu → açıklanma tarihi` çifti veriyor:
  `31/03/2026 → 11/05/2026` (Q1), `30/06/2026 → 13/08/2026` (Q2). Yani **şirketin kendi beyan ettiği** bilanço açıklama tarihi.
- **Karar:** Bilanço Takvimi = (a) KAP "Finansal Takvim"den **şirket-beyanlı tarih** (`tarih_kesin=false`, şirket güncelleyebilir) + (b) KAP "Finansal Rapor" bildiriminden **fiilen açıklandı** (`tarih_kesin=true`, `/hisse/[ticker]` bilanço bölümüne link) + (c) beyan yoksa **yasal son tarih** tahmini (konsolide/konsolide-olmayan ayrımı: örn. 2026/Q2 → 10 Ağu solo, 19 Ağu konsolide).
- İkincil derleyicilere (İş Yatırım/Fintables) **gerek kalmadı** — birincil kaynak zaten erişilebilir; ToS riski de yok (KAP kamuyu aydınlatma platformu, zaten kullandığımız kaynak).

### K-TK3 — Temettü Takvimi kaynağı: KAP "Kar Payı Dağıtımı" ✅
- **Kanıt:** son 180 günde **1181 bildirim**; 19 Nis–19 May aralığında tek başına 281 (temettü sezonu).
- **İçerik alanları (canlı doğrulandı):** Karar Tarihi · Genel Kurul Tarihi · **Nakit Kar Payı Ödeme Şekli** (Peşin/Ödenmeyecek/Taksitli) · Para Birimi · **1 TL Nominal Değerli Paya Ödenecek Nakit Kar Payı — Brüt/Net** · Stopaj Oranı · **Nakit Kar Payı Ödeme Tarihi** (ödeme yapan örnek: BOBET idx=1608770, Peşin, Net 465.768,2).
- **Karar:** mevcut `/api/temettu` (Yahoo, **50 hardcoded ticker**) yerine KAP tabanlı kaynak. Verim (%) güncel fiyattan hesaplanacak (`hisse_snapshots`).
- **Arşiv kararı:** geçmiş temettüler **saklanacak** (silinmeyecek) — tablo zaten tarih bazlı; "son 2 yıl" filtresi UI tarafında yapılır. Neden: geçmiş temettü, verim trendi ve AI analiz bağlamı için değerli, maliyeti düşük.
- ⚠️ **Parser riski:** alanlar HTML tablo içinde etiket→değer; bildirimlerin çoğu "Ödenmeyecek" (kâr dağıtmama kararı) → parser **yalnız ödeme yapanları** takvime almalı, aksi halde takvim gürültüyle dolar.

### K-TK1 — Ekonomik Takvim kaynağı (KARAR + BARIŞ AKSİYONU)
Mevcut durum: kod Finnhub'a bağlı ama **`FINNHUB_API_KEY` env'de yok** → canlı veri hiç gelmiyor; sayfa yalnız 20 satırlık hardcoded TCMB/FED listesinden besleniyor.

| Kaynak | Kapsam | Ücret/limit | ToS (net-yasak testi) | Değerlendirme |
|---|---|---|---|---|
| **Resmî MB takvimleri** (TCMB, Fed/FOMC, ECB, BoE, BoJ) + TÜİK yayın takvimi | Yüksek-önem olayların tamamı, yıl başında ilan | Ücretsiz, sınırsız | Kamuya açık resmî duyuru — **net yasak yok** | ✅ En güvenilir; parça parça, birleştirme gerekir |
| Finnhub economic calendar | Geniş (küresel) | Ücretsiz katman var; **bu endpoint premium olabilir** (doğrulanamadı) | Net yasak bulunamadı | ⚠️ Anahtar + katman doğrulaması gerekiyor |
| Financial Modeling Prep | Geniş | Freemium | Net yasak bulunamadı | Yedek aday |
| TradingEconomics | Çok geniş | Ücretli | — | Ticarileşince değerlendirilir |

- **KARAR:** **Birincil = resmî merkez bankası + TÜİK takvimleri** (kod içinde veri olarak; yıl başında güncellenir, şu anki `MERKEZ_BANKASI_TAKVIM` deseni genişletilerek — TCMB PPK, Fed FOMC, ECB, BoE, BoJ, TÜİK TÜFE/ÜFE, TÜİK GSYH, ABD TÜFE/tarım-dışı istihdam). Sebep: sıfır maliyet, sıfır lisans riski, yüksek-önem olayların hepsini kapsıyor, launch'a 15 gün varken dış bağımlılık eklemiyor.
- **Ek (opsiyonel):** Barış bir Finnhub/FMP anahtarı sağlarsa "beklenti/gerçekleşen değer" alanları API'den zenginleştirilir — kod zaten Finnhub entegrasyonuna sahip, yalnız `FINNHUB_API_KEY` eklenmesi yeterli. Anahtar yoksa modül **yine çalışır** (yalnız beklenti/gerçekleşen boş kalır).
- 📌 **İleriye not:** Şirket kurulup ticarileştiğinde bu karar gözden geçirilmeli — o noktada ücretli bir sağlayıcının ToS'u ve lisansı yeniden değerlendirilecek.
- **Saat dilimi:** kaynak GMT/EST verirse **TRT (UTC+3)**'e çevrilecek; mevcut `/api/takvim` Finnhub dalında `timeZone: "Europe/Istanbul"` ile bunu zaten yapıyor — aynı yardımcı yeni kayıtlarda da kullanılacak.

---

## Kronoloji

**25 Tem 2026 — FAZ 0 + FAZ 1.** Log kuruldu; halka arz logu + launch checklist okundu. Keşifte mevcut `/takvim` sayfasının 4 sekme etiketiyle zaten var olduğu, ancak 2 sekmenin verisiz olup ekonomik etkinliklere fallthrough yaptığı ve Finnhub anahtarının hiç tanımlı olmadığı tespit edildi (iki gerçek bug). Halka arz modülünün lifecycle + cron + RLS deseni yeni takvimler için şablon olarak seçildi.

---

## ŞU AN NEREDEYİM

**25 Tem 2026 — FAZ 0, 1 ve 2 bitti; sıradaki FAZ 3 (şema).**

Keşifte iki gerçek bug bulundu (Bilanço + Halka Arz sekmeleri ekonomik etkinlik gösteriyor; Finnhub anahtarı hiç yok). FAZ 2'de **KAP konu-filtresi (subjectOid)** keşfedildi: bilanço takvimi ve temettü için birincil, ücretsiz, lisans-riski olmayan kaynak bulundu ve **canlı doğrulandı** (Finansal Takvim 27 bildirim/30 gün; Kar Payı 1181/180 gün, alanlar teyitli). Ekonomik takvimde resmî MB/TÜİK takvimleri birincil seçildi; Finnhub/FMP anahtarı **opsiyonel zenginleştirme** olarak Barış'a bırakıldı.

**Sonraki oturum sırası:**
1. **FAZ 3 şema:** `sirket_takvim_etkinlikleri` (event_type: `bilanco_aciklama` | `temettu`; ortak: ticker/tarih/tarih_kesin/durum; temettü-özel nullable: brut_tutar, net_tutar, odeme_tarihi, genel_kurul_tarihi, stopaj; bilanço-özel: donem `2026/Q2`, kaynak_disclosure_index) + `ekonomik_takvim` (ulke, olay, tarih_saat TRT, onem, onceki/beklenti/gerceklesen). `halka_arzlar` tablosuna **DOKUNMA**.
2. **FAZ 4 UI:** mevcut `/takvim` iskeleti korunarak 4 sekmeye gerçek veri; nav'da tek "Takvim" + `/halka-arz` → `/takvim?sekme=halka-arz` **301**.
3. **FAZ 5 cron:** KAP konu-bazlı çekim (≤90 gün pencereli — 500 limiti), bilanço "açıklandı"da bilanço cron'u tetikleme, hata loglama.
4. FAZ 6-9.

**Barış aksiyonu:** ekonomik takvimde beklenti/gerçekleşen değerleri isteniyorsa `FINNHUB_API_KEY` (veya FMP) sağlanmalı; sağlanmazsa modül resmî takvimlerle çalışır.
