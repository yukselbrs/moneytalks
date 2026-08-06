# Birleşik Takvim Modülü — İmplementasyon Logu

**Durum:** TAMAMLANDI · 25 Tem 2026 → 5 Ağu 2026 · Production'da canlı
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

### FAZ 3 — Şema ✅
- [x] 3.1 `sirket_takvim_etkinlikleri` (bilanço+temettü ortak, `event_type` ayrımı)
- [x] 3.2 `ekonomik_takvim` tablosu
- [x] 3.3 Migration **uygulandı** (MCP) + `supabase/migrations.sql`'e işlendi + commit

### FAZ 4 — Birleşik UI ✅
- [x] 4.1 Nav: tek "Takvim" öğesi (Halka Arz nav öğesi kaldırıldı, sekme oldu)
- [x] 4.2 Dört sekme + `?sekme=` URL senkronu + ortak tarih navigasyonu
- [x] 4.3 Önem derecesi görsel vurgu (yüksek önemli satır sol kenarlık + koyu metin)
- [x] 4.4 Satır→detay: `/hisse/[ticker]`, `/halka-arz/[kod]`, `/doviz-maden/[kod]`
- [x] 4.5 Mobil (kart görünümü, `useMediaQuery`)
- [x] 4.6 Tema uyumu (mevcut kart/tablo dili korundu)

### FAZ 5 — Cron ✅
- [x] 5.1 Ekonomik: ForexFactory + Fed + TR kural üreteci, günde 3 kez
- [x] 5.2 Bilanço/Temettü KAP cron + bilanço modülü tetikleme (koşu başına tavan 20)
- [x] 5.3 Halka arz cron'una DOKUNULMADI
- [x] 5.4 Hata loglama: `hataYakala` + yanıtta `hata`/`kaynakUyari` + teşhis sayaçları

### FAZ 6 — AI/KAP ilişkilendirme
- [ ] 6.1-6.2 YAPILMADI (opsiyoneldi, launch kapsamı dışında bırakıldı)

### FAZ 7 — Test ✅ · FAZ 8 — SEO ✅ · FAZ 9 — Kapanış ✅
- [x] 7.x Dört sekme production'da gerçek veriyle doğrulandı (aşağıda)
- [x] 8.1 `/takvim` meta'sı dört takvimi anlatıyor (eskiden yalnız "Ekonomik Takvim")
- [x] 8.2 Sitemap: öncelik 0.6→0.9, üç sekme URL'i eklendi
- [x] 9.x Log kapatıldı + CLAUDE.md güncellendi

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

### FAZ 3 — ŞEMA (uygulandı, 25 Tem 2026)

**`sirket_takvim_etkinlikleri`** — bilanço + temettü TEK tabloda (`event_type`):
- Ortak: `ticker`, `tarih`, `tarih_kesin` (beyan/tahmin ↔ kesin), `durum` (`bekleniyor`|`aciklandi`)
- Bilanço: `donem` ('2026/Q2'), `donem_bitis`
- Temettü (nullable): `brut_tutar`, `net_tutar`, `stopaj_orani`, `para_birimi`, `odeme_sekli`, `genel_kurul_tarihi`, `karar_tarihi`
- Kaynak izi: `kaynak`, `kap_disclosure_index`, `kap_link`, `ham_alanlar` JSONB (parse edilen etiket→değer — denetim izi)

