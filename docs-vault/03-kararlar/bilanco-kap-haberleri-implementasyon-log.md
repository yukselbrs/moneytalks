# Bilanço + Hisse KAP Haberleri — İmplementasyon Logu

**Durum:** DEVAM EDİYOR · Başlangıç: 19 Tem 2026
Resume protokolünün tek kaynağı. Yeni oturum önce en alttaki **ŞU AN NEREDEYİM** paragrafını okur.

## TODO

### FAZ 1 — Keşif
- [x] Hisse sayfası yapısı (scroll-section, tab değil)
- [x] Mevcut KAP modülü + hisse-bazlı haber yolu
- [x] Mevcut AI analiz prompt/akış
- [x] Cron/veri çekme altyapısı

### FAZ 2 — Bilanço veri kaynağı
- [x] ≥3 kaynak karşılaştırması
- [x] Kaynak kararı + gerekçe (K1: TradingView Scanner)
- [x] Format kararı (Midas/Fintables tek-tip, BDDK şablonu yok)
- [x] Kapsam (son 4 çeyrek) + veri erişilebilirliği doğrulandı

### FAZ 3 — KAP haberleri kaynağı
- [x] Kaynak (mevcut lib/kap-kaynak, ticker filtreli — zaten var)
- [x] Kategorizasyon yok kararı
- [ ] Hisse sayfası için endpoint/pagination tasarımı (FAZ 6'da)

### FAZ 4 — Şema
- [x] `bilanco_snapshots` tablosu (ticker PK + scalar kalemler + rasyolar + `ceyrek_seri` JSONB)
- [x] Rasyo: TradingView'dan hazır → kolon (K5)
- [ ] Migration **Barış SQL Editor'de çalıştıracak** (manuel adım — kod dual-read yok, bu şart)

### FAZ 5 — Cron
- [x] `lib/bilanco.ts` — batch TradingView fetch + parse + muhasebe özdeşliği sağlaması (hata logu, sessiz yutma yok)
- [x] `/api/cron/bilanco-snapshot` (606 hisse, 100'lük chunk) + `/api/bilanco/[ticker]` okuma
- [x] `.github/workflows/bilanco-snapshot-cron.yml` (günlük 06:00 UTC)
- [x] KAP haberleri: mevcut kap-bildirimleri cron'u zaten yakalıyor

### FAZ 6 — Hisse sayfası UI
- [x] `HisseBilanco.tsx`: 6 özet kart + genişletilebilir tam tablo + `MiniBar` 4-çeyrek SVG trend + rasyo kartları; veri yoksa kendini gizler
- [x] `HisseKapHaberleri.tsx`: sayfa altı kronolojik liste (`/api/haberler?ticker=` reuse), KAP linki, "daha fazla göster"
- [x] "Son bildirim: [tarih]" etiketi (fiyat 15dk-gecikmesinden ayrı)
- [x] Mobil grid (6→3→2 kolon), kompakt TL (Tn/Mr/Mn)
- [x] Hisse sayfasına bağlandı (risk sonrası, chatbot öncesi); dev doğrulama: KAP render ✓ (EKGYO 2 bildirim), Bilanço graceful-hide ✓ (tablo migration bekliyor)

### FAZ 7 — AI analiz entegrasyonu
- [ ] Prompt'a rasyo-bazlı bilanço özeti (ham kalem değil)
- [ ] KAP haber özeti context (opsiyonel, zaten kısmen eklendi)
- [ ] Teknik+temel ayrımı net + disclaimer güncelle (satır 390 "bilanço dahil değildir" artık yanlış olacak)

### FAZ 8 — Test + kapanış
- [ ] Banka+sanayi+holding hisselerinde doğrulama
- [ ] Özdeşlik sağlaması örneklerde tutuyor mu
- [ ] Mobil test
- [ ] Log "TAMAMLANDI" + açık riskler

---

## FAZ 1 Bulguları (19 Tem 2026)

**Hisse sayfası** (`app/hisse/[ticker]/page.tsx`, 533 satır): **scroll-section** düzeni (tab YOK). Sıra: başlık → metrik kartları (`hisse-kartlar` 3-grid) → `<HisseGrafik>` → AI analiz bölümü (buton + bölümlü çıktı) → risk skoru halkası + bileşenler → `<HisseChatbot>` (en altta, `next/dynamic ssr:false`). Yeni **Bilanço** bölümü risk skorundan sonra, **KAP Haberleri** bölümü chatbot'tan hemen önce (sayfa altı) oturur. Tema: `card-glass`, `#0B1220` zemin, mavi accent (#3B82F6).

**Dikkat — satır 390 disclaimer:** "Bu analiz teknik göstergeler...kapsar. Temel analiz, bilanço ve KAP haberleri dahil değildir." Bu, bu görevde AI'a bilanço+KAP eklenince GÜNCELLENMELİ. (Not: KAP haber enjeksiyonunu `/api/analiz`'e önceki oturumda ekledim, disclaimer kısmen zaten yanlış.)

**KAP haber altyapısı — büyük ölçüde HAZIR:** `lib/kap-kaynak.ts` → `kapListe({sonIndex, ticker})` ticker-filtreli KAP bildirimi döndürür (ücretsiz kap.org.tr). `/api/haberler?ticker=THYAO` zaten ticker-bazlı liste veriyor. `kap_bildirimleri` tablosu özetlenmiş bildirimleri ticker'la saklıyor. Hisse sayfası KAP listesi bunu reuse edecek — ayrı sade liste (kategori/filtre yok).

**AI analiz** (`/api/analiz`): buton tetiklemeli, `claude-sonnet-4-6`, `getHisseVerisi` + makro + (önceki oturumda eklenen) KAP haber enjeksiyonu. Bilanço rasyo özeti buraya eklenecek.

**Cron altyapısı:** GitHub Actions `*/N` → prod endpoint (CRON_SECRET auth). TradingView Scanner zaten `/api/risk`, `/api/senaryo`, `/api/chatbot`'ta kullanılıyor (`scanner.tradingview.com/turkey/scan` POST). Yeni bilanço cron'u aynı pattern.

---

## Kararlar

### K1 — Bilanço kaynağı: TradingView Scanner (birincil, yeterli, lisanssız)
**≥3 kaynak karşılaştırması (19 Tem canlı test):**

| Kaynak | Değerlendirme |
|---|---|
| **TradingView Scanner** ✓ SEÇİLDİ | `scanner.tradingview.com/turkey/scan` POST. Anahtarsız, projede zaten 4 route'ta kullanılıyor (kanıtlı güvenilir). THYAO testi: son çeyrek TAM bilanço (`_fq`) — varlık 2.158T = yükümlülük 1.192T + özkaynak 966T ✓ **muhasebe özdeşliği tuttu**. Rasyolar (F/K 3.48, PD/DD 0.50, ROE %15.4, ROA %7.0, borç/özkaynak 0.84) + gelir tablosu hepsi geliyor. **4 çeyrek geçmiş:** `_fq_h` history array'i (en yeni önce, 32 çeyreğe kadar). |
| İş Yatırım / Fintables / Finnet | Scraping/kayıt gerektirir, kırılgan, TradingView'ın zaten verdiğini tekrar eder. Yedek olarak elde. |
| KAP FR (finansal rapor) XBRL/HTML | Kamuya açık, lisanssız, TAM çeyreklik bilanço. AMA XBRL/taxonomy HTML parse'ı karmaşık + şirkete-göre değişken + kırılgan. MVP için aşırı maliyet. İleride tam-tablo gerekirse revize. |

**`_fq_h` history array'i OLAN kalemler** (canlı doğrulandı, 32 çeyrek): `total_assets`, `total_revenue`, `gross_profit`, `net_income`, `ebitda`, `total_debt`. → Yatırımcının izlediği başlık trendleri (hasılat/kâr/varlık/borç) tam kapsanıyor.
**`_fq_h` OLMAYAN** (yalnız son çeyrek `_fq`): `total_equity`, `total_liabilities`, `total_current/non_current_assets/liabilities`, `book_value_per_share`. → Bunlar **son çeyrek** değeriyle gösterilecek; 4-çeyrek yan-yana yalnız history'si olan kalemlerde.

### K2 — Format: Midas/Fintables tek-tip (prompt kararı)
Tüm hisseler aynı standart kalem seti; banka için ayrı BDDK şablonu YOK. Kalemler: Bilanço (Dönen/Duran Varlık, Toplam Varlık, KV/UV Yükümlülük, Toplam Yükümlülük, Özkaynak) + Gelir Tablosu (Hasılat, Brüt Kâr, Faaliyet Kârı, FAVÖK, Net Kâr) + Rasyolar (F/K, PD/DD, ROE, ROA, Borç/Özkaynak, HBK).

### K3 — Kapsam: son 4 çeyrek (prompt kararı)
`_fq_h` array'inin ilk 4 elemanı. Daha eski çekilmez (array 32 veriyor ama 4 gösterilecek).

### K4 — KAP haberleri: mevcut altyapı reuse, kategorizasyon yok (prompt kararı)
Hisse sayfası altında kronolojik basit liste, orijinal KAP linkine yönlendirme. Kaynak: `kap_bildirimleri` tablosu (ticker filtreli) + gerekirse live `kapListe({ticker})`. Pagination: "daha fazla göster".

### K5 (ÖN) — Rasyo: runtime hesap
Rasyolar TradingView'dan HAZIR geliyor (F/K, PD/DD, ROE, ROA, borç/özkaynak) — ayrıca hesaplamaya gerek yok, snapshot'a kolon olarak yazılır. Türetme gereken olursa (ör. çeyreklik ROE trendi) runtime hesaplanır. FAZ 4'te kesinleşir.

---

## Kronoloji

**19 Tem 2026** — Görev başladı. FAZ 1 keşif (scroll-section sayfa, KAP altyapısı hazır, TradingView zaten entegre), FAZ 2 canlı araştırma (TradingView `_fq` tam snapshot + `_fq_h` 4-çeyrek history, özdeşlik tuttu), K1-K5 kararları. Henüz kod/migration yok.

---

**19 Tem (devam)** — FAZ 4 şema (`bilanco_snapshots` migration eklendi) + FAZ 5 backend: `lib/bilanco.ts` (batch TradingView + özdeşlik sağlaması, 3 hissede test edildi banka dahil ✓), cron + okuma API + günlük workflow. tsc + build temiz.

---

## AÇIK ADIM (Barış)
**Migration'ı SQL Editor'de çalıştır:** `supabase/migrations.sql` "BILANCO v1" bloğu (idempotent). Bu olmadan cron `bilanco_snapshots` yazamaz (500 döner), hisse sayfası bilanço bölümü boş kalır. Migration sonrası cron'u manuel tetikleyip (Actions → Bilanco Snapshot Cron → Run) tabloyu doldurabilirsin.

---

## ŞU AN NEREDEYİM

FAZ 1-5 bitti (araştırma + şema + veri katmanı + cron, hepsi push). Kaynak TradingView Scanner; `lib/bilanco.ts` batch çekiyor, özdeşlik sağlaması var. Migration Barış'ın SQL Editor adımını bekliyor (yukarıda). Sıradaki iş: **FAZ 6 UI** — `app/hisse/[ticker]/page.tsx`'e risk skorundan sonra Bilanço bölümü (özet kartlar: toplam varlık/özkaynak/net kâr/F-K/PD-DD + genişletilebilir tam tablo + `ceyrek_seri`'den 4-çeyrek trend grafik [HisseGrafik reuse] + "Son bildirim" etiketi) ve chatbot'tan önce KAP Haberleri bölümü (`/api/haberler?ticker=` reuse, kronolojik liste, "daha fazla göster"). Mobil sticky/scroll. Sonra FAZ 7: `/api/analiz` prompt'una rasyo-bazlı bilanço özeti + satır 390 disclaimer güncelle ("bilanço dahil değildir" artık yanlış). Veri API'si: `/api/bilanco/[ticker]` (GET, snapshot döner).
