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
- [ ] 2.1 Ekonomik takvim: ≥2-3 kaynak karşılaştırması + ToS (net-yasak testi) + seçim
- [ ] 2.2 Bilanço açıklama tarihleri: KAP vs ikincil derleyici
- [ ] 2.3 Temettü: KAP kâr payı bildirimleri + alanlar + arşiv kararı
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

## Kronoloji

**25 Tem 2026 — FAZ 0 + FAZ 1.** Log kuruldu; halka arz logu + launch checklist okundu. Keşifte mevcut `/takvim` sayfasının 4 sekme etiketiyle zaten var olduğu, ancak 2 sekmenin verisiz olup ekonomik etkinliklere fallthrough yaptığı ve Finnhub anahtarının hiç tanımlı olmadığı tespit edildi (iki gerçek bug). Halka arz modülünün lifecycle + cron + RLS deseni yeni takvimler için şablon olarak seçildi.

---

## ŞU AN NEREDEYİM

**25 Tem 2026 — FAZ 0 ve FAZ 1 bitti; sıradaki FAZ 2 (veri kaynağı araştırması).**

En önemli keşif: `/takvim` sıfırdan kurulmayacak — iskelet (aylık ızgara + gün detayı + 4 sekme etiketi) zaten var; iki sekme (Bilanço, Halka Arz) **yanlış veri gösteriyor** ve ekonomik takvim **Finnhub anahtarı olmadığı için** yalnız hardcoded 20 kayıttan besleniyor. FAZ 2'de sırasıyla: (2.1) ekonomik takvim için gerçek kaynak seçimi + ToS net-yasak testi, (2.2) KAP finansal rapor bildirimlerinden bilanço açıklama takvimi, (2.3) KAP kâr payı bildirimlerinden temettü takvimi. Ardından FAZ 3 şema (`sirket_takvim_etkinlikleri` + ekonomik tablo), FAZ 4 UI (nav birleştirme + 301), FAZ 5 cron.