**Eşsizlik kararı (önemli):** `COALESCE(donem, tarih::TEXT)` ifadeli tek indeks **IMMUTABLE olmadığı için Postgres reddetti** (date→text cast DateStyle'a bağlı). Doğru tasarım zaten **tip başına kısmi indeks**:
- `(ticker, donem) WHERE event_type='bilanco_aciklama'` — şirket beyan tarihini güncelleyebilir, dönem sabit kalır → upsert doğru satırı günceller.
- `(ticker, tarih) WHERE event_type='temettu'` — aynı şirket yıl içinde birden çok ödeme yapabilir.

**`ekonomik_takvim`** — `ulke_kod`, `ulke_bayrak`, `olay`, `tarih`, `saat` (**TRT**), `onem` (Yüksek/Orta/Düşük CHECK), `onceki`/`beklenti`/`gerceklesen`, `ilgili_enstruman` (satır→`/doviz-maden/[kod]` yönlendirmesi için), `kaynak`. Eşsiz: `(ulke_kod, olay, tarih)`.

**RLS:** ikisinde de herkes SELECT, yazma yalnız service role (snapshot/halka-arz deseni). Doğrulama: anon SELECT 200 ✓. `halka_arzlar`'a **dokunulmadı**.

---

## Kronoloji

**25 Tem 2026 — FAZ 0 + FAZ 1.** Log kuruldu; halka arz logu + launch checklist okundu. Keşifte mevcut `/takvim` sayfasının 4 sekme etiketiyle zaten var olduğu, ancak 2 sekmenin verisiz olup ekonomik etkinliklere fallthrough yaptığı ve Finnhub anahtarının hiç tanımlı olmadığı tespit edildi (iki gerçek bug). Halka arz modülünün lifecycle + cron + RLS deseni yeni takvimler için şablon olarak seçildi.

---

## ŞU AN NEREDEYİM

**[GEÇMİŞ NOT — 25 Tem 2026]** Aşağıdaki plan FAZ 4/5 öncesine aittir. FAZ 2'de seçilen KAP "Finansal Takvim" kaynağı sonradan kullanılamaz çıktı; güncel durum için en alttaki KAPANIŞ bölümüne bak (K-TK4).

Keşifte iki gerçek bug bulundu (Bilanço + Halka Arz sekmeleri ekonomik etkinlik gösteriyor; Finnhub anahtarı hiç yok). FAZ 2'de **KAP konu-filtresi (subjectOid)** keşfedildi: bilanço takvimi ve temettü için birincil, ücretsiz, lisans-riski olmayan kaynak bulundu ve **canlı doğrulandı** (Finansal Takvim 27 bildirim/30 gün; Kar Payı 1181/180 gün, alanlar teyitli). Ekonomik takvimde resmî MB/TÜİK takvimleri birincil seçildi; Finnhub/FMP anahtarı **opsiyonel zenginleştirme** olarak Barış'a bırakıldı.

**Sonraki oturum sırası:**
1. **FAZ 5 cron ÖNCE (veri olmadan UI test edilemez):** `/api/cron/takvim` — KAP `subjectList` ile (a) Finansal Takvim → `bilanco_aciklama` satırları, (b) Kar Payı Dağıtımı → `temettu` satırları (yalnız **ödeme yapanlar**; "Ödenmeyecek" olanlar takvime girmez). Pencere ≤90 gün (byCriteria 500 limiti). Ekonomik takvim seed'i: resmî MB/TÜİK tarihleri (mevcut `MERKEZ_BANKASI_TAKVIM` genişletilerek `ekonomik_takvim` tablosuna).
2. **FAZ 4 UI:** mevcut `/takvim` iskeleti korunarak 4 sekmeye gerçek veri; nav'da tek "Takvim" + `/halka-arz` → `/takvim?sekme=halka-arz` **301**.
3. **FAZ 5 cron:** KAP konu-bazlı çekim (≤90 gün pencereli — 500 limiti), bilanço "açıklandı"da bilanço cron'u tetikleme, hata loglama.
4. FAZ 6-9.

**Barış aksiyonu:** ekonomik takvimde beklenti/gerçekleşen değerleri isteniyorsa `FINNHUB_API_KEY` (veya FMP) sağlanmalı; sağlanmazsa modül resmî takvimlerle çalışır.

---

## KAPANIŞ — 5 Ağu 2026

### K-TK4: KAP "Finansal Takvim" konusu KULLANILAMAZ (önemli düzeltme)

FAZ 2'de bu konu "bilanço takviminin birincil kaynağı" olarak seçilmişti. **Bu karar yanlış çıktı ve iptal edildi.**

Canlı teşhis (83 bildirim, hem yerelde hem production koşusunda):
`liste=83 tickerli=83 govde=83 tabloluGovde=83 eslesme=0`

Yani konu OID'i doğru, bildirimler geliyor, gövde geliyor, şablon başlığı
(`Dönem Başlangıç Tarihi | Dönem Bitiş Tarihi | Planlanan KAP'ta İlan Tarihi`)
83/83 bildirimde var — **ama değer hücreleri boş.** Tarih ne hücre metninde
ne de ham satır HTML'inde çıkıyor. KAP web arayüzünde görünen değerler
`attachment-detail` ucundan gelmiyor. Şirketin **beyan ettiği planlanan**
bilanço tarihlerine bu API üzerinden erişilemiyor.

**Sonuç:** Bilanço takvimi artık **fiilen açıklanan raporlardan** kuruluyor
(KAP `disclosureType === "FR"`). Her satır = bir şirketin bir dönem raporunu
KAP'ta yayınladığı **kesin** tarih. Tahmini/uydurma tarih üretilmiyor.
`durum` alanı `bekleniyor`/`aciklandi` ayrımını taşımaya devam ediyor; beyan
edilen tarihler ileride erişilebilir olursa `bekleniyor` satırı olarak eklenip
FR geldiğinde `aciklandi`ya çevrilecek — üstüne-yaz mantığı buna hazır.

### K-TK5: KAP `period` alanı ÇEYREK numarasıdır, ay değil

`period: "2", year: 2026` = 2026 **2. çeyrek**. Ay numarası sanılıp
`{3:03, 6:06, 9:09, 12:12}` haritası yazılmıştı; 466 FR bildiriminin tamamı
"dönemsiz" diye atlanıyordu. Doğrusu: `1→03, 2→06, 3→09, 4→12`.
Detay bildiriminde ayrıca `MT/HZ/EY/YS` kısaltmaları görülebiliyor (haritada ikisi de var).
`year` bazı bildirimlerde null; o durumda dönem yılı yayın tarihinden türetiliyor
(rapor her zaman dönem sonundan sonra yayınlanır).

### K-TK6: KAP WAF bütçesi — adım sırası kritik

FR liste çağrısı her koşuda 500 dönüyordu. Pencere boyu (80/15/10/4 gün)
veya konu OID'i **değildi**: cron önce "Finansal Takvim" adımında 83, sonra
temettüde 120'ye kadar detay isteği yapıyor; FR'ye sıra geldiğinde KAP WAF'ı
**aynı çağrı içinde** IP'yi kapatıyordu. Ölü adım kaldırılıp FR öne alınınca
`kaynakUyari: []` oldu.

**Kural:** KAP'a giden ucuz liste çağrıları, pahalı detay çekimlerinden ÖNCE yapılmalı.

### K-TK7: Temettü tablosu MATRİS — ardışık `<td>` çiftleme yanlış

"Nakit Kar Payı Ödeme Tutar ve Oranları" tablosu başlık satırı + pay grubu
başına bir veri satırı. Ardışık `<td>` çiftleme başlığı değerle eşliyor ve
brüt tutar olarak `"1 TL Nominal..."` etiketinden **1** üretiyordu. Bu yüzden
DB'deki 28 satırın parasal alanları güvenilmezdi (`brut=1` hepsinde,
`SELEC net=-379,8`, `NUHCM net=746,3`). Tarih ve ödeme şekli doğru olduğu
için korundu, **tutarlar NULL'landı** — finans ürününde yanlış temettü tutarı
boş tutardan kötüdür. Düzeltilmiş matris parser'ı 45 günlük pencereye giren
yeni kararlarda doğru tutarı yazıyor; pencere dışındaki eski satırlar boş kalır.

### Production doğrulaması (5 Ağu 2026, GitHub Actions koşusu)

```
bilanco:  { aciklandiIsaretlenen: 123, snapshotYazilan: 10, tetikAtlanan: 94,
            toplam: 3191, fr: 466, donemsiz: 0 }
temettu:  { yeni: 0, guncellenen: 0 }
ekonomik: { yeni: 0, guncellenen: 0 }
hata: 0   kaynakUyari: []   sure_ms: 47260
```

DB: `sirket_takvim_etkinlikleri` 114 bilanço satırı (2026/Q2: 110, Q1: 3, 2025/Q4: 1),
28 temettü satırı; `ekonomik_takvim` 82 satır (fed 25 / resmi-kural 24 / resmi-tcmb 16 / forexfactory 17).
UI: dört sekme de production'da gerçek veri gösteriyor — Bilanço sekmesi
ASELS/AYGAZ/TUPRS 2026/Q2 açıklamaları + KAP bildirim linkleri.

### Planlanandan SAPMALAR

1. **`/halka-arz` 301 redirect YAPILMADI.** Plan nav birleştirme + 301'di.
   Nav birleştirildi (sidebar'da tek "Takvim"), ama liste sayfası **yaşıyor**:
   sitemap'te 0.9 öncelikle indeksli ve "aktif/geçmiş arz" görünümünü ay-kapsamlı
   takvim veremiyor. Sekmeden `Tüm halka arzları listele →` ile köprü kuruldu.
   Detay sayfasının geri linkleri `/takvim?sekme=halka-arz`e çevrildi.
2. **FAZ 6 (AI entegrasyonu) yapılmadı** — opsiyoneldi, launch kapsamı dışı.
3. **`/api/temettu` silindi** — Yahoo'dan GEÇMİŞ temettüleri çekiyordu, ileriye
   dönük takvimde yanlış kaynaktı.

### Onarım turu — 6 Ağu 2026

Kapanış sonrası açık kalan her madde tek tek ele alındı.

**K-TK8: Takvimin %42'si BIST hissesi bile değildi.** KAP'a FR bildiren her
kurum hisse değil: varlık kiralama şirketleri (DGRVK, BRGFK), faktoring
(AKDFA, ALJF), tahvil ihraççıları. 200 ticker'ın 85'i bunlardı. Üç ayrı
soruna yol açıyordu: (a) satırlar kullanıcıya anlamsız, (b) satır tıklaması
`/hisse/[ticker]` 404, (c) İş Yatırım'da karşılıkları olmadığı için bilanço
snapshot kuyruğunun **başını kalıcı tıkıyorlardı** — kuyruk hep aynı ilk 20'yi
deniyor, hiçbiri yazılamıyor, arkadakiler sıra alamıyordu (`tetikAtlanan`
99→72→65 diye takılıyordu). `bist-companies.json` + `yeniKotasyonOverlay`
evrenine süzüldü, 83 çöp satır silindi. `tetikAtlanan` artık **0**.

**K-TK9: Snapshot tetiklemesi kendini onarmıyordu.** Tetikleme yalnız "bu
koşuda değişen satırlar"a bakıyordu; tavan (20) yüzünden atlananlar bir daha
HİÇ denenmiyordu, çünkü satır bir kez yazıldıktan sonra imzası sabitleniyor.
İlk koşuda 94 ticker atlandı, 66'sı kalıcı snapshot'sız kaldı. Artık takvimde
satırı olup `bilanco_snapshots`'ta kaydı olmayan ticker'lar da kuyruğa
ekleniyor — kuyruk koşu koşu eriyor.

**K-TK10: FR tekilleştirme yoktu → cron idempotent değildi.** Aynı
ticker+dönem için birden fazla FR bildirimi olabiliyor (düzeltme/revize
rapor); cron her koşuda aynı satırı farklı tarihlerle üst üste yazıyordu.
Takvim "bilanço İLK ne zaman açıklandı"yı yanıtladığı için en erken tarih
kazanıyor. Art arda 3 koşu artık 1 / 0 / 0 yazıyor.

**Temettü tutarları onarıldı.** 16 boş satır, saklanan `kap_disclosure_index`
ile bildirimi yeniden çekip düzeltilmiş matris parser'ıyla çözüldü
(`temettuGovdesiCoz` ayrı fonksiyona çıkarıldı: canlı yol ve geri-doldurma
aynı parser'ı kullanır). **28 satırın 28'i dolu**, tutarlar iç tutarlı:
`net = brüt × (1 − stopaj)` her satırda tam tutuyor (FROTO 3,64→3,094;
TOASO 20→17; KCHOL stopaj=0 → net=brüt). Eski değerler yüzde sütunundan
sızmıştı (NUHCM net=746 → 19,125). Ek sağlama: `brüt < net` imkânsız →
ikisi de atılır.

**K-TK4 üçüncü kez doğrulandı — bu bir dış sınır, kod hatası değil.**
Planlanan bilanço tarihleri için üç bağımsız yol denendi: (1) Haz–Ağu
penceresi 83 bildirim, (2) Oca–Şub penceresi 30 bildirim (SISE, ASELS,
TCELL, TOASO, DOAS dahil — "yıllık takvim Ocak'ta yayınlanır" hipotezi),
(3) KAP'ın kendi public `/tr/Bildirim/{index}` HTML sayfası. Üçünde de
`Planlanan KAP'ta İlan Tarihi` başlığı var, **değer hücreleri boş**. Başlık
taksonomi şablonundan geliyor; değerler bu uçtan hiç yayınlanmıyor.
Alternatif uç denemeleri (`api/notification/{idx}`, `api/disclosure/{idx}`,
`.../detail/`, `.../summary/`) hepsi 404.

### Bilinen sınırlar / sonraki adımlar

- **Şirket beyanlı planlanan bilanço tarihleri yok** (K-TK4, DÖRT kez
  doğrulandı: Haz–Ağu penceresi, Oca–Şub penceresi, KAP'ın public HTML sayfası,
  bildirim ekleri `attachmentCount=0`). Takvim geriye/bugüne bakar, ileriye değil.
  İkincil kaynaklar değerlendirildi → kullanılabilir kaynak YOK; ayrıntı:
  `04-arastirma/bilanco-takvimi-ikincil-kaynak-degerlendirmesi.md`. Özet: tek
  gerçek kaynak Matriks'in ticari anketi, GCM açıkça yeniden dağıtımı yasaklıyor,
  Bigpara robots'ta `anthropic-ai: Disallow: /`, Fintables 403 veriyor. Öneri:
  üçüncü taraf gerektirmeyen **yasal son tarih bandı** (SPK II-14.1).
- **Ekonomik takvimde `beklenti`/`gerçekleşen` yalnız ForexFactory satırlarında** var;
  TR/Fed satırları tarih-saat taşıyor. Barış `FINNHUB_API_KEY` sağlarsa zenginleşir.
- **TCMB PPK tarihleri kural üreteciyle** yazılıyor (sayfa JS-render, RSS/API yok).
  Yılda bir TCMB'nin ilan ettiği takvimle karşılaştırılmalı.
